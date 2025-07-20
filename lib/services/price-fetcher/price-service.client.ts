import {convertInstrumentFlexible} from "@/lib/utils"

export interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  optionInstrument: string | null;
  error: string | null;
}

export class PriceServiceClient {
  async getOptionInstrument(strategyChatId: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/strategy-chat/${strategyChatId}/option-instrument`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.instrument) {
        return convertInstrumentFlexible(data.instrument);
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching option instrument:', err);
      throw err;
    }
  }

  async fetchPriceData(baseCurrency: string, optionInstrument?: string | null): Promise<PriceData> {
    try {
      const params = new URLSearchParams({
        baseCurrency,
        ...(optionInstrument && { optionInstrument })
      });
      
      const response = await fetch(`/api/prices?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        currencyPrice: data.currencyPrice,
        optionsPrice: data.optionsPrice,
        optionInstrument: data.optionInstrument,
        error: data.error
      };
    } catch (err) {
      console.error('Fetch error:', err);
      return {
        currencyPrice: null,
        optionsPrice: null,
        optionInstrument: optionInstrument || null,
        error: err instanceof Error ? err.message : 'Failed to fetch prices'
      };
    }
  }
}

export const priceServiceClient = new PriceServiceClient();