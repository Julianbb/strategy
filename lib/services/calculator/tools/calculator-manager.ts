import { OptionPortfolioCalculator, type OptionTrade, type PortfolioSummary as OptionsPortfolioSummary } from './options';
import { SimplePerpetualCalculator, type PerpetualTrade, type PerpetualPortfolioSummary } from './perpetual';
import { SimpleSpotCalculator, type SpotTrade, type SpotPortfolioSummary } from './spot';
import { PlatformType } from '@/lib/3party/adapter/types';
import { type Trades } from '@/lib/db/schema';

// 统一的计算器类型
export type CalculatorType = 'options' | 'perpetual' | 'spot';

// 统一的交易接口
export type UnifiedTrade = OptionTrade | PerpetualTrade | SpotTrade;

// 统一的组合汇总结果
export type UnifiedPortfolioSummary = OptionsPortfolioSummary | PerpetualPortfolioSummary | SpotPortfolioSummary;

// 计算器配置
export interface CalculatorConfig {
  spotPrice: number;
  baseCurrency?: string;
  currentDate?: Date;
  preferredPlatform?: PlatformType;
}

// 计算器管理器接口
export interface ICalculatorManager {
  getCalculator(type: CalculatorType): OptionPortfolioCalculator | SimplePerpetualCalculator | SimpleSpotCalculator;
  calculatePortfolio(type: CalculatorType, trades: UnifiedTrade[]): Promise<UnifiedPortfolioSummary> | UnifiedPortfolioSummary;
  updatePrice(newPrice: number): void;
  updateDate(newDate: Date): void;
}

/**
 * 计算器管理器 - 统一管理期权和永续合约计算工具
 */
export class CalculatorManager implements ICalculatorManager {
  private optionsCalculator: OptionPortfolioCalculator;
  private perpetualCalculator: SimplePerpetualCalculator;
  private spotCalculator: SimpleSpotCalculator;
  private currentPrice: number;
  private currentDate: Date;
  private baseCurrency: string;
  private preferredPlatform: PlatformType;

  constructor(config: CalculatorConfig) {
    this.currentPrice = config.spotPrice;
    this.currentDate = config.currentDate || new Date();
    this.baseCurrency = config.baseCurrency || 'ETH';
    this.preferredPlatform = config.preferredPlatform || PlatformType.OKX;
    
    // 初始化计算器
    this.optionsCalculator = new OptionPortfolioCalculator(
      this.currentPrice, 
      this.baseCurrency, 
      this.currentDate,
      this.preferredPlatform
    );
    this.perpetualCalculator = new SimplePerpetualCalculator(this.currentPrice);
    this.spotCalculator = new SimpleSpotCalculator();
  }

  /**
   * 获取指定类型的计算器
   */
  getCalculator(type: CalculatorType): OptionPortfolioCalculator | SimplePerpetualCalculator | SimpleSpotCalculator {
    switch (type) {
      case 'options':
        return this.optionsCalculator;
      case 'perpetual':
        return this.perpetualCalculator;
      case 'spot':
        return this.spotCalculator;
      default:
        throw new Error(`Unknown calculator type: ${type}`);
    }
  }

  /**
   * 计算投资组合价值（统一接口）
   */
  async calculatePortfolio(
    type: CalculatorType, 
    trades: UnifiedTrade[]
  ): Promise<UnifiedPortfolioSummary> {
    switch (type) {
      case 'options':
        return await this.optionsCalculator.calculatePortfolioValue(trades as OptionTrade[]);
      case 'perpetual':
        return this.perpetualCalculator.calculatePortfolioValue(trades as PerpetualTrade[]);
      case 'spot':
        // 现货计算需要按币种分组
        const spotTrades = trades as SpotTrade[];
        const tradesBySymbol = new Map<string, { trades: SpotTrade[], currentPrice: number }>();
        spotTrades.forEach(trade => {
          const symbol = trade.baseCurrency || this.baseCurrency;
          if (!tradesBySymbol.has(symbol)) {
            tradesBySymbol.set(symbol, { trades: [], currentPrice: this.currentPrice });
          }
          tradesBySymbol.get(symbol)!.trades.push(trade);
        });
        return this.spotCalculator.calculatePortfolioValue(tradesBySymbol);
      default:
        throw new Error(`Unknown calculator type: ${type}`);
    }
  }

