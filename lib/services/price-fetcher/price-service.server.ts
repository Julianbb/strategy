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
    baseCurrency: string, 
    optionInstrument?: string | null,
    preferredPlatform?: PlatformType
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
}

export const priceServiceServer = new PriceServiceServer();