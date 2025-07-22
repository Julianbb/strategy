import {Trades} from '@/lib/db/schema'

export interface CalculateStrategyMetricsType{
  allocationInUSD: number;
  totalFeeInUSD: number;
  currentValueInUSD: number;
  profitLossInUSD: number;
  apr: number;
  daysSinceStarted: number;
}

export interface StrategyMetricsCalculator {
  calculate(
    strategyChat: any,
    tradesInCurrentStrategy?: Trades[]
  ): Promise<CalculateStrategyMetricsType>;
}

export interface StrategyMetricsCalculatorFactory {
  getCalculator(strategyType: string): StrategyMetricsCalculator;
}