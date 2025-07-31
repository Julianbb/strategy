// 现货交易明细接口
interface SpotTrade {
  id?: string;                    // 交易ID（可选）
  baseCurrency?: string;          // 基础币种
  direction: 'buy' | 'sell';      // 方向：买入/卖出
  quantity: number;               // 交易数量（币本位数量，如ETH数量）
  price: number;                  // 交易价格（USDT）
  fee: number;                    // 交易手续费（买入时为币本位，卖出时为USDT）
  tradeDate?: string;             // 交易日期（可选）
}

// 现货持仓价值计算结果
interface SpotValue {
  baseCurrency: string;           // 基础币种
  averageCost: number;            // 平均成本价格
  quantity: number;               // 持仓数量（币本位数量,未减去手续费）
  totalCost: number;              // 总成本（USDT，不含手续费）
  currentValue: number;           // 当前价值（USDT，基于持仓数量）
  PnlInUSDT: number;              // 盈亏（USDT，不含手续费）
  totalFees_USDT: number;         // 手续费（USDT）
  totalFees_Currency: number;     // 手续费（币本位）
  totalFeesInUSDT: number;        // 总手续费（USDT换算）
}

// 现货组合汇总
interface SpotPortfolioSummary {
  totalCost: number;                // 总成本（USDT，未减去手续费）
  totalCurrentValue: number;        // 总当前价值（USDT，未减去手续费）
  totalPnlInUSDT: number;           // 总盈亏（USDT，未减去手续费）
  totalFees_USDT: number;           // 手续费（USDT）
  totalFees_Currency: number;       // 手续费（币本位）
  totalFeesInUSDT: number;          // 总手续费（USDT换算）
  positions: SpotValue[];          // 持仓详情数组
}

class SimpleSpotCalculator {
  constructor() {
    // 现货计算器不需要单一价格，每个币种都有独立价格
  }

  /**
   * 计算单个币种的现货持仓价值
   */
  private calculateSpotValue(baseCurrency: string, trades: SpotTrade[], currentPrice: number): SpotValue {
    let totalQuantity = 0;           // 持有数量（未扣除手续费）
    let totalCostUSDT = 0;           // 总成本（USDT，不含手续费）
    let totalFees_USDT = 0;          // 总手续费（USDT）
    let totalFees_Currency = 0;      // 总手续费（币本位）
    let realizedPnlUSDT = 0;         // 已实现盈亏（USDT）
    let totalBuyQuantity = 0;        // 总买入数量
    let totalBuyCost = 0;            // 总买入成本

    // 第一步：处理所有买入交易
    trades.forEach(trade => {
      const { direction, quantity, price, fee } = trade;
      
      if (direction === 'buy') {
        // 买入：数量不扣除手续费，手续费单独记录
        totalQuantity += quantity;
        totalBuyQuantity += quantity;
        
        // 成本计算：支付的USDT（不含手续费）
        const costUSDT = quantity * price;
        totalCostUSDT += costUSDT;
        totalBuyCost += costUSDT;
        
        // 买入手续费只记录币本位
        totalFees_Currency += fee;
      }
    });

    // 第二步：处理所有卖出交易
    trades.forEach(trade => {
      const { direction, quantity, price, fee } = trade;
      
      if (direction === 'sell') {
        // 卖出：按比例减少数量和成本
        if (totalQuantity >= quantity) {
          // 计算卖出比例
          const sellRatio = quantity / totalQuantity;
          const soldCost = totalCostUSDT * sellRatio;
          
          // 计算已实现盈亏：卖出收入 - 卖出成本
          const sellRevenue = quantity * price;
          realizedPnlUSDT += sellRevenue - soldCost;
          
          // 按比例减少数量和成本
          totalQuantity -= quantity;
          totalCostUSDT -= soldCost;
          
          // 卖出手续费只记录USDT本位
          totalFees_USDT += fee;
        }
      }
    });

    // 确保数量不为负数
    totalQuantity = Math.max(0, totalQuantity);
    totalCostUSDT = Math.max(0, totalCostUSDT);
    
    // 计算平均成本价格
    const averageCost = totalQuantity > 0 ? totalCostUSDT / totalQuantity : 0;
    
    // 计算当前价值（数量未扣除手续费）
    const currentValue = totalQuantity * currentPrice;
    
    // 计算未实现盈亏（剩余持仓的盈亏）
    const unrealizedPnlUSDT = currentValue - totalCostUSDT;
    
    // 计算总盈亏：已实现盈亏 + 未实现盈亏
    const PnlInUSDT = realizedPnlUSDT + unrealizedPnlUSDT;
    
    // 计算总手续费USDT价值
    const totalFeesInUSDT = totalFees_USDT + (totalFees_Currency * currentPrice);
    
    return {
      baseCurrency,
      averageCost,
      quantity: totalQuantity,
      totalCost: totalCostUSDT,
      currentValue,
      PnlInUSDT,
      totalFees_USDT,
      totalFees_Currency,
      totalFeesInUSDT
    };
  }

  /**
   * 计算现货组合总价值
   */
  calculatePortfolioValue(tradesBySymbol: Map<string, { trades: SpotTrade[], currentPrice: number }>): SpotPortfolioSummary {
    const positions: SpotValue[] = [];
    let totalCost = 0;
    let totalCurrentValue = 0;
    let totalPnlInUSDT = 0;
    let totalFees_USDT = 0;
    let totalFees_Currency = 0;

    // 计算每个币种的持仓
    tradesBySymbol.forEach(({ trades, currentPrice }, baseCurrency) => {
      const position = this.calculateSpotValue(baseCurrency, trades, currentPrice);
      positions.push(position);
      
      totalCost += position.totalCost;
      totalCurrentValue += position.currentValue;
      totalPnlInUSDT += position.PnlInUSDT;
      totalFees_USDT += position.totalFees_USDT;
      totalFees_Currency += position.totalFees_Currency;
    });
    
    return {
      totalCost,
      totalCurrentValue,
      totalPnlInUSDT,
      totalFees_USDT,
      totalFees_Currency,
      totalFeesInUSDT: positions.reduce((sum, p) => sum + p.totalFeesInUSDT, 0),
      positions
    };
  }

  /**
   * 计算单个币种的现货价值（外部调用接口）
   */
  calculateSpotPosition(baseCurrency: string, trades: SpotTrade[], currentPrice: number): SpotValue {
    return this.calculateSpotValue(baseCurrency, trades, currentPrice);
  }
}

// 导出主要类和接口
export {
  SimpleSpotCalculator
};

export type {
  SpotTrade,
  SpotValue,
  SpotPortfolioSummary
};