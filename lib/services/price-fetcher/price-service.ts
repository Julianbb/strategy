import { PlatformType } from './platforms';

export interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  optionInstrument: string | null;
  error: string | null;
  platform?: string;
  timestamp?: number;
}

export interface IPriceService {
  getOptionInstrument(strategyChatId: string): Promise<string | null>;
  fetchPriceData(baseCurrency: string, optionInstrument?: string | null, preferredPlatform?: PlatformType): Promise<PriceData>;
  getAvailablePlatforms?(): Promise<string[]>;
  getHealthyPlatforms?(): Promise<string[]>;
  setPrimaryPlatform?(platformType: PlatformType): Promise<void>;
}

// Re-export client service for browser environments
export { priceServiceClient as priceService } from './price-service.client';