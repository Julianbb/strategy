export interface PlatformPriceData {
  spotPrice: number | null;
  optionPrice?: number | null;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface PlatformFeatures {
  supportsSpotPrices: boolean;
  supportsOptionPrices: boolean;
  supportsRealTimeData: boolean;
  supportsHistoricalData: boolean;
  supportedCurrencies: string[];
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  additionalFeatures?: string[];
}

export interface IPlatformAdapter {
  readonly name: string;
  readonly features: PlatformFeatures;
  
  fetchSpotPrice(baseCurrency: string, quoteCurrency?: string): Promise<number | null>;
  fetchOptionPrice?(instrumentId: string): Promise<number | null>;
  fetchMultipleOptionPrices?(instrumentIds: string[]): Promise<Record<string, number | null>>;
  fetchPrices(baseCurrency: string, optionInstrument?: string): Promise<PlatformPriceData>;
  fetchHistoricalKlines?(symbol: string, interval: string, startTime: number, endTime: number): Promise<any>;
  
  // Additional platform-specific methods
  getInstrumentInfo?(instrumentId: string): Promise<any>;
  validateInstrument?(instrumentId: string): Promise<boolean>;
  
  // Health check
  isHealthy(): Promise<boolean>;
}

export enum PlatformType {
  OKX = 'okx',
  BINANCE = 'binance',
  DERIBIT = 'deribit',
  BYBIT = 'bybit',
  HYPERLIQUID = 'hyperliquid'
}

export interface PlatformConfig {
  type: PlatformType;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}