  /**
   * 更新当前价格（同时更新所有计算器）
   */
  updatePrice(newPrice: number): void {
    this.currentPrice = newPrice;
    this.perpetualCalculator.updatePrice(newPrice);
    this.optionsCalculator.updateSpotPrice(newPrice);
  }

  /**
   * 更新当前日期（主要影响期权计算）
   */
  updateDate(newDate: Date): void {
    this.currentDate = newDate;
    this.optionsCalculator.updateCurrentDate(newDate);
  }

  /**
   * 获取当前价格
   */
  getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * 获取当前日期
   */
  getCurrentDate(): Date {
    return this.currentDate;
  }

  /**
   * 同时更新价格和日期
   */
  updatePriceAndDate(newPrice: number, newDate: Date): void {
    this.updatePrice(newPrice);
    this.updateDate(newDate);
  }

  /**
   * 更新基础货币
   */
  updateBaseCurrency(newBaseCurrency: string): void {
    this.baseCurrency = newBaseCurrency;
    this.optionsCalculator.updateBaseCurrency(newBaseCurrency);
  }

  /**
   * 更新首选平台
   */
  updatePreferredPlatform(newPlatform: PlatformType): void {
    this.preferredPlatform = newPlatform;
    this.optionsCalculator.updatePreferredPlatform(newPlatform);
  }

  /**
   * 将数据库交易记录转换为统一格式
   */
  convertTradesToUnifiedFormat(trades: Trades[]): UnifiedTrade[] {
    const unifiedTrades: UnifiedTrade[] = [];

    for (const trade of trades) {
      if (trade.productType === 'perpetual') {
        // 转换为永续合约交易格式
        unifiedTrades.push({
          id: trade.id,
          baseCurrency: this.baseCurrency,
          direction: trade.side === 'buy' ? 'long' : 'short',
          size: Number(trade.amount),
          entryPrice: trade.priceInUSD ? Number(trade.priceInUSD) : 0,
          fee: trade.feeInUSD ? Number(trade.feeInUSD) : 0,
          tradeDate: trade.createdAt ? new Date(trade.createdAt).toISOString() : new Date().toISOString()
        } as PerpetualTrade);
      } else if (trade.productType === 'spot') {
        // 转换为现货交易格式
        unifiedTrades.push({
          id: trade.id,
          baseCurrency: this.baseCurrency,
          direction: trade.side,
          quantity: Number(trade.amount),
          price: trade.priceInUSD ? Number(trade.priceInUSD) : 0,
          fee: trade.feeInUSD ? Number(trade.feeInUSD) :  (trade.feeInCurrency ? Number(trade.feeInCurrency) : 0),
          tradeDate: trade.createdAt ? new Date(trade.createdAt).toISOString() : new Date().toISOString()
        } as SpotTrade);
      } else if (trade.productType === 'option' && trade.optionType) {
        // 转换为期权交易格式
        const parts = trade.product.split('-');
        const expiryStr = parts[1] || '20241231'; // YYYYMMDD format
        const strikeStr = parts[2] || '3000';
        
        unifiedTrades.push({
          id: trade.id,
          baseCurrency: this.baseCurrency,
          type: trade.optionType as 'call' | 'put',
          direction: trade.side as 'buy' | 'sell',
          quantity: Number(trade.amount),
          strike: Number(strikeStr || 3000),
          expiry: expiryStr ? `${expiryStr.slice(0,4)}-${expiryStr.slice(4,6)}-${expiryStr.slice(6,8)}` : '2024-12-31',
          premium: trade.priceInCurrency ? Number(trade.priceInCurrency) : 0,
          tradeDate: trade.createdAt ? new Date(trade.createdAt).toISOString() : new Date().toISOString(),
          fee: trade.feeInCurrency ? Number(trade.feeInCurrency) : 0,
          isExpiry: trade.isExpired,
          deliveryPriceInCurrency: trade.deliveryPriceInCurrency ? Number(trade.deliveryPriceInCurrency) : undefined,
        } as OptionTrade);
      }
    }

    return unifiedTrades;
  }

