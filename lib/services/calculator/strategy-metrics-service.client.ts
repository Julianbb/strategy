import {Trades} from '@/lib/db/schema'
import { CalculateStrategyMetricsType } from './strategy-metrics'

export async function calculateStrategyMetrics(
  strategyChat: any,
  tradesInCurrentStrategy?: Trades[],
): Promise<CalculateStrategyMetricsType> {
  try {
    const response = await fetch('/api/strategy-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategyChat,
        tradesInCurrentStrategy
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to calculate strategy metrics:', error);
    // Return default values on error
    return {
      allocationInUSD: 0,
      totalFeeInUSD: 0,
      totalFee_Currency: 0,
      totalFee_USD: 0,
      currentValueInUSD: 0,
      profitLossInUSD: 0,
      apr: 0,
      // positionSizeOptions: 0,
      // positionSizePerpetual: 0,
      daysSinceStarted: 0,
    };
  }
}