import {convertInstrumentFlexible} from "@/lib/utils"
import { PlatformType } from "./platforms"

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

  async fetchPriceData(baseCurrency: string, optionInstrument?: string | null, preferredPlatform?: PlatformType): Promise<PriceData> {
    try {
      const params = new URLSearchParams({
        baseCurrency,
        ...(optionInstrument && { optionInstrument }),
        ...(preferredPlatform && { preferredPlatform })
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
        error: data.error,
        platform: data.platform,
        timestamp: data.timestamp
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
    try {
      const response = await fetch('/api/platforms');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching available platforms:', err);
      return [];
    }
  }

  async getHealthyPlatforms(): Promise<string[]> {
    try {
      const response = await fetch('/api/platforms/healthy');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching healthy platforms:', err);
      return [];
    }
  }

  async setPrimaryPlatform(platformType: PlatformType): Promise<void> {
    try {
      const response = await fetch('/api/platforms/primary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform: platformType }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error setting primary platform:', err);
      throw err;
    }
  }

  async fetchMultipleOptionsPrices(
    instrumentIds: string[], 
    preferredPlatform?: PlatformType
  ): Promise<MultipleOptionsPriceData> {
    try {
      const params = new URLSearchParams({
        instrumentIds: instrumentIds.join(','),
        ...(preferredPlatform && { preferredPlatform })
      });
      
      const response = await fetch(`/api/prices/options/multiple?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        prices: data.prices,
        error: data.error,
        platform: data.platform,
        timestamp: data.timestamp
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

export const priceServiceClient = new PriceServiceClient();