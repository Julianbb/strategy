import { PlatformType } from '@/lib/3party';

export interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  optionInstrument: string | null;
  error: string | null;
  platform?: string;
  timestamp?: number;
}

export interface SinglePriceData {
  price: number | null;
  error: string | null;
  platform?: string;
  timestamp?: number;
}

export interface MultipleOptionsPriceData {
  prices: Record<string, number | null>; // instrumentId -> price
  error: string | null;
  platform?: string;
  timestamp?: number;
}

export type HistoricalPeriod = '7d' | '30d' | '90d';
export type HistoricalInterval = '10m' | '30m' | '1H' | '2H' | '6H' | '1d';

export interface HistoricalDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalPriceData {
  symbol: string; // e.g., "BTCUSDT", "ETHUSDT"
  period: HistoricalPeriod;
  interval: HistoricalInterval;
  data: HistoricalDataPoint[];
  error: string | null;
  platform?: string;
  timestamp?: number;
}

export interface IPriceService {
  fetchSpotPrice(baseCurrency: string, quoteCurrency?: string): Promise<SinglePriceData>;
  fetchPriceData(baseCurrency: string, optionInstrument?: string | null, preferredPlatform?: PlatformType): Promise<PriceData>;
  fetchMultipleOptionsPrices(instrumentIds: string[], preferredPlatform?: PlatformType): Promise<MultipleOptionsPriceData>;
  fetchSpotHistoricalData(baseCurrency: string, quoteCurrency: string, period: HistoricalPeriod, interval: HistoricalInterval, preferredPlatform?: PlatformType): Promise<HistoricalPriceData>;
  getAvailablePlatforms?(): Promise<string[]>;
  getHealthyPlatforms?(): Promise<string[]>;
  setPrimaryPlatform?(platformType: PlatformType): Promise<void>;
}