  /**
   * 根据交易类型自动分组计算
   */
  async calculateMixedPortfolio(trades: UnifiedTrade[]): Promise<{
    optionSummary?: OptionsPortfolioSummary;
    perpetualSummary?: PerpetualPortfolioSummary;
    spotSummary?: SpotPortfolioSummary;
    totalPnLInUSDT: number;
    totalFeesInUSDT: number;
  }> {
    const optionTrades = trades.filter(isOptionTrade);
    const perpetualTrades = trades.filter(isPerpetualTrade);
    const spotTrades = trades.filter(isSpotTrade);

    let optionSummary: OptionsPortfolioSummary | undefined;
    let perpetualSummary: PerpetualPortfolioSummary | undefined;
    let spotSummary: SpotPortfolioSummary | undefined;

    // 计算期权部分
    if (optionTrades.length > 0) {
      optionSummary = await this.optionsCalculator.calculatePortfolioValue(optionTrades);
    }

    // 计算永续合约部分
    if (perpetualTrades.length > 0) {
      perpetualSummary = this.perpetualCalculator.calculatePortfolioValue(perpetualTrades);
    }

    // 计算现货部分
    if (spotTrades.length > 0) {
      const tradesBySymbol = new Map<string, { trades: SpotTrade[], currentPrice: number }>();
      spotTrades.forEach(trade => {
        const symbol = trade.baseCurrency || this.baseCurrency;
        if (!tradesBySymbol.has(symbol)) {
          tradesBySymbol.set(symbol, { trades: [], currentPrice: this.currentPrice });
        }
        tradesBySymbol.get(symbol)!.trades.push(trade);
      });
      spotSummary = this.spotCalculator.calculatePortfolioValue(tradesBySymbol);
    }

    // 合并总计
    const totalPnLInUSDT = (optionSummary?.totalPnlInUSDT || 0) + 
                         (perpetualSummary?.totalUnrealizedPnlInUSDT || 0) + 
                         (spotSummary?.totalPnlInUSDT || 0);
    const totalFeesInUSDT = (optionSummary?.totalFeesInUSDT || 0) + 
                          (perpetualSummary?.totalFeesInUSDT || 0) + 
                          (spotSummary?.totalFeesInUSDT || 0);
    

    return {
      optionSummary,
      perpetualSummary,
      spotSummary,
      totalPnLInUSDT,
      totalFeesInUSDT,
    };
  }
}

// 便利函数：创建计算器管理器
export function createCalculatorManager(config: CalculatorConfig): CalculatorManager {
  return new CalculatorManager(config);
}



// 类型守卫函数
export function isOptionTrade(trade: UnifiedTrade): trade is OptionTrade {
  return 'type' in trade && 'strike' in trade && 'expiry' in trade;
}

export function isPerpetualTrade(trade: UnifiedTrade): trade is PerpetualTrade {
  return 'direction' in trade && 'size' in trade && 'entryPrice' in trade && !('strike' in trade) && !('quantity' in trade);
}

export function isSpotTrade(trade: UnifiedTrade): trade is SpotTrade {
  return 'direction' in trade && 'quantity' in trade && 'price' in trade && !('strike' in trade) && !('size' in trade);
}

export function isOptionsPortfolioSummary(summary: UnifiedPortfolioSummary): summary is OptionsPortfolioSummary {
  return 'breakdown' in summary && 'spotPrice' in summary;
}

export function isPerpetualPortfolioSummary(summary: UnifiedPortfolioSummary): summary is PerpetualPortfolioSummary {
  return 'netExposure' in summary && 'totalExposure' in summary;
}

export function isSpotPortfolioSummary(summary: UnifiedPortfolioSummary): summary is SpotPortfolioSummary {
  return 'positions' in summary && Array.isArray((summary as SpotPortfolioSummary).positions);
}

