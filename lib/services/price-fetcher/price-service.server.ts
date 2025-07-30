
import { platformManager, initializePlatforms, PlatformType } from "@/lib/3party"
import { OKXDeliveryItem, OKXDeliveryDetail } from "@/lib/3party/adapter/okx-adapter"
import {SinglePriceData, MultipleOptionsPriceData, PriceData, HistoricalPriceData, HistoricalPeriod, HistoricalInterval, HistoricalDataPoint} from "./price-service"
/**
 * 计算期权交割时的币本位价格
 * @param instrumentId 期权合约ID，如 "ETH-USD-250722-3600-P" 或 "ETH-USD-250722-2800-C"
 * @param deliveryPrice 交割时的价格 (USD)
 * @returns 币本位的交割价格
 */
function calculateCoinBasedDeliveryPrice(instrumentId: string, deliveryPrice: number): number {
  const parts = instrumentId.split('-');
  if (parts.length < 5) {
    throw new Error(`Invalid instrument ID format: ${instrumentId}`);
  }
  
  const strikePrice = parseFloat(parts[3]); // 执行价
  const optionType = parts[4]; // 'C' for Call, 'P' for Put
  
  if (optionType === 'C') {
    // Call期权: (交割价格 - 执行价格) / 交割价格
    return (deliveryPrice - strikePrice) / deliveryPrice;
  } else if (optionType === 'P') {
    // Put期权: (执行价格 - 交割价格) / 交割价格 
    return (strikePrice - deliveryPrice) / deliveryPrice;
    
  } else {
    throw new Error(`Unknown option type: ${optionType}`);
  }
}


export class PriceServiceServer {
  constructor() {
    // Initialize platforms on service creation
    initializePlatforms();
  }



  
  async fetchSpotPrice(baseCurrency: string, quoteCurrency: string = 'USDT'): Promise<SinglePriceData> {
    try {
      // Get platform with fallback mechanism
      const platform = await platformManager.getPlatformWithFallback(PlatformType.OKX);
      
      if (!platform) {
        return {
          price: null,
          error: 'No healthy platforms available',
          timestamp: Date.now()
        };
      }

      const price = await platform.fetchSpotPrice(baseCurrency, quoteCurrency);

      return {
        price,
        error: price === null ? 'Failed to fetch spot price' : null,
        platform: platform.name,
        timestamp: Date.now()
      };

    } catch (err) {
      console.error('Fetch spot price error:', err);
      return {
        price: null,
        error: err instanceof Error ? err.message : 'Failed to fetch spot price',
        timestamp: Date.now()
      };
    }
  }


  async fetchPriceData(
    preferredPlatform: PlatformType,
    baseCurrency: string, 
    optionInstrument?: string | null
  ): Promise<PriceData> {
    try {
      // Get platform with fallback mechanism
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      if (!platform) {
        return {
          currencyPrice: null,
          optionsPrice: null,
          optionInstrument: optionInstrument || null,
          error: 'No healthy platforms available',
          timestamp: Date.now()
        };
      }

      // Check if platform supports options when needed
      if (optionInstrument && !platform.features.supportsOptionPrices) {
        console.warn(`Platform ${platform.name} does not support options, fetching spot price only`);
        optionInstrument = null;
      }

      const platformData = await platform.fetchPrices(baseCurrency, optionInstrument || undefined);
      
      return {
        currencyPrice: platformData.spotPrice,
        optionsPrice: platformData.optionPrice || null,
        optionInstrument: optionInstrument || null,
        error: null,
        platform: platform.name,
        timestamp: platformData.timestamp
      };
      
    } catch (err) {
      console.error('Fetch error:', err);
      return {
        currencyPrice: null,
        optionsPrice: null,
        optionInstrument: optionInstrument || null,
        error: err instanceof Error ? err.message : 'Failed to fetch prices',
        timestamp: Date.now()
      };
    }
  }

  async getAvailablePlatforms(): Promise<string[]> {
    return platformManager.getAvailablePlatforms().map(p => p.toString());
  }

