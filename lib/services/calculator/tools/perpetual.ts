// 永续合约交易明细接口
interface PerpetualTrade {
    id?: string;                    // 交易ID（可选）
    baseCurrency?:string;
    direction: 'long' | 'short';   // 方向：做多/做空
    size: number;                  // 仓位大小（币本位数量，如ETH数量）
    entryPrice: number;            // 开仓价格（USDT）
    fee: number;                   // 交易手续费（USDT）
    tradeDate?: string;            // 交易日期（可选）
  }
  
  // 永续合约价值计算结果
  interface PerpetualValue {
    entryPrice: number;            // 开仓价格
    currentPrice: number;          // 当前价格
    size: number;                  // 仓位大小（币本位数量）
    direction: 'long' | 'short';   // 方向
    fee: number;                   // 手续费（USDT）
    unrealizedPnl: number;         // 未实现盈亏（USDT，扣除手续费之前）
    unrealizedPnlPercent: number;  // 未实现盈亏百分比
  }
  
  // 永续合约组合汇总
  interface PerpetualPortfolioSummary {
    totalUnrealizedPnlInUSDT: number;    // 总未实现盈亏（USDT，扣除手续费之前）
    totalFees_USDT: number;             // 总手续费（USDT）
    totalFeesInUSDT: number;            // 总手续费（USDT换算）
    totalExposure: number;         // 总敞口（币本位，如ETH）
    netExposure: number;           // 净敞口（币本位，正数=净做多，负数=净做空）
    averagePriceOfPosition: number; // 净仓位的平均持仓成本（USDT）
    currentPrice: number;          // 当前价格
    positions: PerpetualValue[];   // 所有持仓
  }
  
  class SimplePerpetualCalculator {
    private currentPrice: number;   // 当前标的价格（USDT）
  
    constructor(currentPrice: number) {
      this.currentPrice = currentPrice;
    }
  
    /**
     * 计算单个永续合约交易的价值
     */
    private calculatePerpetualValue(trade: PerpetualTrade): PerpetualValue {
      const { direction, size, entryPrice, fee } = trade;
      
      // 计算未实现盈亏（USDT，扣除手续费之前）
      let unrealizedPnl: number;
      if (direction === 'long') {
        // 做多：(当前价格 - 开仓价格) × 数量
        unrealizedPnl = (this.currentPrice - entryPrice) * size;
      } else {
        // 做空：(开仓价格 - 当前价格) × 数量
        unrealizedPnl = (entryPrice - this.currentPrice) * size;
      }
      
      // 计算盈亏百分比（基于开仓价值）
      const entryValue = entryPrice * size;
      const unrealizedPnlPercent = (unrealizedPnl / entryValue) * 100;
  
      return {
        entryPrice,
        currentPrice: this.currentPrice,
        size,
        direction,
        fee,
        unrealizedPnl,
        unrealizedPnlPercent
      };
    }
  
    /**
     * 计算永续合约组合总价值
     */
    calculatePortfolioValue(trades: PerpetualTrade[]): PerpetualPortfolioSummary {
      const positions = trades.map(trade => this.calculatePerpetualValue(trade));
      
      const totalUnrealizedPnlInUSDT = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
      const totalFees_USDT = positions.reduce((sum, p) => sum + p.fee, 0);
      
      // 计算敞口（币本位）
      let totalExposure = 0;  // 总敞口
      let netExposure = 0;    // 净敞口
      
      // 计算净仓位的平均成本
      let longTotalValue = 0;  // 多头总价值
      let longTotalSize = 0;   // 多头总数量
      let shortTotalValue = 0; // 空头总价值
      let shortTotalSize = 0;  // 空头总数量
      
      positions.forEach(p => {
        totalExposure += p.size; // 总敞口：所有仓位绝对值相加
        
        if (p.direction === 'long') {
          netExposure += p.size;
          longTotalValue += p.size * p.entryPrice;
          longTotalSize += p.size;
        } else {
          netExposure -= p.size;
          shortTotalValue += p.size * p.entryPrice;
          shortTotalSize += p.size;
        }
      });
  
      // 计算净仓位的加权平均价格
      let averagePriceOfPosition = 0;
      
      if (netExposure > 0) {
        // 净做多：计算净多头仓位的加权平均价格
        averagePriceOfPosition = (longTotalValue - shortTotalValue) / netExposure;
      } else if (netExposure < 0) {
        // 净做空：计算净空头仓位的加权平均价格
        averagePriceOfPosition = (shortTotalValue - longTotalValue) / Math.abs(netExposure);
      } else {
        // 完全对冲：净敞口为0，平均价格设为当前价格
        averagePriceOfPosition = this.currentPrice;
      }
  
      return {
        totalUnrealizedPnlInUSDT,
        totalFees_USDT,
        totalFeesInUSDT: totalFees_USDT,
        totalExposure,
        netExposure,
        averagePriceOfPosition,
        currentPrice: this.currentPrice,
        positions
      };
    }
  
    /**
     * 更新当前价格
     */
    updatePrice(newPrice: number): void {
      this.currentPrice = newPrice;
    }
  }
  
  
  // 导出主要类和接口
  export {
    SimplePerpetualCalculator
  };

  
  export type {
    PerpetualTrade,
    PerpetualValue,
    PerpetualPortfolioSummary
  };