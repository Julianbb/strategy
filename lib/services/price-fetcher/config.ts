import { PlatformType, PlatformConfig } from './platforms/types';

export interface PriceServiceConfig {
  defaultPlatform: PlatformType;
  enabledPlatforms: PlatformType[];
  fallbackEnabled: boolean;
  platforms: Record<PlatformType, PlatformConfig>;
}

export const defaultConfig: PriceServiceConfig = {
  defaultPlatform: PlatformType.OKX,
  enabledPlatforms: [PlatformType.OKX, PlatformType.BINANCE],
  fallbackEnabled: true,
  platforms: {
    [PlatformType.OKX]: {
      type: PlatformType.OKX,
      timeout: 5000,
      retries: 3,
    },
    [PlatformType.BINANCE]: {
      type: PlatformType.BINANCE,
      timeout: 5000,
      retries: 3,
    },
    [PlatformType.DERIBIT]: {
      type: PlatformType.DERIBIT,
      timeout: 5000,
      retries: 3,
    },
    [PlatformType.BYBIT]: {
      type: PlatformType.BYBIT,
      timeout: 5000,
      retries: 3,
    },
  },
};

export function getConfig(): PriceServiceConfig {
  // In production, you might want to load this from environment variables or a config file
  return defaultConfig;
}