  async getHealthyPlatforms(): Promise<string[]> {
    const healthy = await platformManager.getHealthyPlatforms();
    return healthy.map(p => p.toString());
  }

  async setPrimaryPlatform(platformType: PlatformType): Promise<void> {
    platformManager.setPrimaryPlatform(platformType);
  }



  async fetchMultipleOptionExercisePrices(
    instrumentIds: string[],
    preferredPlatform: PlatformType = PlatformType.OKX
  ): Promise<MultipleOptionsPriceData> {
    try {
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      if (!platform) {
        return {
          prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
          error: 'No healthy platforms available for exercise price fetch',
          timestamp: Date.now()
        };
      }

      // 目前只支持OKX平台的历史执行价格获取
      if (platform.name === 'OKX' && 'getDeliveryExerciseHistory' in platform) {
        const okxPlatform = platform as any;
        const result: Record<string, number | null> = {};
        
        // 初始化所有合约为null
        instrumentIds.forEach(id => {
          result[id] = null;
        });

        // 按标的资产分组，因为API需要按标的资产查询
        const underlyingGroups: Record<string, string[]> = {};
        
        instrumentIds.forEach(instrumentId => {
          const parts = instrumentId.split('-');
          if (parts.length >= 2) {
            const underlying = `${parts[0]}-${parts[1]}`;
            if (!underlyingGroups[underlying]) {
              underlyingGroups[underlying] = [];
            }
            underlyingGroups[underlying].push(instrumentId);
          }
        });

        // 并行查询所有标的资产的历史数据
        const promises = Object.keys(underlyingGroups).map(async (underlying) => {
          try {
            const response = await okxPlatform.getDeliveryExerciseHistory(underlying, 100);
            return { underlying, response };
          } catch (error) {
            console.error(`Failed to fetch history for ${underlying}:`, error);
            return { underlying, response: null };
          }
        });

        const results = await Promise.all(promises);

        // 处理查询结果
        results.forEach(({ underlying, response }) => {
          if (response?.data) {
            const targetInstruments = underlyingGroups[underlying];
            
            // 遍历所有时间点和详情查找匹配的合约
            response.data.forEach((item: OKXDeliveryItem) => {
              item.details.forEach((detail: OKXDeliveryDetail) => {
                if (detail.insId && targetInstruments.includes(detail.insId)) {
                  // 检查是否已经处理过这个合约，避免重复处理
                  if (result[detail.insId] !== null) {
                    return; // 已经处理过，跳过
                  }
                  
                  if (detail.type === 'expired_otm') {
                    result[detail.insId] = 0;
                  } else if (detail.type === 'exercised' && detail.px) {
                    // 使用工具函数计算币本位的交割价格
                    const deliveryPrice = parseFloat(detail.px);
                    const coinBasedPrice = calculateCoinBasedDeliveryPrice(detail.insId, deliveryPrice);
                    result[detail.insId] = coinBasedPrice;
                  }
                }
              });
            });
          }
        });

        return {
          prices: result,
          error: null,
          platform: platform.name,
          timestamp: Date.now()
        };
      }
      
      console.warn(`Platform ${platform.name} does not support delivery exercise history`);
      return {
        prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
        error: `Platform ${platform.name} does not support delivery exercise history`,
        platform: platform.name,
        timestamp: Date.now()
      };
      
    } catch (err) {
      console.error('Error fetching multiple option exercise prices from third party:', err);
      return {
        prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
        error: err instanceof Error ? err.message : 'Failed to fetch exercise prices from third party',
        timestamp: Date.now()
      };
    }
  }



