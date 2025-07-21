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
      const data = await this.makeRequest(url);
      
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
}