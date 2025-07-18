import { NextRequest, NextResponse } from 'next/server';
import { calculateStrategyMetrics } from '@/lib/calculation/strategy_summary';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { strategyChat, trades, strategySnapshot } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { fetchPrices,fetchSpotPrice } from '@/lib/3party/okxapi';
import { getStrategySnapshots, getLatestOptionInstrument } from '@/lib/db/queries';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);



export async function GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const strategyChatId = searchParams.get('strategyChatId');
      const daysBack = searchParams.get('daysBack');
      const limit = searchParams.get('limit');
  
      if (!strategyChatId) {
        return NextResponse.json(
          { error: 'strategyChatId is required' },
          { status: 400 }
        );
      }
  
      const snapshots = await getStrategySnapshots({
        strategyChatId,
        daysBack: daysBack ? parseInt(daysBack) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
  
      const formattedData = snapshots.map((snapshot) => ({
        date: snapshot.timestamp.toISOString(),
        value: parseFloat(snapshot.currentValueInUSD),
      }));
  
      return NextResponse.json(formattedData);
    } catch (error) {
      console.error('Error fetching strategy snapshots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch strategy snapshots' },
        { status: 500 }
      );
    }
  }




export async function POST() {
  try {
    // Get only active strategies to avoid unnecessary snapshots
    const activeStrategies = await db
      .select()
      .from(strategyChat)
      .where(eq(strategyChat.status, 'active'));

    const results = [];
    
    for (const strategy of activeStrategies) {
      try {
        // Get the latest option instrument for this strategy
        const optionInstrument = await getLatestOptionInstrument({ strategyChatId: strategy.id });
        
        // Get current market prices for this specific strategy
        let spotPrice = null;
        let optionPrice = null;
        
        if (optionInstrument) {
          // Strategy has options - fetch both spot and option prices
          const prices = await fetchPrices(strategy.baseCurrency, optionInstrument);
          spotPrice = prices.spotPrice;
          optionPrice = prices.optionPrice;
        } else {
          // Strategy has no options - only fetch spot price
          spotPrice = await fetchSpotPrice(strategy.baseCurrency);
          optionPrice = null;
        }
        
        // Skip if we couldn't get spot price (required for all strategies)
        if (spotPrice === null) {
          console.warn(`Failed to fetch spot price for strategy ${strategy.id}`);
          results.push({
            strategyId: strategy.id,
            error: 'Failed to fetch spot price',
          });
          continue;
        }

        // Get trades for this strategy
        const strategyTrades = await db
          .select()
          .from(trades)
          .where(eq(trades.strategyChatId, strategy.id));

        // Calculate comprehensive metrics
        const metrics = calculateStrategyMetrics(
          strategy,
          spotPrice,
          optionPrice,
          strategyTrades
        );

        // Insert snapshot with comprehensive data
        await db.insert(strategySnapshot).values({
          strategyChatId: strategy.id,
          timestamp: new Date(),
          currentValueInUSD: metrics.currentValueInUSD.toString(),
        });

        results.push({
          strategyId: strategy.id,
          strategyName: strategy.strategyName,
          currentValue: metrics.currentValueInUSD,
          pnl: metrics.profitLossInUSD,
          apr: metrics.apr,
        });
      } catch (strategyError) {
        console.error(`Error processing strategy ${strategy.id}:`, strategyError);
        results.push({
          strategyId: strategy.id,
          error: 'Failed to process strategy',
        });
      }
    }

    return NextResponse.json({ 
      status: 'success',
      processedStrategies: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Snapshot API error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to create snapshots',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
