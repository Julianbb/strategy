import { IPlatformAdapter, PlatformPriceData, PlatformFeatures } from './types';

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract readonly name: string;
  abstract readonly features: PlatformFeatures;

  protected timeout: number;
  protected retries: number;

  constructor(timeout = 5000, retries = 3) {
    this.timeout = timeout;
    this.retries = retries;
  }

  abstract fetchSpotPrice(baseCurrency: string, quoteCurrency?: string): Promise<number | null>;
  abstract fetchPrices(baseCurrency: string, optionInstrument?: string): Promise<PlatformPriceData>;

  async fetchOptionPrice?(instrumentId: string): Promise<number | null> {
    throw new Error(`Option price fetching not supported by ${this.name}`);
  }

  async getInstrumentInfo?(instrumentId: string): Promise<any> {
    throw new Error(`Instrument info not supported by ${this.name}`);
  }

  async validateInstrument?(instrumentId: string): Promise<boolean> {
    return true; // Default implementation
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check by fetching a common trading pair
      const price = await this.fetchSpotPrice('BTC', 'USDT');
      return price !== null && price > 0;
    } catch {
      return false;
    }
  }

  protected async makeRequest<T>(
    url: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.retries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest<T>(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  protected handleError(error: any, context: string): null {
    console.error(`${this.name} ${context} error:`, error);
    return null;
  }
}