  async fetchMultipleOptionsPrices(
    instrumentIds: string[], 
    preferredPlatform: PlatformType = PlatformType.OKX
  ): Promise<MultipleOptionsPriceData> {
    try {
      // Get platform with fallback mechanism
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      if (!platform) {
        return {
          prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
          error: 'No healthy platforms available',
          timestamp: Date.now()
        };
      }

      // Check if platform supports options
      if (!platform.features.supportsOptionPrices) {
        return {
          prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
          error: `Platform ${platform.name} does not support options`,
          timestamp: Date.now()
        };
      }

    // Fallback to individual requests
    const prices: Record<string, number | null> = {};
    const promises = instrumentIds.map(async (id) => {
      const price = platform.fetchOptionPrice ? await platform.fetchOptionPrice(id) : null;
      prices[id] = price;
    });
    
    await Promise.all(promises);
    
    return {
      prices,
      error: null,
      platform: platform.name,
      timestamp: Date.now()
    };
    

      
    } catch (err) {
      console.error('Fetch multiple options error:', err);
      return {
        prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
        error: err instanceof Error ? err.message : 'Failed to fetch option prices',
        timestamp: Date.now()
      };
    }
  }

  /**
   * 获取现货的历史K线数据
   * @param baseCurrency 基础货币，如 "BTC", "ETH"
   * @param quoteCurrency 计价货币，如 "USDT", "USD"
   * @param period 时间周期：7d, 30d, 90d
   * @param interval 时间间隔：10m, 30m, 1H, 2H, 6H, 1d
   * @param preferredPlatform 优先平台
   * @returns 历史价格数据
   */
  async fetchSpotHistoricalData(
    baseCurrency: string,
    quoteCurrency: string = 'USDT',
    period: HistoricalPeriod,
    interval: HistoricalInterval,
    preferredPlatform: PlatformType = PlatformType.OKX
  ): Promise<HistoricalPriceData> {
    return this.fetchHistoricalData('spot', baseCurrency, quoteCurrency, period, interval, preferredPlatform);
  }

  /**
   * 获取期权的历史K线数据
   * @param instrumentId 期权合约ID，如 "ETH-USD-250801-3900-C"
   * @param period 时间周期：7d, 30d, 90d
   * @param interval 时间间隔：10m, 30m, 1H, 2H, 6H, 1d
   * @param preferredPlatform 优先平台
   * @returns 历史价格数据
   */
  async fetchOptionHistoricalData(
    instrumentId: string,
    period: HistoricalPeriod,
    interval: HistoricalInterval,
    preferredPlatform: PlatformType = PlatformType.OKX
  ): Promise<HistoricalPriceData> {
    return this.fetchHistoricalData('option', instrumentId, '', period, interval, preferredPlatform, instrumentId);
  }

