import { priceService } from '@/lib/services/price-fetcher/index.server'
import { PlatformType } from '@/lib/services/price-fetcher/platforms/types'
interface OptionTrade {
    id?: string;                    // 交易ID（可选）
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
     * 计算已到期期权的内在价值
     */
    private calculateIntrinsicValue(
      type: 'call' | 'put',
      strike: number,
      spotPrice: number
    ): number {
      if (type === 'call') {
        return Math.max(spotPrice - strike, 0);
      } else {
        return Math.max(strike - spotPrice, 0);
      }
    }
  
    /**
     * 构建期权合约ID
    */
    private buildOptionInstrumentId(type: 'call' | 'put', strike: number, expiry: string): string {
      const underlying = `${this.baseCurrency}-USD`;
      const expiryFormatted = this.formatExpiryForOKX(expiry);
      const optionType = type.toUpperCase();
      return `${underlying}-${expiryFormatted}-${strike}-${optionType}`;
    }

    /**
     * 将日期格式转换为期权合约格式 (YYYYMMDD)
     */
    private formatExpiryForOKX(expiry: string): string {
      const date = new Date(expiry);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    }
  
    /**
     * 计算单个期权交易的价值（使用批量获取的价格数据）
     */
    private async calculateOptionValueWithBatchPrices(
      trade: OptionTrade, 
      batchPrices: Record<string, number | null>
    ): Promise<OptionValue> {
      const daysToExpiry = this.getDaysToExpiry(trade.expiry);
      const isExpired = daysToExpiry <= 0;
      
      let currentPrice: number;
      
      if (isExpired) {
        // 已到期：使用内在价值
        currentPrice = this.calculateIntrinsicValue(
          trade.type,
          trade.strike,
          this.spotPrice
        );
      } else {
        // 未到期：从批量数据中获取价格
        const instrumentId = this.buildOptionInstrumentId(trade.type, trade.strike, trade.expiry);
        const batchPrice = batchPrices[instrumentId];
        
        if (batchPrice !== null && batchPrice > 0) {
          currentPrice = batchPrice;
        } else {
          // 回退到内在价值
          currentPrice = this.calculateIntrinsicValue(trade.type, trade.strike, this.spotPrice);
        }
      }
  
      // 计算方向系数：买入=+1，卖出=-1
      const directionMultiplier = trade.direction === 'buy' ? 1 : -1;
      
      // 当前总价值（币本位）
      const currentValue = currentPrice * trade.quantity * directionMultiplier;
      
      // 建仓成本（币本位）
      // 买入期权：成本为负（支出权利金）
      // 卖出期权：成本为正（收入权利金）
      const costBasis = trade.premium * trade.quantity * (-directionMultiplier);
      
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
      
      // 批量获取所有未到期期权的价格
      const activeTrades = trades.filter(trade => this.getDaysToExpiry(trade.expiry) > 0);
      const instrumentIds = activeTrades.map(trade => 
        this.buildOptionInstrumentId(trade.type, trade.strike, trade.expiry)
      );
      
      let pricesData: Record<string, number | null> = {};
      
      if (instrumentIds.length > 0) {
        const multiPriceData = await priceService.fetchMultipleOptionsPrices(instrumentIds, this.preferredPlatform);
        pricesData = multiPriceData.prices;
      }
      
      // 计算所有期权价值
      const calculations = trades.map(async (trade) => {
        const value = await this.calculateOptionValueWithBatchPrices(trade, pricesData);
        return { ...value, trade };
      });
      
      const calculatedResults = await Promise.all(calculations);
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
  