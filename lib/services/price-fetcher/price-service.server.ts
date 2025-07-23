import {convertInstrumentFlexible} from "@/lib/utils"
import { getLatestOptionInstrument } from "@/lib/db/queries"
import { platformManager, initializePlatforms, PlatformType } from "./platforms"

export interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  optionInstrument: string | null;
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

export class PriceServiceServer {
  constructor() {
    // Initialize platforms on service creation
    initializePlatforms();
  }

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



  



  async fetchPriceData(
    preferredPlatform: PlatformType,
    baseCurrency: string, 
    optionInstrument?: string | null
  ): Promise<PriceData> {
    try {
      // Get platform with fallback mechanism
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      if (!platform) {
        return {
          currencyPrice: null,
          optionsPrice: null,
          optionInstrument: optionInstrument || null,
          error: 'No healthy platforms available',
          timestamp: Date.now()
        };
      }

      // Check if platform supports options when needed
      if (optionInstrument && !platform.features.supportsOptionPrices) {
        console.warn(`Platform ${platform.name} does not support options, fetching spot price only`);
        optionInstrument = null;
      }

      const platformData = await platform.fetchPrices(baseCurrency, optionInstrument || undefined);
      
      return {
        currencyPrice: platformData.spotPrice,
        optionsPrice: platformData.optionPrice || null,
        optionInstrument: optionInstrument || null,
        error: null,
        platform: platform.name,
        timestamp: platformData.timestamp
      };
      
    } catch (err) {
      console.error('Fetch error:', err);
      return {
        currencyPrice: null,
        optionsPrice: null,
        optionInstrument: optionInstrument || null,
        error: err instanceof Error ? err.message : 'Failed to fetch prices',
        timestamp: Date.now()
      };
    }
  }

  async getAvailablePlatforms(): Promise<string[]> {
    return platformManager.getAvailablePlatforms().map(p => p.toString());
  }

  async getHealthyPlatforms(): Promise<string[]> {
    const healthy = await platformManager.getHealthyPlatforms();
    return healthy.map(p => p.toString());
  }

  async setPrimaryPlatform(platformType: PlatformType): Promise<void> {
    platformManager.setPrimaryPlatform(platformType);
  }

  async fetchOptionExercisePrice(
    instrumentId: string,
    preferredPlatform: PlatformType = PlatformType.OKX
  ): Promise<number | null> {
    try {
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      if (!platform) {
        console.error('No healthy platforms available for exercise price fetch');
        return null;
      }

      // Check if platform supports the method (currently only OKX)
      if (platform.name === 'OKX' && 'getOptionExercisePrice' in platform) {
        const okxPlatform = platform as any;
        return await okxPlatform.getOptionExercisePrice(instrumentId);
      }
      
      console.warn(`Platform ${platform.name} does not support exercise price history`);
      return null;
    } catch (err) {
      console.error('Error fetching option exercise price:', err);
      return null;
    }
  }

  async fetchMultipleOptionsPrices(
    instrumentIds: string[], 
    preferredPlatform: PlatformType = PlatformType.OKX
  ): Promise<MultipleOptionsPriceData> {
    try {
      // Get platform with fallback mechanism
      const platform = await platformManager.getPlatformWithFallback(preferredPlatform);
      
      if (!platform) {
        return {
          prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
          error: 'No healthy platforms available',
          timestamp: Date.now()
        };
      }

      // Check if platform supports options
      if (!platform.features.supportsOptionPrices) {
        return {
          prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
          error: `Platform ${platform.name} does not support options`,
          timestamp: Date.now()
        };
      }

      // Check if platform supports batch option price fetching
      if (!platform.fetchMultipleOptionPrices) {
        // Fallback to individual requests
        const prices: Record<string, number | null> = {};
        const promises = instrumentIds.map(async (id) => {
          const price = platform.fetchOptionPrice ? await platform.fetchOptionPrice(id) : null;
          prices[id] = price;
        });
        
        await Promise.all(promises);
        
        return {
          prices,
          error: null,
          platform: platform.name,
          timestamp: Date.now()
        };
      }

      // Use batch method if available
      const prices = await platform.fetchMultipleOptionPrices(instrumentIds);
      
      return {
        prices,
        error: null,
        platform: platform.name,
        timestamp: Date.now()
      };
      
    } catch (err) {
      console.error('Fetch multiple options error:', err);
      return {
        prices: instrumentIds.reduce((acc, id) => ({ ...acc, [id]: null }), {}),
        error: err instanceof Error ? err.message : 'Failed to fetch option prices',
        timestamp: Date.now()
      };
    }
  }
}

export const priceServiceServer = new PriceServiceServer();