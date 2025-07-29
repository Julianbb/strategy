import {Trades} from '@/lib/db/schema'
import { CalculateStrategyMetricsType, StrategyMetricsCalculator } from './strategy-metrics'
import { priceService } from '@/lib/services/price-fetcher'
import { 
  createCalculatorManager, 
  type UnifiedTrade, 
  type OptionTrade, 
  type PerpetualTrade 
} from './tools'
import { PlatformType } from '@/lib/3party/adapter/types'
import { updateStrategyChatStatus } from '@/lib/db/queries'

export class OptionPerpetualStrategyCalculator implements StrategyMetricsCalculator {
  
  async calculate(
    strategyChat: any,
    tradesInCurrentStrategy?: Trades[]
  ): Promise<CalculateStrategyMetricsType> {

    // Fetch prices if not provided
    let finalCurrencyPrice = null;
    // If strategy is completed or stopped, use last known price from strategyChat
    if ((strategyChat.status === 'completed' || strategyChat.status === 'stopped')&&(strategyChat.lastBaseCurrencyPrice>0)) {
        finalCurrencyPrice = strategyChat.lastBaseCurrencyPrice;
       
    }
    else{
      const priceData = await priceService.fetchPriceData(PlatformType.OKX, strategyChat.baseCurrency);
      finalCurrencyPrice = priceData.currencyPrice;
     
    }
 
    const allocation = this.calculateAllocation(strategyChat, finalCurrencyPrice);
    const daysSinceStarted = this.calculateDaysSinceStarted(strategyChat);


    // console.log("finalCurrencyPrice: "+finalCurrencyPrice)
    // console.log(tradesInCurrentStrategy)
    // Use new calculation tools for P&L and fees
    const { totalPLInUSD, totalFeesInUSD, PnLInCurrency, FeesInCurrency, PnLInUSD, FeesInUSD } = await this.calculateValueWithTools(
      tradesInCurrentStrategy, 
      finalCurrencyPrice || 0,
      strategyChat
    );


    
    const profitLossInUSD = totalPLInUSD - totalFeesInUSD;
    const apr = this.calculateAPR(strategyChat, allocation, profitLossInUSD, finalCurrencyPrice || 0);
    
    const lastCapital_USD = Number(strategyChat.initialCapital_USD || 0) + PnLInUSD - FeesInUSD 
    const lastCapital_Currency = Number(strategyChat.initialCapital_Currency || 0) + PnLInCurrency - FeesInCurrency

 
    if(strategyChat.status === 'completed' || strategyChat.status === 'stopped'){
      // Update last metrics when strategy is completed or stopped
      try {
        await updateStrategyChatStatus({
          id: strategyChat.id,
          status: strategyChat.status,
          last_profit_loss: profitLossInUSD.toString(),
          last_apr: apr.toString(),
          lastBaseCurrencyPrice: finalCurrencyPrice?.toString(),
          lastCapital_USD: lastCapital_USD.toString(),
          lastCapital_Currency: lastCapital_Currency.toString(),
        });
      } catch (error) {
        console.error('Failed to update strategy chat metrics:', error);
      }
    }
    
    return {
      allocationInUSD: allocation,
      totalFeeInUSD: totalFeesInUSD,
      currentValueInUSD: profitLossInUSD + allocation, // Add initial allocation
      profitLossInUSD: profitLossInUSD,
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

  // 使用计算器管理器计算价值和手续费
  private async calculateValueWithTools(
    tradesInCurrentStrategy?: Trades[],
    currentPrice: number = 0,
    strategyChat?: any
  ): Promise<{ 
    totalPLInUSD: number; 
    totalFeesInUSD: number;
    PnLInCurrency:number;
    FeesInCurrency:number;
    PnLInUSD:number;
    FeesInUSD:number
  }> {


    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0 || currentPrice <= 0) {
      return { totalPLInUSD: 0, totalFeesInUSD: 0, PnLInCurrency:0,FeesInCurrency:0, PnLInUSD:0,FeesInUSD:0};
    }
 
    // 从strategyChat或交易数据获取基础货币
    const baseCurrency = strategyChat?.baseCurrency || 
                        tradesInCurrentStrategy[0]?.product?.split('-')?.[0] || 
                        'ETH';
    // console.log("baseCurrency: "+baseCurrency)
    // 创建计算器管理器
    const calculatorManager = createCalculatorManager({
      spotPrice: currentPrice,
      baseCurrency,
      currentDate: new Date(),
      preferredPlatform: PlatformType.OKX
    });

    // 转换交易数据为统一格式
    const unifiedTrades: UnifiedTrade[] = [];

    for (const trade of tradesInCurrentStrategy) {
      if (trade.productType === 'option' && trade.optionType) {
        // 转换为期权交易格式
        // Parse ETHUSD-20250722-3600-P format
        const parts = trade.product.split('-');
        const expiryStr = parts[1] || '20241231'; // YYYYMMDD format
        const strikeStr = parts[2] || '3000';
        
        unifiedTrades.push({
          id:trade.id,
          baseCurrency:strategyChat.baseCurrency,
          type: trade.optionType as 'call' | 'put',
          direction: trade.side as 'buy' | 'sell',
          quantity: Number(trade.amount),
          strike: Number(strikeStr || 3000),
          expiry: expiryStr ? `${expiryStr.slice(0,4)}-${expiryStr.slice(4,6)}-${expiryStr.slice(6,8)}` : '2024-12-31',
          premium: trade.priceInCurrency ? Number(trade.priceInCurrency) : 0,
          tradeDate: trade.createdAt ? new Date(trade.createdAt).toISOString() : new Date().toISOString(),
          fee: trade.feeInCurrency ? Number(trade.feeInCurrency) : 0,
          isExpiry:trade.isExpired,
          deliveryPriceInCurrency:trade.deliveryPriceInCurrency ? Number(trade.deliveryPriceInCurrency) : undefined,
        } as OptionTrade);
      } else if (trade.productType === 'perpetual' || trade.productType === 'spot') {
        // 转换为永续合约交易格式
        unifiedTrades.push({
          id:trade.id,
          baseCurrency:strategyChat.baseCurrency,
          direction: trade.side === 'buy' ? 'long' : 'short',
          size: Number(trade.amount),
          entryPrice: trade.priceInUSD ? Number(trade.priceInUSD) : 
                     (trade.priceInCurrency ? Number(trade.priceInCurrency) * currentPrice : 0),
          fee: trade.feeInUSD ? Number(trade.feeInUSD) : 
               (trade.feeInCurrency ? Number(trade.feeInCurrency) * currentPrice : 0),
          tradeDate: trade.createdAt ? new Date(trade.createdAt).toISOString() : new Date().toISOString()
        } as PerpetualTrade);
      }
    }

    // console.log(unifiedTrades)

    // 使用计算器管理器批量计算
    const result = await calculatorManager.calculateMixedPortfolio(unifiedTrades);
    
    const PnLInCurrency = (result.optionSummary?.totalPnl || 0) 
    const FeesInCurrency =(result.optionSummary?.totalFees || 0)
    const PnLInUSD = (result.perpetualSummary?.totalUnrealizedPnl || 0);
    const FeesInUSD = (result.perpetualSummary?.totalFees || 0);

    return {
      totalPLInUSD: result.totalPnLInUSD,
      totalFeesInUSD: result.totalFeesInUSD,
      PnLInCurrency,
      FeesInCurrency,
      PnLInUSD,
      FeesInUSD
    };
  }
}