export * from './types';
export * from './base-adapter';
export * from './platform-manager';
export * from './okx-adapter';
export * from './binance-adapter';

// Platform instances
export { OKXAdapter } from './okx-adapter';
export { BinanceAdapter } from './binance-adapter';
export { platformManager } from './platform-manager';

// Convenience factory functions
import { OKXAdapter } from './okx-adapter';
import { BinanceAdapter } from './binance-adapter';
import { platformManager } from './platform-manager';
import { PlatformType } from './types';

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