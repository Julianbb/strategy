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