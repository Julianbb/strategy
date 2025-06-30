import {Trades} from '@/lib/db/schema'

export interface CalculateStrategyMetricsType{
  allocationInUSD: number;
  totalFeeInUSD: number;
  totalFee_Currency:number;
  totalFee_USD:number;
  currentValueInUSD: number;
  profitLossInUSD: number;
  apr: number;
  positionSizeOptions: number;
  positionSizePerpetual: number;
}

export function calculateStrategyMetrics(
  strategyChat: any,
  currencyPrice: number | null,
  optionsPrice?: number | null,
  tradesInCurrentStrategy?: Trades[]
): CalculateStrategyMetricsType {
  const allocation = (() => {
    const currencyValue = (currencyPrice && strategyChat.initialCapital_Currency) 
      ? Number(strategyChat.initialCapital_Currency) * currencyPrice 
      : 0;
    const usdValue = strategyChat.initialCapital_USD ? Number(strategyChat.initialCapital_USD) : 0;
    return currencyValue + usdValue;
  })();

  const { totalFee, totalFee_Currency, totalFee_USD } = (() => {
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
  })();

  const currentValue = (() => {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0) {
      return allocation;
    }

    // Aggregate positions by productType and direction
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
    
    // Calculate PnL for each position type
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
    return allocation + totalPnL;
  })();

  const profitLoss = currentValue - allocation;

  const apr = (() => {
    if (!allocation || !strategyChat.startedAt) {
      return 0;
    }
    
    const startDate = new Date(strategyChat.startedAt);
    const endDate = strategyChat.endedAt ? new Date(strategyChat.endedAt) : new Date();
    
    
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const yearsDiff = daysDiff / 365.25;
    
    
    if ( allocation <= 0) {
      return 0;
    }
    if (allocation <= 0) {
        return 0;
      }
      
    const safeYearsDiff = Math.max(yearsDiff, 1e-8);
    
      
    
    const totalReturn = profitLoss / allocation;
    return (totalReturn / safeYearsDiff) * 100;
  })();

  const positionSizeOptions = (() => {
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
  })();

  const positionSizePerpetual = (() => {
    if (!tradesInCurrentStrategy || tradesInCurrentStrategy.length === 0) {
      return 0;
    }
    
    return tradesInCurrentStrategy
      .filter(trade => trade.productType === 'perpetual')
      .reduce((total, trade) => {
        const amount = Number(trade.amount);
        return total + (trade.side === 'buy' ? amount : -amount);
      }, 0);
  })();

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
  };
}