import {Trades} from '@/lib/db/schema'
import { CalculateStrategyMetricsType, StrategyMetricsCalculator } from './strategy-metrics'
import { priceService } from '@/lib/services/price-fetcher/index.server'
import { OptionPortfolioCalculator, OptionTrade, SimplePerpetualCalculator, PerpetualTrade } from './tools'
import { PlatformType } from '@/lib/services/price-fetcher/platforms/types'

export class OptionPerpetualStrategyCalculator implements StrategyMetricsCalculator {
  async calculate(
    strategyChat: any,
    tradesInCurrentStrategy?: Trades[]
  ): Promise<CalculateStrategyMetricsType> {

    // Fetch prices if not provided
    let finalCurrencyPrice = null;
    // If strategy is completed or stopped, use last known price from strategyChat
    if (strategyChat.status === 'completed' || strategyChat.status === 'stopped') {
      finalCurrencyPrice = strategyChat.lastBaseCurrencyPrice;
    }
    else{
      // const optionInstrument = await priceService.getOptionInstrument(strategyChat.id);
      const priceData = await priceService.fetchPriceData(PlatformType.OKX, strategyChat.baseCurrency);
      finalCurrencyPrice = priceData.currencyPrice;
    }

    const allocation = this.calculateAllocation(strategyChat, finalCurrencyPrice);
    const daysSinceStarted = this.calculateDaysSinceStarted(strategyChat);
    
    // Use new calculation tools for P&L and fees
    const { totalPL, totalFees } = await this.calculateValueWithTools(
      tradesInCurrentStrategy, 
      finalCurrencyPrice || 0
    );
    
    const profitLoss = totalPL - totalFees;
    const apr = this.calculateAPR(strategyChat, allocation, profitLoss, finalCurrencyPrice || 0);
      

    return {
      allocationInUSD: allocation,
      totalFeeInUSD: totalFees,
      currentValueInUSD: profitLoss + allocation, // Add initial allocation
      profitLossInUSD: profitLoss,
      apr,
      daysSinceStarted,
    };
  }


    
 

   
  

  private calculateAllocation(strategyChat: any, currencyPrice: number | null): number {
    const currencyValue = (currencyPrice && strategyChat.initialCapital_Currency) 
      ? Number(strategyChat.initialCapital_Currency) * currencyPrice 
      : 0;
    const usdValue = strategyChat.initialCapital_USD ? Number(strategyChat.initialCapital_USD) : 0;
    return currencyValue + usdValue;
  }


  // 剔除ETH价格波动的影响，突出策略本身的表现
  private calculateAPR(strategyChat: any, allocation: number, profitLoss: number, currentPrice: number): number {
    if (!allocation || !strategyChat.startedAt) {
      return 0;
    }
    
    const startDate = new Date(strategyChat.startedAt);
    const endDate = strategyChat.endedAt ? new Date(strategyChat.endedAt) : new Date();
    
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const yearsDiff = daysDiff / 365.25;
    
    if (allocation <= 0 || daysDiff <= 0) {
      return 0;
    }
      
    const safeYearsDiff = Math.max(yearsDiff, 1e-8);
    
    // 计算总APR
    const totalReturn = profitLoss / allocation;
    const totalAPR = (totalReturn / safeYearsDiff) * 100;
    
    // 计算基准收益率（ETH价格波动）
    const initialPrice = strategyChat.initialBaseCurrencyPrice;
    const finalPrice = currentPrice;
    
    if (initialPrice && finalPrice && initialPrice > 0) {
      const priceRatio = finalPrice / initialPrice;
      const benchmarkReturn = Math.pow(priceRatio, 365 / daysDiff) - 1;
      const benchmarkAPR = benchmarkReturn * 100;
      
      // 最终策略APR = 总APR - 基准收益率
      return totalAPR - benchmarkAPR;
    }
    
    return totalAPR;
  }


  private calculateDaysSinceStarted(strategyChat: any): number {
    const startTime = new Date(strategyChat.startedAt).getTime();
    const endTime = (strategyChat.status === 'completed' || strategyChat.status === 'stopped') && strategyChat.endedAt
      ? new Date(strategyChat.endedAt).getTime()
      : new Date().getTime();
    return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24));
  }

  // 使用新的计算工具计算价值和手续费
  private async calculateValueWithTools(
    tradesInCurrentStrategy?: Trades[],
    currentPrice: number = 0
  ): Promise<{ totalPL: number; totalFees: number }> {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0 || currentPrice <= 0) {
      return { totalPL: 0, totalFees: 0 };
    }

    let totalPnL = 0;
    let totalFees = 0;

    // 分离期权和永续合约交易
    const optionTrades: OptionTrade[] = [];
    const perpetualTrades: PerpetualTrade[] = [];

    for (const trade of tradesInCurrentStrategy) {
      if (trade.productType === 'option' && trade.optionType) {
        // 转换为期权交易格式 - 注意：需要从产品名称或其他字段获取执行价和到期日
        // 这里假设product字段包含期权信息，实际使用时需要根据具体格式调整
        const [, strikeStr, expiryStr] = trade.product.match(/(\d+)-(.+)/) || ['', '0', '2024-12-31'];
        
        optionTrades.push({
          type: trade.optionType as 'call' | 'put',
          direction: trade.side as 'buy' | 'sell',
          quantity: Number(trade.amount),
          strike: Number(strikeStr || 3000), // 默认执行价
          expiry: expiryStr || '2024-12-31', // 默认到期日
          premium: trade.priceInCurrency ? Number(trade.priceInCurrency) : 0,
          tradeDate: trade.createdAt?.toISOString(),
          fee: trade.feeInCurrency ? Number(trade.feeInCurrency) : 0
        });
      } else if (trade.productType === 'perpetual' || trade.productType === 'spot') {
        // 转换为永续合约交易格式
        perpetualTrades.push({
          direction: trade.side === 'buy' ? 'long' : 'short',
          size: Number(trade.amount),
          entryPrice: trade.priceInUSD ? Number(trade.priceInUSD) : 
                     (trade.priceInCurrency ? Number(trade.priceInCurrency) * currentPrice : 0),
          fee: trade.feeInUSD ? Number(trade.feeInUSD) : 
               (trade.feeInCurrency ? Number(trade.feeInCurrency) * currentPrice : 0),
          tradeDate: trade.createdAt?.toISOString()
        });
      }
    }

    // 计算期权P&L
    if (optionTrades.length > 0) {
      // 从strategyChat获取基础货币，默认为ETH
      const baseCurrency = tradesInCurrentStrategy?.[0]?.product?.split('-')?.[0] || 'ETH';
      const optionCalculator = new OptionPortfolioCalculator(currentPrice, baseCurrency);
      const optionSummary = await optionCalculator.calculatePortfolioValue(optionTrades);
      totalPnL += optionSummary.totalPnlUsdt; // P&L未扣除手续费
      totalFees += optionSummary.totalFeesUsdt;
    }

    // 计算永续合约P&L
    if (perpetualTrades.length > 0) {
      const perpetualCalculator = new SimplePerpetualCalculator(currentPrice);
      const perpetualSummary = perpetualCalculator.calculatePortfolioValue(perpetualTrades);
      totalPnL += perpetualSummary.totalUnrealizedPnl; // P&L未扣除手续费
      totalFees += perpetualSummary.totalFees;
    }

    return {
      totalPL: totalPnL, // 返回的是净P&L，不包括初始投资
      totalFees
    };
  }
}