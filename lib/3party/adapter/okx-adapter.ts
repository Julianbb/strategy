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

export interface OKXDeliveryExerciseResponse {
  code: string;
  msg: string;
  data: Array<{
    ts: string;
    details: Array<{
      type: 'delivery' | 'exercised' | 'expired_otm';
      insId: string;
      px: string;
    }>;
  }>;
}

export type OKXDeliveryItem = OKXDeliveryExerciseResponse['data'][0];
export type OKXDeliveryDetail = OKXDeliveryItem['details'][0];

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
   * @param limit 限制返回数据条数，默认10
   */
  async getDeliveryExerciseHistory(underlying: string, limit: number = 10): Promise<OKXDeliveryExerciseResponse | null> {
    try {
      const url = `${this.baseUrl}/public/delivery-exercise-history?instType=OPTION&uly=${underlying}&limit=${limit}`;
      
      const data = await this.makeRequest<OKXDeliveryExerciseResponse>(url);
      
      return data;
    } catch (error) {
      return this.handleError(error, 'getDeliveryExerciseHistory');
    }
  }

  /**
   * 构建OKX期权合约ID
   */
  buildOptionInstrumentId(baseCurrency: string, type: 'call' | 'put', strike: number, expiry: string): string {
    const underlying = `${baseCurrency}-USD`;
    const expiryFormatted = this.formatExpiryForOKX(expiry);
    const optionType = type === 'call' ? 'C' : 'P';
    return `${underlying}-${expiryFormatted}-${strike}-${optionType}`;
  }

  /**
   * 将日期格式转换为OKX期权合约格式 (YYMMDD)
   */
  private formatExpiryForOKX(expiry: string): string {
    const date = new Date(expiry);
    const year = String(date.getFullYear()).slice(-2); // 取年份的后两位
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

}