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

export interface IPriceService {
  getOptionInstrument(strategyChatId: string): Promise<string | null>;
  fetchSpotPrice(baseCurrency: string, quoteCurrency?: string): Promise<SinglePriceData>;
  fetchPriceData(baseCurrency: string, optionInstrument?: string | null, preferredPlatform?: PlatformType): Promise<PriceData>;
  fetchMultipleOptionsPrices(instrumentIds: string[], preferredPlatform?: PlatformType): Promise<MultipleOptionsPriceData>;
  getAvailablePlatforms?(): Promise<string[]>;
  getHealthyPlatforms?(): Promise<string[]>;
  setPrimaryPlatform?(platformType: PlatformType): Promise<void>;
}

