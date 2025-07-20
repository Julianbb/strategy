import {Trades} from '@/lib/db/schema'
import { CalculateStrategyMetricsType, StrategyMetricsCalculator } from './strategy-metrics'
import { priceService } from '../price-fetcher/index.server'

export class OptionPerpetualStrategyCalculator implements StrategyMetricsCalculator {
  async calculate(
    strategyChat: any,
    tradesInCurrentStrategy?: Trades[]
  ): Promise<CalculateStrategyMetricsType> {
    // Fetch prices if not provided
    let finalCurrencyPrice = null;
    let finalOptionsPrice = null;
    
    try {
      const optionInstrument = await priceService.getOptionInstrument(strategyChat.id);
      const priceData = await priceService.fetchPriceData(strategyChat.baseCurrency, optionInstrument);
      
      finalCurrencyPrice = priceData.currencyPrice;
      finalOptionsPrice = priceData.optionsPrice;
    } catch (error) {
      console.warn('Failed to fetch prices:', error);
    }
  

    const allocation = this.calculateAllocation(strategyChat, finalCurrencyPrice);
    const { totalFee, totalFee_Currency, totalFee_USD } = this.calculateFees(tradesInCurrentStrategy, finalCurrencyPrice);
    const currentValue = this.calculateCurrentValue(tradesInCurrentStrategy, finalCurrencyPrice, finalOptionsPrice, allocation);
    const profitLoss = currentValue - allocation;
    const apr = this.calculateAPR(strategyChat, allocation, profitLoss);
    const positionSizeOptions = this.calculatePositionSizeOptions(tradesInCurrentStrategy);
    const positionSizePerpetual = this.calculatePositionSizePerpetual(tradesInCurrentStrategy);

    const daysSinceStarted = this.calculateDaysSinceStarted(strategyChat);

    return {
      allocationInUSD: allocation,
      totalFeeInUSD: totalFee,
      totalFee_Currency: totalFee_Currency,
      totalFee_USD: totalFee_USD,
      currentValueInUSD: currentValue,
      profitLossInUSD: profitLoss,
      apr,
      positionSizeOptions,
      positionSizePerpetual,
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

  private calculateFees(tradesInCurrentStrategy?: Trades[], currencyPrice?: number | null) {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0) {
      return { totalFee: 0, totalFee_Currency: 0, totalFee_USD: 0 };
    }
    
    let feeInCurrency = 0;
    let feeInUSD = 0;
    
    for (const trade of tradesInCurrentStrategy) {
      if (trade.feeInCurrency) {
        feeInCurrency += Number(trade.feeInCurrency);
      }
      if (trade.feeInUSD) {
        feeInUSD += Number(trade.feeInUSD);
      }
    }
    
    const totalFeeInUSD = feeInUSD + (currencyPrice ? feeInCurrency * currencyPrice : 0);
    
    return {
      totalFee: totalFeeInUSD,
      totalFee_Currency: feeInCurrency,
      totalFee_USD: feeInUSD
    };
  }

  private calculateCurrentValue(
    tradesInCurrentStrategy?: Trades[],
    currencyPrice?: number | null,
    optionsPrice?: number | null,
    allocation?: number
  ): number {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0) {
      return allocation || 0;
    }

    const positions: Record<string, { totalAmount: number; totalCost: number; avgPrice: number }> = {};
    
    for (const trade of tradesInCurrentStrategy) {
      const key = `${trade.productType}-${trade.side}`;
      
      if (!positions[key]) {
        positions[key] = { totalAmount: 0, totalCost: 0, avgPrice: 0 };
      }
      
      const amount = Number(trade.amount);
      const price = trade.priceInUSD ? Number(trade.priceInUSD) : 
                   (trade.priceInCurrency && currencyPrice ? Number(trade.priceInCurrency) * currencyPrice : 0);
      
      positions[key].totalAmount += trade.side === 'buy' ? amount : -amount;
      positions[key].totalCost += trade.side === 'buy' ? (price * amount) : -(price * amount);
      
      if (positions[key].totalAmount !== 0) {
        positions[key].avgPrice = Math.abs(positions[key].totalCost / positions[key].totalAmount);
      }
    }

    let totalPnL = 0;
    
    for (const [key, position] of Object.entries(positions)) {
      const [productType] = key.split('-');
      
      if (position.totalAmount === 0) continue;
      
      let currentPrice = 0;
      if (productType === 'option' && optionsPrice && currencyPrice) {
        currentPrice = optionsPrice * currencyPrice;
      } else if (productType === 'perpetual' && currencyPrice) {
        currentPrice = currencyPrice;
      } else if (productType === 'spot' && currencyPrice) {
        currentPrice = currencyPrice;
      }
      
      if (currentPrice > 0) {
        const currentValue = position.totalAmount * currentPrice;
        const costBasis = position.totalAmount * position.avgPrice;
        totalPnL += currentValue - costBasis;
      }
    }
    return (allocation || 0) + totalPnL;
  }

  private calculateAPR(strategyChat: any, allocation: number, profitLoss: number): number {
    if (!allocation || !strategyChat.startedAt) {
      return 0;
    }
    
    const startDate = new Date(strategyChat.startedAt);
    const endDate = strategyChat.endedAt ? new Date(strategyChat.endedAt) : new Date();
    
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const yearsDiff = daysDiff / 365.25;
    
    if (allocation <= 0) {
      return 0;
    }
      
    const safeYearsDiff = Math.max(yearsDiff, 1e-8);
    const totalReturn = profitLoss / allocation;
    return (totalReturn / safeYearsDiff) * 100;
  }

  private calculatePositionSizeOptions(tradesInCurrentStrategy?: Trades[]): number {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0) {
      return 0;
    }
    
    const optionTrades = tradesInCurrentStrategy.filter(trade => trade.productType === 'option');
    if (optionTrades.length === 0) {
      return 0;
    }
    
    const firstOptionSide = optionTrades[0].side;
    return optionTrades
      .filter(trade => trade.side === firstOptionSide)
      .reduce((total, trade) => total + Number(trade.amount), 0);
  }

  private calculatePositionSizePerpetual(tradesInCurrentStrategy?: Trades[]): number {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0) {
      return 0;
    }
    
    return tradesInCurrentStrategy
      .filter(trade => trade.productType === 'perpetual')
      .reduce((total, trade) => {
        const amount = Number(trade.amount);
        return total + (trade.side === 'buy' ? amount : -amount);
      }, 0);
  }

  private calculateDaysSinceStarted(strategyChat: any): number {
    const startTime = new Date(strategyChat.startedAt).getTime();
    const endTime = (strategyChat.status === 'completed' || strategyChat.status === 'stopped') && strategyChat.endedAt
      ? new Date(strategyChat.endedAt).getTime()
      : new Date().getTime();
    return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24));
  }
}