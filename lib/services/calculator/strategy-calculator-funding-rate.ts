import {Trades} from '@/lib/db/schema'
import { CalculateStrategyMetricsType, StrategyMetricsCalculator } from './strategy-metrics'
import { priceService } from '@/lib/services/price-fetcher'
import { PlatformType } from '@/lib/3party/adapter/types'
import { updateStrategyChatStatus } from '@/lib/db/queries'
import { createCalculatorManager } from './tools'
import { HyperliquidAdapter } from '@/lib/3party'

export class FundingRateStrategyCalculator implements StrategyMetricsCalculator {

  async calculate(
    strategyChat: any,
    tradesInCurrentStrategy?: Trades[]
  ): Promise<CalculateStrategyMetricsType> {
    
    // Fetch prices if not provided
    let finalCurrencyPrice = null;
    // If strategy is completed or stopped, use last known price from strategyChat
    if ((strategyChat.status === 'completed' || strategyChat.status === 'stopped') && (strategyChat.lastBaseCurrencyPrice > 0)) {
        finalCurrencyPrice = strategyChat.lastBaseCurrencyPrice;
    } else {
      const priceData = await priceService.fetchPriceData(PlatformType.OKX, strategyChat.baseCurrency);
      finalCurrencyPrice = priceData.currencyPrice;
    }

    const allocation = this.calculateAllocation(strategyChat, finalCurrencyPrice);
    const daysSinceStarted = this.calculateDaysSinceStarted(strategyChat);

    // Use calculator manager for P&L and fees calculation
    const { totalPLInUSDT, totalFeesInUSDT,PnL_Currency, Fees_Currency, PnL_USDT, Fees_USDT } = await this.calculateValueWithTools(
      tradesInCurrentStrategy, 
      finalCurrencyPrice || 0,
      strategyChat
    );

    // Calculate funding rate PnL using Hyperliquid adapter
    const FundingRatePnLInUSDT = await this.calculateFundingRatePnL(strategyChat);

    const profitLossInUSD = totalPLInUSDT - FundingRatePnLInUSDT - totalFeesInUSDT;
    const apr = this.calculateAPR(strategyChat, allocation, profitLossInUSD, finalCurrencyPrice || 0);
    
    const lastCapital_USD = Number(strategyChat.initialCapital_USD || 0) + PnL_USDT - Fees_USDT 
    const lastCapital_Currency = Number(strategyChat.initialCapital_Currency || 0) + PnL_Currency - Fees_Currency

    if(strategyChat.status === 'completed' || strategyChat.status === 'stopped') {
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
      totalFeeInUSD: totalFeesInUSDT,
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
    totalPLInUSDT: number; 
    totalFeesInUSDT: number;
    PnL_Currency:number;
    Fees_Currency:number;
    PnL_USDT:number;
    Fees_USDT:number
  }> {

    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0 || currentPrice <= 0) {
      return { totalPLInUSDT: 0, totalFeesInUSDT: 0, PnL_Currency:0,Fees_Currency:0, PnL_USDT:0,Fees_USDT:0};
    }

    // 从strategyChat或交易数据获取基础货币
    const baseCurrency = strategyChat?.baseCurrency || 
                        tradesInCurrentStrategy[0]?.product?.split('-')?.[0] || 
                        'ETH';
    
    // 创建计算器管理器
    const calculatorManager = createCalculatorManager({
      spotPrice: currentPrice,
      baseCurrency,
      currentDate: new Date(),
      preferredPlatform: PlatformType.OKX
    });

    // 转换交易数据为统一格式
    const unifiedTrades = calculatorManager.convertTradesToUnifiedFormat(tradesInCurrentStrategy);

    // 使用计算器管理器批量计算
    const result = await calculatorManager.calculateMixedPortfolio(unifiedTrades);   
    

    //spot和perpetual的盈利都是U本位，但手续费只有spot有币本位，perpetual都是U本位
    const PnL_USDT = (result.perpetualSummary?.totalUnrealizedPnlInUSDT || 0)+ (result.spotSummary?.totalPnlInUSDT || 0);
    const Fees_USDT = (result.perpetualSummary?.totalFees_USDT || 0) + (result.spotSummary?.totalFees_USDT || 0);
    const Fees_Currency =(result.spotSummary?.totalFees_Currency || 0)
    
    return {
      totalPLInUSDT: result.totalPnLInUSDT,
      totalFeesInUSDT: result.totalFeesInUSDT,
      PnL_Currency:0,
      Fees_Currency,
      PnL_USDT,
      Fees_USDT
    };
  }

  // 计算Funding Rate盈亏
  private async calculateFundingRatePnL(strategyChat: any): Promise<number> {
    try {
      if (!strategyChat || !strategyChat.baseCurrency) {
        return 0;
      }

      // 获取基础货币和用户地址
      const baseCurrency = strategyChat.baseCurrency;
      const userAddress = process.env.HYPERLIQUID_USER_ADDRESS!;

      // 创建Hyperliquid适配器并调用getFunding
      const hyperliquidAdapter = new HyperliquidAdapter();
      const fundingFee = await hyperliquidAdapter.getFunding(baseCurrency, userAddress);

      // Funding fee是成本，所以返回负值表示损失
      return fundingFee;
    } catch (error) {
      console.error('Error calculating funding rate PnL:', error);
      return 0;
    }
  }
}