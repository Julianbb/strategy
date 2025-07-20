import {convertInstrumentFlexible} from "@/lib/utils"
import { fetchPrices, fetchSpotPrice } from "@/lib/3party/okxapi"
import { getLatestOptionInstrument } from "@/lib/db/queries"

export interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  optionInstrument: string | null;
  error: string | null;
}

export class PriceServiceServer {
  async getOptionInstrument(strategyChatId: string): Promise<string | null> {
    try {
      const instrument = await getLatestOptionInstrument({ strategyChatId });
      
      if (instrument) {
        return convertInstrumentFlexible(instrument);
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching option instrument:', err);
      throw err;
    }
  }

  async fetchPriceData(baseCurrency: string, optionInstrument?: string | null): Promise<PriceData> {
    try {
      if (optionInstrument) {
        const { spotPrice, optionPrice } = await fetchPrices(baseCurrency, optionInstrument);
        
        return {
          currencyPrice: spotPrice,
          optionsPrice: optionPrice,
          optionInstrument,
          error: null
        };
      } else {
        const spotPrice = await fetchSpotPrice(baseCurrency);
        
        return {
          currencyPrice: spotPrice,
          optionsPrice: null,
          optionInstrument: null,
          error: null
        };
      }
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

export const priceServiceServer = new PriceServiceServer();