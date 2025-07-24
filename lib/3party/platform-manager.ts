import { IPlatformAdapter, PlatformType, PlatformConfig } from './adapter/types';

export class PlatformManager {
  private platforms = new Map<PlatformType, IPlatformAdapter>();
  private primaryPlatform: PlatformType | null = null;

  registerPlatform(type: PlatformType, adapter: IPlatformAdapter): void {
    this.platforms.set(type, adapter);
    
    // Set first registered platform as primary if none set
    if (!this.primaryPlatform) {
      this.primaryPlatform = type;
    }
  }

  setPrimaryPlatform(type: PlatformType): void {
    if (!this.platforms.has(type)) {
      throw new Error(`Platform ${type} not registered`);
    }
    this.primaryPlatform = type;
  }

  getPlatform(type?: PlatformType): IPlatformAdapter | null {
    const platformType = type || this.primaryPlatform;
    if (!platformType) {
      return null;
    }
    return this.platforms.get(platformType) || null;
  }

  getAvailablePlatforms(): PlatformType[] {
    return Array.from(this.platforms.keys());
  }

  async getHealthyPlatforms(): Promise<PlatformType[]> {
    const healthChecks = await Promise.allSettled(
      Array.from(this.platforms.entries()).map(async ([type, adapter]) => ({
        type,
        healthy: await adapter.isHealthy()
      }))
    );

    return healthChecks
      .filter((result): result is PromiseFulfilledResult<{type: PlatformType, healthy: boolean}> => 
        result.status === 'fulfilled' && result.value.healthy
      )
      .map(result => result.value.type);
  }

  async getPlatformWithFallback(preferredType?: PlatformType): Promise<IPlatformAdapter | null> {
    // Try preferred platform first
    if (preferredType && this.platforms.has(preferredType)) {
      const adapter = this.platforms.get(preferredType)!;
      if (await adapter.isHealthy()) {
        return adapter;
      }
    }

    // Try primary platform
    if (this.primaryPlatform && this.primaryPlatform !== preferredType) {
      const adapter = this.platforms.get(this.primaryPlatform)!;
      if (await adapter.isHealthy()) {
        return adapter;
      }
    }

    // Try any healthy platform
    const healthyPlatforms = await this.getHealthyPlatforms();
    if (healthyPlatforms.length > 0) {
      return this.platforms.get(healthyPlatforms[0])!;
    }

    return null;
  }
}

export const platformManager = new PlatformManager();