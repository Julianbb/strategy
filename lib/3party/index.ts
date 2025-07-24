export * from './adapter/types';
export * from './adapter/base-adapter';
export * from './platform-manager';
export * from './adapter/okx-adapter';
export * from './adapter/binance-adapter';

// Convenience factory functions
import { OKXAdapter } from './adapter/okx-adapter';
import { BinanceAdapter } from './adapter/binance-adapter';
import { platformManager } from './platform-manager';
import { PlatformType } from './adapter/types';

export function createOKXAdapter(): OKXAdapter {
  return new OKXAdapter();
}

export function createBinanceAdapter(): BinanceAdapter {
  return new BinanceAdapter();
}

export function initializePlatforms(): void {
  // Register available platforms
  platformManager.registerPlatform(PlatformType.OKX, createOKXAdapter());
  platformManager.registerPlatform(PlatformType.BINANCE, createBinanceAdapter());
  
  // Set OKX as primary (since it supports options)
  platformManager.setPrimaryPlatform(PlatformType.OKX);
}