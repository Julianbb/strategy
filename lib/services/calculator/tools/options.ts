import { priceService } from '@/lib/services/price-fetcher'
import { PlatformType } from '@/lib/3party/adapter/types'
import { platformManager } from '@/lib/3party/platform-manager'
interface OptionTrade {
    id?: string;                    // 交易ID（可选）
    baseCurrency?:string;
    type: 'call' | 'put';          // 期权类型
    direction: 'buy' | 'sell';     // 买卖方向
    quantity: number;              // 数量
    strike: number;                // 执行价（USDT）
    expiry: string;                // 到期日 YYYY-MM-DD
    premium: number;               // 权利金（币本位，每份合约）
    tradeDate?: string;            // 交易日期（可选）
    fee:number;                    // 期权交易的手续费（币本位）
  }
  
  // 期权价值计算结果
  interface OptionValue {
    currentPrice: number;          // 当前理论价格（币本位）
    currentValue: number;          // 当前总价值（币本位）
    costBasis: number;             // 建仓成本（币本位）
    fee: number;                   // 手续费（币本位）
    pnl: number;                   // 损益（币本位，扣除手续费之前）
    pnlUsdt: number;               // 损益（USDT，扣除手续费之前）
    isExpired: boolean;            // 是否已到期
    daysToExpiry: number;          // 到期天数
  }
  
  // 组合价值汇总
  interface PortfolioSummary {
    totalCurrentValue: number;     // 总当前价值（币本位）
    totalCostBasis: number;        // 总建仓成本（币本位）
    totalFees: number;             // 总手续费（币本位）
    totalFeesUsdt: number;         // 总手续费（USDT）
    totalPnl: number;              // 总损益（币本位，扣除手续费之前）
    totalPnlUsdt: number;          // 总损益（USDT，扣除手续费之前）
    spotPrice: number;             // 当前现货价格
    breakdown: {
      expired: OptionValue[];      // 已到期期权
      active: OptionValue[];       // 未到期期权
    };
  }
  
  class OptionPortfolioCalculator {
    private currentDate: Date;
    private spotPrice: number;     // 当前现货价格（USDT）
    private baseCurrency: string;  // 基础货币（如ETH）
    private preferredPlatform: PlatformType;  // 首选平台
  
    constructor(
      spotPrice: number, 
      baseCurrency: string = 'ETH', 
      currentDate: Date = new Date(),
      preferredPlatform: PlatformType = PlatformType.OKX
    ) {
      this.spotPrice = spotPrice;
      this.baseCurrency = baseCurrency;
      this.currentDate = currentDate;
      this.preferredPlatform = preferredPlatform;
    }
  
    /**
     * 计算到期天数
     */
    private getDaysToExpiry(expiryDate: string): number {
      const expiry = new Date(expiryDate + 'T08:00:00Z'); // 假设8点到期
      const diffTime = expiry.getTime() - this.currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
  
    /**
     * 计算已到期期权的内在价值（返回币本位）
     */
    private calculateIntrinsicValue(
      type: 'call' | 'put',
      strike: number,
      spotPrice: number
    ): number {
      const intrinsicValueUsdt = type === 'call' 
        ? Math.max(spotPrice - strike, 0)
        : Math.max(strike - spotPrice, 0);
      
      // 转换为币本位：USDT价值除以现货价格
      return intrinsicValueUsdt / spotPrice;
    }
  
    /**
     * 构建期权合约ID（通过平台适配器）
     */
    private buildOptionInstrumentId(type: 'call' | 'put', strike: number, expiry: string): string {
      const platform = platformManager.getPlatform(this.preferredPlatform);
      if (platform && 'buildOptionInstrumentId' in platform && typeof platform.buildOptionInstrumentId === 'function') {
        return (platform as any).buildOptionInstrumentId(this.baseCurrency, type, strike, expiry);
      }
      
      // 如果平台不支持或方法不存在，抛出错误
      throw new Error(`Platform ${this.preferredPlatform} does not support option instrument ID generation`);
    }
  
    /**
     * 计算单个期权交易的价值（使用批量获取的价格数据）
     */
    private  calculateOptionValueWithBatchPrices(
      trade: OptionTrade, 
      batchPrices: Record<string, number | null>
    ): OptionValue {
      const daysToExpiry = this.getDaysToExpiry(trade.expiry);
      const isExpired = daysToExpiry <= 0;
      
      // 无论到期还是未到期，都从batchPrices中获取价格
      const instrumentId = this.buildOptionInstrumentId(trade.type, trade.strike, trade.expiry);
      const batchPrice = batchPrices[instrumentId];
      
      if (batchPrice === null || batchPrice === undefined) {
        throw new Error(`Price not found for option ${instrumentId}`);
      }
      
      const currentPrice = batchPrice;
  
      // 计算方向系数：买入=+1，卖出=-1
      const directionMultiplier = trade.direction === 'buy' ? 1 : -1;
      
      // 当前总价值（币本位）
      const currentValue = currentPrice * trade.quantity * directionMultiplier;
      
      // 建仓成本（币本位）
      // 买入期权：成本为负（支出权利金）
      // 卖出期权：成本为正（收入权利金）
      const costBasis = trade.premium * trade.quantity * directionMultiplier;
      
      // 损益（币本位，扣除手续费之前）
      const pnl = currentValue - costBasis;
      
      // 损益（USDT，扣除手续费之前）
      const pnlUsdt = pnl * this.spotPrice;

      
      return {
        currentPrice,
        currentValue,
        costBasis,
        fee: trade.fee,
        pnl,
        pnlUsdt,
        isExpired,
        daysToExpiry
      };
    }

  
    /**
     * 计算期权组合总价值
     */
    async calculatePortfolioValue(trades: OptionTrade[]): Promise<PortfolioSummary> {
      const results: (OptionValue & { trade: OptionTrade })[] = [];
      
      // 获取所有期权的价格数据
      const pricesData = await this.fetchOptionPrices(trades);
      
      // 计算所有期权价值
      const calculatedResults = trades.map((trade) => {
        const value = this.calculateOptionValueWithBatchPrices(trade, pricesData);
        return { ...value, trade };
      });
     
      results.push(...calculatedResults);
  
      // 分类汇总
      const expired = results.filter(r => r.isExpired);
      const active = results.filter(r => !r.isExpired);
      
      // 计算总计
      const totalCurrentValue = results.reduce((sum, r) => sum + r.currentValue, 0);
      const totalCostBasis = results.reduce((sum, r) => sum + r.costBasis, 0);
      const totalFees = results.reduce((sum, r) => sum + r.fee, 0);
      const totalFeesUsdt = totalFees * this.spotPrice;
      const totalPnl = results.reduce((sum, r) => sum + r.pnl, 0);
      const totalPnlUsdt = totalPnl * this.spotPrice;
  
      return {
        totalCurrentValue,
        totalCostBasis,
        totalFees,
        totalFeesUsdt,
        totalPnl,
        totalPnlUsdt,
        spotPrice: this.spotPrice,
        breakdown: {
          expired: expired.map(r => ({
            currentPrice: r.currentPrice,
            currentValue: r.currentValue,
            costBasis: r.costBasis,
            fee: r.fee,
            pnl: r.pnl,
            pnlUsdt: r.pnlUsdt,
            isExpired: r.isExpired,
            daysToExpiry: r.daysToExpiry
          })),
          active: active.map(r => ({
            currentPrice: r.currentPrice,
            currentValue: r.currentValue,
            costBasis: r.costBasis,
            fee: r.fee,
            pnl: r.pnl,
            pnlUsdt: r.pnlUsdt,
            isExpired: r.isExpired,
            daysToExpiry: r.daysToExpiry
          }))
        }
      };
    }
  
    
  
    /**
     * 更新现货价格
     */
    updateSpotPrice(newPrice: number): void {
      this.spotPrice = newPrice;
    }
  
    /**
     * 更新当前日期
     */
    updateCurrentDate(newDate: Date): void {
      this.currentDate = newDate;
    }

    /**
     * 获取期权价格数据（包括已到期和未到期期权）
     */
    private async fetchOptionPrices(trades: OptionTrade[]): Promise<Record<string, number | null>> {
      // 分类到期和未到期的期权
      const expiredTrades = trades.filter(trade => this.getDaysToExpiry(trade.expiry) <= 0);
      const activeTrades = trades.filter(trade => this.getDaysToExpiry(trade.expiry) > 0);
      
      // 为每个已到期的交易添加expiredInstrumentId字段
      const expiredTradesWithInstrumentId = expiredTrades.map(trade => ({
        ...trade,
        expiredInstrumentId: this.buildOptionInstrumentId(trade.type, trade.strike, trade.expiry)
      }));
      
      // 获取对应的instrumentIds
      const activeInstrumentIds = activeTrades.map(trade => 
        this.buildOptionInstrumentId(trade.type, trade.strike, trade.expiry)
      );
      const expiredInstrumentIds = expiredTradesWithInstrumentId.map(trade => trade.expiredInstrumentId);
      
      
      let pricesData: Record<string, number | null> = {};
      
      // 获取未到期期权的实时价格
      if (activeInstrumentIds.length > 0) {
        const multiPriceData = await priceService.fetchMultipleOptionsPrices(activeInstrumentIds, this.preferredPlatform);
        pricesData = { ...pricesData, ...multiPriceData.prices };
      }
      
      // 获取已到期期权的交割价格（批量获取）
      if (expiredInstrumentIds.length > 0) {
          const expiredPrices = await priceService.fetchMultipleOptionExercisePrices(expiredTradesWithInstrumentId, expiredInstrumentIds, this.preferredPlatform);
          pricesData = { ...pricesData, ...expiredPrices.prices };
      }

     
      
      return pricesData;
    }

    /**
     * 更新基础货币
     */
    updateBaseCurrency(newBaseCurrency: string): void {
      this.baseCurrency = newBaseCurrency;
    }

    /**
     * 更新首选平台
     *
     */
    updatePreferredPlatform(newPlatform: PlatformType): void {
      this.preferredPlatform = newPlatform;
    }
  }
  
  
  // 导出主要类和接口
  export {
    OptionPortfolioCalculator,
  };
  
  
  
  export type {
    OptionTrade,
    OptionValue,
    PortfolioSummary
  };
  