import { BasePlatformAdapter } from './base-adapter';
import { PlatformPriceData, PlatformFeatures } from './types';

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface BinanceKlineResponse {
  [index: number]: string;
}

export class BinanceAdapter extends BasePlatformAdapter {
  readonly name = 'Binance';
  readonly features: PlatformFeatures = {
    supportsSpotPrices: true,
    supportsOptionPrices: false, // Binance doesn't have traditional options like OKX
    supportsRealTimeData: true,
    supportsHistoricalData: true,
    supportedCurrencies: ['BTC', 'ETH', 'BNB', 'ADA', 'XRP', 'SOL', 'DOT', 'LTC'],
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerMinute: 1200
    },
    additionalFeatures: ['futures', 'margin-trading', 'staking', 'savings']
  };

  private readonly baseUrl = 'https://api.binance.com/api/v3';

  async fetchSpotPrice(baseCurrency: string, quoteCurrency: string = 'USDT'): Promise<number | null> {
    try {
      const symbol = `${baseCurrency}${quoteCurrency}`;
      const url = `${this.baseUrl}/ticker/price?symbol=${symbol}`;
      
      const data = await this.makeRequest<BinanceTickerResponse>(url);
      
      if (data?.price) {
        return parseFloat(data.price);
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'fetchSpotPrice');
    }
  }

  async fetchOptionPrice(instrumentId: string): Promise<number | null> {
    // Binance doesn't support traditional options trading
    throw new Error('Binance does not support options trading');
  }

  async fetchPrices(baseCurrency: string, optionInstrument?: string): Promise<PlatformPriceData> {
    try {
      if (optionInstrument) {
        console.warn('Binance does not support options trading, ignoring option instrument');
      }

      const spotPrice = await this.fetchSpotPrice(baseCurrency);
      
      return {
        spotPrice,
        optionPrice: null,
        timestamp: Date.now(),
        metadata: {
          platform: this.name,
          baseCurrency,
          note: optionInstrument ? 'Options not supported by Binance' : undefined
        }
      };
    } catch (error) {
      console.error('Binance fetchPrices error:', error);
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

  async getInstrumentInfo(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/exchangeInfo?symbol=${symbol}`;
      const data = await this.makeRequest(url);
      return data;
    } catch (error) {
      return this.handleError(error, 'getInstrumentInfo');
    }
  }

  async validateInstrument(symbol: string): Promise<boolean> {
    try {
      const info = await this.getInstrumentInfo(symbol);
      return info?.symbols && info.symbols.length > 0;
    } catch {
      return false;
    }
  }

  // Binance-specific methods
  async getFuturesPrice(symbol: string): Promise<number | null> {
    try {
      const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`;
      const data = await this.makeRequest<BinanceTickerResponse>(url);
      
      if (data?.price) {
        return parseFloat(data.price);
      }
      
      return null;
    } catch (error) {
      return this.handleError(error, 'getFuturesPrice');
    }
  }

  async get24hrStats(symbol: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/ticker/24hr?symbol=${symbol}`;
      const data = await this.makeRequest(url);
      return data;
    } catch (error) {
      return this.handleError(error, 'get24hrStats');
    }
  }

  async getKlines(symbol: string, interval: string = '1h', limit: number = 100): Promise<any> {
    try {
      const url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const data = await this.makeRequest<BinanceKlineResponse[]>(url);
      return data;
    } catch (error) {
      return this.handleError(error, 'getKlines');
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<any> {
    try {
      const url = `${this.baseUrl}/depth?symbol=${symbol}&limit=${limit}`;
      const data = await this.makeRequest(url);
      return data;
    } catch (error) {
      return this.handleError(error, 'getOrderBook');
    }
  }
}