import { OptionPortfolioCalculator, type OptionTrade, type PortfolioSummary } from './options';
import { SimplePerpetualCalculator, type PerpetualTrade, type PerpetualPortfolioSummary } from './perpetual';
import { PlatformType } from '../../price-fetcher/platforms/types';

// 统一的计算器类型
export type CalculatorType = 'options' | 'perpetual';

// 统一的交易接口
export type UnifiedTrade = OptionTrade | PerpetualTrade;

// 统一的组合汇总结果
export type UnifiedPortfolioSummary = PortfolioSummary | PerpetualPortfolioSummary;

// 计算器配置
export interface CalculatorConfig {
  spotPrice: number;
  baseCurrency?: string;
  currentDate?: Date;
  preferredPlatform?: PlatformType;
}

// 计算器管理器接口
export interface ICalculatorManager {
  getCalculator(type: CalculatorType): OptionPortfolioCalculator | SimplePerpetualCalculator;
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
  }

  /**
   * 获取指定类型的计算器
   */
  getCalculator(type: CalculatorType): OptionPortfolioCalculator | SimplePerpetualCalculator {
    switch (type) {
      case 'options':
        return this.optionsCalculator;
      case 'perpetual':
        return this.perpetualCalculator;
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
   * 根据交易类型自动分组计算
   */
  async calculateMixedPortfolio(trades: UnifiedTrade[]): Promise<{
    optionSummary?: PortfolioSummary;
    perpetualSummary?: PerpetualPortfolioSummary;
    totalPnL: number;
    totalFees: number;
  }> {
    const optionTrades = trades.filter(isOptionTrade);
    const perpetualTrades = trades.filter(isPerpetualTrade);

    let optionSummary: PortfolioSummary | undefined;
    let perpetualSummary: PerpetualPortfolioSummary | undefined;

    // 计算期权部分
    if (optionTrades.length > 0) {
      optionSummary = await this.optionsCalculator.calculatePortfolioValue(optionTrades);
    }

    // 计算永续合约部分
    if (perpetualTrades.length > 0) {
      perpetualSummary = this.perpetualCalculator.calculatePortfolioValue(perpetualTrades);
    }

    // 合并总计
    const totalPnL = (optionSummary?.totalPnlUsdt || 0) + (perpetualSummary?.totalUnrealizedPnl || 0);
    const totalFees = (optionSummary?.totalFeesUsdt || 0) + (perpetualSummary?.totalFees || 0);

    return {
      optionSummary,
      perpetualSummary,
      totalPnL,
      totalFees
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
  return 'direction' in trade && 'size' in trade && 'entryPrice' in trade && !('strike' in trade);
}

export function isPortfolioSummary(summary: UnifiedPortfolioSummary): summary is PortfolioSummary {
  return 'breakdown' in summary && 'spotPrice' in summary;
}

export function isPerpetualPortfolioSummary(summary: UnifiedPortfolioSummary): summary is PerpetualPortfolioSummary {
  return 'netExposure' in summary && 'totalExposure' in summary;
}