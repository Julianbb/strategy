import {Trades} from '@/lib/db/schema'
import { strategyMetricsFactory } from './strategy-metrics-factory'
import { CalculateStrategyMetricsType } from './strategy-metrics'

export async function calculateStrategyMetrics(
  strategyChat: any,
  tradesInCurrentStrategy?: Trades[],
): Promise<CalculateStrategyMetricsType> {
  const type = strategyChat.strategyTypeId;
  const calculator = strategyMetricsFactory.getCalculator(type);
  return await calculator.calculate(strategyChat, tradesInCurrentStrategy);
} 