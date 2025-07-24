
import {getTradesByIds } from "@/lib/db/queries"
import { platformManager, initializePlatforms, PlatformType } from "@/lib/3party"
import { OKXDeliveryItem, OKXDeliveryDetail } from "@/lib/3party/adapter/okx-adapter"
import {SinglePriceData, MultipleOptionsPriceData, PriceData} from "./price-service"
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



  async fetchMultipleOptionExercisePricesFromThirdPartyPlatform(
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



  async fetchMultipleOptionExercisePrices(
    expiredTrades:any,
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

      // Check if platform supports the method (currently only OKX)
      if (platform.name === 'OKX') {
        const prices: Record<string, number | null> = {};
        
        // 第一步：先从数据库批量获取价格
        const dbPrices: Record<string, number | null> = {};
        
        // 通过expiredTrades的id查询数据库中的交割价格
        if (expiredTrades && expiredTrades.length > 0) {
          const tradeIds = expiredTrades.map((trade: any) => trade.id);
          const tradesFromDB = await getTradesByIds({ ids: tradeIds });
          
          // 将数据库中的交割价格映射到对应的合约ID
          expiredTrades.forEach((expiredTrade: any) => {
            const dbTrade = tradesFromDB.find(t => t.id === expiredTrade.id);
            if (dbTrade && dbTrade.deliveryPriceInCurrency !== null) {
              dbPrices[expiredTrade.expiredInstrumentId] = parseFloat(dbTrade.deliveryPriceInCurrency);
            }
          });
        }
        
        // 初始化所有价格为数据库中的值
        instrumentIds.forEach(id => {
          prices[id] = dbPrices[id] || null;
        });
        
        // 第二步：找出数据库中没有的合约ID
        const missingInstrumentIds = instrumentIds.filter(id => prices[id] === null);
        
        // 第三步：如果有缺失的，批量从第三方平台获取
        if (missingInstrumentIds.length > 0) {
          const thirdPartyResult = await this.fetchMultipleOptionExercisePricesFromThirdPartyPlatform(
            missingInstrumentIds, 
            preferredPlatform
          );
          
          // 合并第三方获取的价格
          if (!thirdPartyResult.error) {
            Object.assign(prices, thirdPartyResult.prices);
          }
        }
        
        return {
          prices,
          error: null,
          platform: platform.name,
          timestamp: Date.now()
        };
      }
      
      console.warn(`Platform ${platform.name} does not support exercise price history`);
      return {
        prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
        error: `Platform ${platform.name} does not support exercise price history`,
        platform: platform.name,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('Error fetching multiple option exercise prices:', err);
      return {
        prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
        error: err instanceof Error ? err.message : 'Failed to fetch exercise prices',
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
}

export const priceServiceServer = new PriceServiceServer();