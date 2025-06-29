export function calculateStrategyMetrics(
  strategyChat: any,
  currencyPrice: number | null,
  optionsPrice?: number | null
) {
  const allocation = (() => {
    const currencyValue = (currencyPrice && strategyChat.initialCapital_Currency) 
      ? Number(strategyChat.initialCapital_Currency) * currencyPrice 
      : 0;
    const usdValue = strategyChat.initialCapital_USD ? Number(strategyChat.initialCapital_USD) : 0;
    return currencyValue + usdValue;
  })();

  const totalCost = (() => {
    const currencyValue = (currencyPrice && strategyChat.totalCost_Currency) 
      ? Number(strategyChat.totalCost_Currency) * currencyPrice 
      : 0;
    const usdValue = strategyChat.totalCost_USD ? Number(strategyChat.totalCost_USD) : 0;
    return currencyValue + usdValue;
  })();

  const currentValue = (() => {
    const optionsPnL = (optionsPrice && currencyPrice && strategyChat.averagePrice_Options_Currency && strategyChat.positionSize_Options)
      ? Number(optionsPrice - strategyChat.averagePrice_Options_Currency) * currencyPrice * Number(strategyChat.positionSize_Options)
      : 0;
    const perpetualPnL = (currencyPrice && strategyChat.averagePrice_Perpetual_USD && strategyChat.positionSize_Perpetual)
      ? (currencyPrice - Number(strategyChat.averagePrice_Perpetual_USD) ) * Number(strategyChat.positionSize_Perpetual)
      : 0;

    return allocation + optionsPnL + perpetualPnL;
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

  return {
    allocationInUSD: allocation,
    totalCostInUSD: totalCost,
    currentValueInUSD: currentValue,
    profitLossInUSD: profitLoss,
    apr
  };
}