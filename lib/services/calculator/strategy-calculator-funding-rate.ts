import {Trades} from '@/lib/db/schema'
import { CalculateStrategyMetricsType, StrategyMetricsCalculator } from './strategy-metrics'

export class FundingRateStrategyCalculator implements StrategyMetricsCalculator {
  async calculate(
    strategyChat: any,
    tradesInCurrentStrategy?: Trades[]
  ): Promise<CalculateStrategyMetricsType> {
    // Funding rate strategy implementation - to be filled with specific logic for this strategy type
    return {
      allocationInUSD: 0,
      totalFeeInUSD: 0,
      totalFee_Currency: 0,
      totalFee_USD: 0,
      currentValueInUSD: 0,
      profitLossInUSD: 0,
      apr: 0,
      positionSizeOptions: 0,
      positionSizePerpetual: 0,
      daysSinceStarted: 0,
    };
  }
}