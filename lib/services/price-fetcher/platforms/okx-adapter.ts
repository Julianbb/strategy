import { BasePlatformAdapter } from './base-adapter';
import { PlatformPriceData, PlatformFeatures } from './types';

interface OKXTickerResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    volCcy24h: string;
    vol24h: string;
    ts: string;
    sodUtc0: string;
    sodUtc8: string;
  }>;
}

interface OKXMarkPriceResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    markPx: string;
    ts: string;
  }>;
}

interface OKXFundingRateResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    fundingRate: string;
    nextFundingTime: string;
    ts: string;
  }>;
}

interface OKXDeliveryExerciseResponse {
  code: string;
  msg: string;
  data: Array<{
    ts: string;
    details: Array<{
      type: 'delivery' | 'exercised';
      insId: string;
      px: string;
    }>;
  }>;
}

export class OKXAdapter extends BasePlatformAdapter {
  readonly name = 'OKX';
  readonly features: PlatformFeatures = {
    supportsSpotPrices: true,
    supportsOptionPrices: true,
    supportsRealTimeData: true,
    supportsHistoricalData: true,
    supportedCurrencies: ['BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'EOS', 'ADA', 'TRX'],
    rateLimit: {
      requestsPerSecond: 20,
      requestsPerMinute: 1200
    },
    additionalFeatures: ['mark-price', 'funding-rate', 'option-data', 'real-time-data']
  };

  private readonly baseUrl = 'https://www.okx.com/api/v5';

  async fetchSpotPrice(baseCurrency: string, quoteCurrency: string = 'USDT'): Promise<number | null> {
    try {
      const instId = `${baseCurrency}-${quoteCurrency}`;
      const url = `${this.baseUrl}/market/ticker?instId=${instId}`;
      
      const data = await this.makeRequest<OKXTickerResponse>(url);
      
      if (data?.data?.[0]?.last) {
        return parseFloat(data.data[0].last);
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'fetchSpotPrice');
    }
  }

  async fetchOptionPrice(instrumentId: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/public/mark-price?instType=OPTION&instId=${instrumentId}`;
      
      const data = await this.makeRequest<OKXMarkPriceResponse>(url);
      
      if (data?.data?.[0]?.markPx) {
        return parseFloat(data.data[0].markPx);
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'fetchOptionPrice');
    }
  }

  async fetchMultipleOptionPrices(instrumentIds: string[]): Promise<Record<string, number | null>> {
    try {
      // OKX API supports comma-separated instrument IDs
      const instIdParam = instrumentIds.join(',');
      const url = `${this.baseUrl}/public/mark-price?instType=OPTION&instId=${instIdParam}`;
      
      const data = await this.makeRequest<OKXMarkPriceResponse>(url);
      
      const result: Record<string, number | null> = {};
      
      // Initialize all instruments with null
      instrumentIds.forEach(id => {
        result[id] = null;
      });
      
      // Fill in the prices we received
      if (data?.data) {
        data.data.forEach(item => {
          if (item.instId && item.markPx) {
            result[item.instId] = parseFloat(item.markPx);
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching multiple option prices:', error);
      // Return null for all instruments on error
      const result: Record<string, number | null> = {};
      instrumentIds.forEach(id => {
        result[id] = null;
      });
      return result;
    }
  }

  async fetchPrices(baseCurrency: string, optionInstrument?: string): Promise<PlatformPriceData> {
    try {
      const promises: Promise<number | null>[] = [this.fetchSpotPrice(baseCurrency)];
      
      if (optionInstrument) {
        promises.push(this.fetchOptionPrice(optionInstrument));
      }
      
      const results = await Promise.all(promises);
      const spotPrice = results[0];
      const optionPrice = results.length > 1 ? results[1] : null;
      
      return {
        spotPrice,
        optionPrice,
        timestamp: Date.now(),
        metadata: {
          platform: this.name,
          baseCurrency,
          optionInstrument
        }
      };
    } catch (error) {
      console.error('OKX fetchPrices error:', error);
      return {
        spotPrice: null,
        optionPrice: null,
        timestamp: Date.now(),
        metadata: {
          platform: this.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getInstrumentInfo(instrumentId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/public/instruments?instType=OPTION&instId=${instrumentId}`;
      const data = await this.makeRequest(url);
      return data;
    } catch (error) {
      return this.handleError(error, 'getInstrumentInfo');
    }
  }

  async validateInstrument(instrumentId: string): Promise<boolean> {
    try {
      const info = await this.getInstrumentInfo(instrumentId);
      return info?.data && info.data.length > 0;
    } catch {
      return false;
    }
  }

  // OKX-specific methods
  async getFundingRate(instrumentId: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/public/funding-rate?instId=${instrumentId}`;
      const data = await this.makeRequest<OKXFundingRateResponse>(url);
      
      if (data?.data?.[0]?.fundingRate) {
        return parseFloat(data.data[0].fundingRate);
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'getFundingRate');
    }
  }

  async getOptionChain(underlying: string, expiry?: string): Promise<any> {
    try {
      let url = `${this.baseUrl}/public/instruments?instType=OPTION&uly=${underlying}`;
      if (expiry) {
        url += `&expTime=${expiry}`;
      }
      
      const data = await this.makeRequest(url);
      return data;
    } catch (error) {
      return this.handleError(error, 'getOptionChain');
    }
  }

  /**
   * 获取期权历史执行价格
   * @param underlying 标的资产，如 "ETH-USD"
   * @param limit 限制返回数据条数，默认100
   */
  async getDeliveryExerciseHistory(underlying: string, limit: number = 100): Promise<{ instrumentId: string; exercisePrice: number; timestamp: string }[] | null> {
    try {
      const url = `${this.baseUrl}/public/delivery-exercise-history?instType=OPTION&uly=${underlying}&limit=${limit}`;
      
      const data = await this.makeRequest<OKXDeliveryExerciseResponse>(url);
      
      if (data?.data) {
        const result: { instrumentId: string; exercisePrice: number; timestamp: string }[] = [];
        
        data.data.forEach(item => {
          item.details.forEach(detail => {
            if (detail.type === 'exercised' && detail.px && detail.insId) {
              result.push({
                instrumentId: detail.insId,
                exercisePrice: parseFloat(detail.px),
                timestamp: item.ts
              });
            }
          });
        });
        
        return result;
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'getDeliveryExerciseHistory');
    }
  }

  /**
   * 获取特定期权合约的历史执行价格
   * @param instrumentId 期权合约ID，如 "ETH-USD-20250722-3600-P"
   */
  async getOptionExercisePrice(instrumentId: string): Promise<number | null> {
    try {
      // 从合约ID中提取标的资产
      const parts = instrumentId.split('-');
      if (parts.length < 2) {
        console.error('Invalid instrument ID format:', instrumentId);
        return null;
      }
      
      const underlying = `${parts[0]}-${parts[1]}`;
      const history = await this.getDeliveryExerciseHistory(underlying);
      
      if (history) {
        // 查找匹配的合约执行价格
        const exerciseData = history.find(item => item.instrumentId === instrumentId);
        return exerciseData ? exerciseData.exercisePrice : null;
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'getOptionExercisePrice');
    }
  }
}