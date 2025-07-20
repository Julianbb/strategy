export interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  optionInstrument: string | null;
  error: string | null;
}

export interface IPriceService {
  getOptionInstrument(strategyChatId: string): Promise<string | null>;
  fetchPriceData(baseCurrency: string, optionInstrument?: string | null): Promise<PriceData>;
}

// Re-export client service for browser environments
export { priceServiceClient as priceService } from './price-service.client';