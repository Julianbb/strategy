import { NextRequest, NextResponse } from 'next/server'
import { calculateStrategyMetrics } from '@/lib/services/calculator/strategy-metrics-service'

export async function POST(request: NextRequest) {
  try {
    const { strategyChat, tradesInCurrentStrategy } = await request.json();

    if (!strategyChat) {
      return NextResponse.json(
        { error: 'strategyChat is required' },
        { status: 400 }
      );
    }

    const metrics = await calculateStrategyMetrics(strategyChat, tradesInCurrentStrategy);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Strategy metrics API error:', error);
    return NextResponse.json(
      { 
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
        error: error instanceof Error ? error.message : 'Failed to calculate metrics'
      },
      { status: 500 }
    );
  }
}