  /**
   * 通用的历史K线数据获取方法
   * @param type 类型：spot 或 option
   * @param baseCurrency 基础货币或期权合约ID
   * @param quoteCurrency 计价货币（期权时为空）
   * @param period 时间周期
   * @param interval 时间间隔
   * @param preferredPlatform 优先平台
   * @param symbol 可选的自定义symbol
   * @returns 历史价格数据
   */
  private async fetchHistoricalData(
    type: 'spot' | 'option',
    baseCurrency: string,
    quoteCurrency: string,
    period: HistoricalPeriod,
    interval: HistoricalInterval,
    preferredPlatform: PlatformType = PlatformType.OKX,
    symbol?: string
  ): Promise<HistoricalPriceData> {
    try {
      // Get platform with fallback mechanism
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      // Construct symbol based on type
      let displaySymbol: string;
      let apiSymbol: string;
      
      if (symbol) {
        // Use provided symbol directly
        displaySymbol = symbol;
        apiSymbol = symbol;
      } else if (type === 'spot') {
        // For spot: display as BTCUSDT, API as BTC-USDT
        displaySymbol = `${baseCurrency}${quoteCurrency}`;
        apiSymbol = `${baseCurrency}-${quoteCurrency}`;
      } else {
        // For option: baseCurrency is actually the full instrumentId
        displaySymbol = baseCurrency;
        apiSymbol = baseCurrency;
      }
      
      if (!platform) {
        return {
          symbol: displaySymbol,
          period,
          interval,
          data: [],
          error: 'No healthy platforms available',
          timestamp: Date.now()
        };
      }

      // Calculate the time range based on period
      const now = Date.now();
      const periodInMs = this.getPeriodInMilliseconds(period);
      const startTime = now - periodInMs;

      // Check if platform supports historical data
      if (!platform.features.supportsHistoricalData) {
        return {
          symbol: displaySymbol,
          period,
          interval,
          data: [],
          error: `Platform ${platform.name} does not support ${type} historical data`,
          platform: platform.name,
          timestamp: Date.now()
        };
      }

      // Convert interval to platform-specific format
      const platformInterval = this.convertIntervalToPlatformFormat(interval, platform.name);
      
      // Fetch historical data from platform
      let historicalData: HistoricalDataPoint[] = [];
      
      if (platform.name === 'OKX' && 'fetchHistoricalKlines' in platform) {
        const okxPlatform = platform as any;
        
        try {
          let response;
          if (type === 'spot') {
            response = await okxPlatform.fetchSpotHistoricalKlines(apiSymbol, platformInterval, startTime, now);
          } else {
            response = await okxPlatform.fetchOptionHistoricalKlines(apiSymbol, platformInterval, startTime, now);
          }
          const rawData = this.formatOKXHistoricalData(response);
          
          // Filter data to only include points within our desired time range
          historicalData = rawData.filter(point => 
            point.timestamp >= startTime && point.timestamp <= now
          );
          
        } catch (error) {
          console.error(`Failed to fetch ${type} historical data from OKX:`, error);
          return {
            symbol: displaySymbol,
            period,
            interval,
            data: [],
            error: `Failed to fetch ${type} historical data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            platform: platform.name,
            timestamp: Date.now()
          };
        }
      } else {
        // For other platforms without specific implementation
        return {
          symbol: displaySymbol,
          period,
          interval,
          data: [],
          error: `${type} historical data not supported for platform ${platform.name}`,
          platform: platform.name,
          timestamp: Date.now()
        };
      }

      const result = {
        symbol: displaySymbol,
        period,
        interval,
        data: historicalData,
        error: null,
        platform: platform.name,
        timestamp: Date.now()
      };
      
      
      return result;

    } catch (err) {
      console.error(`Fetch ${type} historical data error:`, err);
      
      // Construct displaySymbol for error case
      let displaySymbol: string;
      if (symbol) {
        displaySymbol = symbol;
      } else if (type === 'spot') {
        displaySymbol = `${baseCurrency}${quoteCurrency}`;
      } else {
        displaySymbol = baseCurrency; // For option, baseCurrency is the full instrumentId
      }
      
      return {
        symbol: displaySymbol,
        period,
        interval,
        data: [],
        error: err instanceof Error ? err.message : `Failed to fetch ${type} historical data`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 将时间周期转换为毫秒
   */
  private getPeriodInMilliseconds(period: HistoricalPeriod): number {
    switch (period) {
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 将通用间隔格式转换为平台特定格式
   */
  private convertIntervalToPlatformFormat(interval: HistoricalInterval, platformName: string): string {
    const intervalMap: Record<string, Record<HistoricalInterval, string>> = {
      'OKX': {
        '10m': '10m',
        '30m': '30m',
        '1H': '1H',
        '2H': '2H',
        '6H': '6H',
        '1d': '1D'
      },
      'Binance': {
        '10m': '10m',
        '30m': '30m',
        '1H': '1h',
        '2H': '2h',
        '6H': '6h',
        '1d': '1d'
      }
    };

    return intervalMap[platformName]?.[interval] || interval;
  }

  /**
   * 格式化OKX返回的历史数据
   */
  private formatOKXHistoricalData(response: any): HistoricalDataPoint[] {
    if (!response?.data || !Array.isArray(response.data)) {
      return [];
    }

    const formatted = response.data.map((item: any[]) => ({
      timestamp: parseInt(item[0]), // OKX returns timestamp as string
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    })).sort((a: HistoricalDataPoint, b: HistoricalDataPoint) => a.timestamp - b.timestamp); // Sort by timestamp ascending
    
    return formatted;
  }


}

export const priceServiceServer = new PriceServiceServer();