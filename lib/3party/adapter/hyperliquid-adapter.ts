import { BasePlatformAdapter } from './base-adapter';
import { PlatformPriceData, PlatformFeatures } from './types';

export class HyperliquidAdapter extends BasePlatformAdapter {
  readonly name = 'hyperliquid';
  readonly features: PlatformFeatures = {
    supportsSpotPrices: true,
    supportsOptionPrices: false,
    supportsRealTimeData: true,
    supportsHistoricalData: false,
    supportedCurrencies: ['BTC', 'ETH', 'SOL'],
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerMinute: 600,
    },
  };

  private readonly baseUrl = 'https://api.hyperliquid.xyz';

  constructor(timeout = 5000, retries = 3) {
    super(timeout, retries);
  }

  async fetchSpotPrice(baseCurrency: string, quoteCurrency?: string): Promise<number | null> {
    // Empty implementation
    return null;
  }

  async fetchPrices(baseCurrency: string, optionInstrument?: string): Promise<PlatformPriceData> {
    // Empty implementation
    return {
      spotPrice: null,
      timestamp: Date.now(),
    };
  }

  async fetchOptionPrice(instrumentId: string): Promise<number | null> {
    // Empty implementation
    throw new Error(`Option price fetching not supported by ${this.name}`);
  }

  async getInstrumentInfo(instrumentId: string): Promise<any> {
    // Empty implementation
    throw new Error(`Instrument info not supported by ${this.name}`);
  }

  async validateInstrument(instrumentId: string): Promise<boolean> {
    // Empty implementation
    return false;
  }

  async fetchHistoricalKlines(symbol: string, interval: string, startTime: number, endTime: number): Promise<any> {
    // Empty implementation
    throw new Error(`Historical klines not implemented for ${this.name}`);
  }

  /**
   * 获取某个Position的总Funding Rate Fee
   * @param asset 资产符号 (如 'BTC', 'ETH')
   * @param userAddress 用户地址
   * @returns 总的funding fee (USDT)
   */
  async getFunding(asset: string, userAddress: string): Promise<number> {
    try {

      const response = await this.makeRequest<any>(
        `${this.baseUrl}/info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: "clearinghouseState",
            user: userAddress
          }),
        }
      );

      if (!response || !response.assetPositions || !Array.isArray(response.assetPositions)) {
        return 0;
      }

      // 查找指定资产的持仓
      const assetPosition = response.assetPositions.find((pos: any) => 
        pos.position && pos.position.coin === asset
      );

      if (!assetPosition || !assetPosition.position || !assetPosition.position.cumFunding) {
        return 0;
      }

      // 获取cumFunding.allTime，这是该资产的总funding费用
      const allTimeFunding = parseFloat(assetPosition.position.cumFunding.allTime || '0');
      return allTimeFunding; 
      
    } catch (error) {
      console.error(`Hyperliquid getFunding error for ${asset}:`, error);
      return 0;
    }
  }
}