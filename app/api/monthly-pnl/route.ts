import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, eq, gte, lt, desc } from 'drizzle-orm';
import { 
  strategyChat, 
  strategySnapshot, 
  strategyMonthlyPnL,
  type StrategyChat
} from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

interface MonthlyPnLData {
  strategyChatId: string;
  year: number;
  monthlyProfitLoss: number[];
}

/**
 * Calculate monthly P&L for a specific strategy
 * Each month's P&L is calculated independently, not cumulative
 */
async function calculateMonthlyPnL(strategy: StrategyChat): Promise<MonthlyPnLData | null> {
  try {
    const startDate = new Date(strategy.startedAt);
    const now = new Date();
    const endDate = strategy.endedAt ? new Date(strategy.endedAt) : now;
    const currentYear = now.getFullYear();
    
    // Initialize monthly array with 12 zeros [Jan, Feb, ..., Dec]
    const monthlyPnL: number[] = new Array(12).fill(0);
    
    // Calculate for each month from start to end
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();


    
    // For now, focus on current year only
    if (startYear > currentYear || endYear < currentYear) {
      return null;
    }
    
    const yearStartMonth = startYear === currentYear ? startMonth : 0;
    // For active strategies (endDate is null), use current month; for completed strategies, use actual end month
    const yearEndMonth = endYear === currentYear ? endMonth : 11;
    
    for (let monthIndex = yearStartMonth; monthIndex <= yearEndMonth; monthIndex++) {
      // Use UTC to avoid timezone issues
      const monthStart = new Date(Date.UTC(currentYear, monthIndex, 1));
      const monthEnd = new Date(Date.UTC(currentYear, monthIndex + 1, 1) - 1); // Last millisecond of the month
      
      // Get last snapshot of current month
      const [currentMonthSnapshot] = await db
        .select()
        .from(strategySnapshot)
        .where(
          and(
            eq(strategySnapshot.strategyChatId, strategy.id),
            gte(strategySnapshot.timestamp, monthStart),
            lt(strategySnapshot.timestamp, monthEnd)
          )
        )
        .orderBy(desc(strategySnapshot.timestamp))
        .limit(1);
      
      if (!currentMonthSnapshot?.profitLossInUSD) {
        continue;
      }
      
      const currentPnL = Number(currentMonthSnapshot.profitLossInUSD);
      
      // Always calculate month P&L as: current month end - previous month end
      // For the first month, previous month end is 0 (strategy didn't exist)
      
      if (monthIndex === yearStartMonth) {
        // First month: P&L from strategy start to end of first month
        monthlyPnL[monthIndex] = currentPnL;
      } else {
        // Get last snapshot of previous month
        const prevMonthStart = new Date(Date.UTC(currentYear, monthIndex - 1, 1));
        const prevMonthEnd = new Date(Date.UTC(currentYear, monthIndex, 1) - 1);
        
        const [prevMonthSnapshot] = await db
          .select()
          .from(strategySnapshot)
          .where(
            and(
              eq(strategySnapshot.strategyChatId, strategy.id),
              gte(strategySnapshot.timestamp, prevMonthStart),
              lt(strategySnapshot.timestamp, prevMonthEnd)
            )
          )
          .orderBy(desc(strategySnapshot.timestamp))
          .limit(1);
        
        const prevPnL = prevMonthSnapshot?.profitLossInUSD ? Number(prevMonthSnapshot.profitLossInUSD) : 0;
        
        // Current month P&L = Current Total - Previous Total
        const monthlyDiff = currentPnL - prevPnL;
        monthlyPnL[monthIndex] = monthlyDiff;
      }
    }
    
    return {
      strategyChatId: strategy.id,
      year: currentYear,
      monthlyProfitLoss: monthlyPnL
    };
  } catch (error) {
    console.error(`Error calculating monthly P&L for strategy ${strategy.id}:`, error);
    return null;
  }
}

/**
 * Update or insert monthly P&L record for a strategy
 */
async function upsertMonthlyPnL(data: MonthlyPnLData): Promise<void> {
  try {
    // Check if record exists for this strategy and year
    const [existingRecord] = await db
      .select()
      .from(strategyMonthlyPnL)
      .where(
        and(
          eq(strategyMonthlyPnL.strategyChatId, data.strategyChatId),
          eq(strategyMonthlyPnL.year, data.year.toString())
        )
      )
      .limit(1);
    
    if (existingRecord) {
      // Update existing record
      await db
        .update(strategyMonthlyPnL)
        .set({
          monthlyProfitLoss: JSON.stringify(data.monthlyProfitLoss),
          updatedAt: new Date()
        })
        .where(eq(strategyMonthlyPnL.id, existingRecord.id));
      
    } else {
      // Insert new record
      await db
        .insert(strategyMonthlyPnL)
        .values({
          strategyChatId: data.strategyChatId,
          year: data.year.toString(),
          monthlyProfitLoss: JSON.stringify(data.monthlyProfitLoss),
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }
  } catch (error) {
    console.error(`Error upserting monthly P&L for strategy ${data.strategyChatId}:`, error);
    throw error;
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const currentYear = new Date().getFullYear();
    
    // Get monthly P&L data for current year, filtered by user
    const currentYearMonthlyPnL = await db
      .select({
        id: strategyMonthlyPnL.id,
        strategyChatId: strategyMonthlyPnL.strategyChatId,
        year: strategyMonthlyPnL.year,
        monthlyProfitLoss: strategyMonthlyPnL.monthlyProfitLoss,
        createdAt: strategyMonthlyPnL.createdAt,
        updatedAt: strategyMonthlyPnL.updatedAt,
      })
      .from(strategyMonthlyPnL)
      .innerJoin(strategyChat, eq(strategyMonthlyPnL.strategyChatId, strategyChat.id))
      .where(
        and(
          eq(strategyMonthlyPnL.year, currentYear.toString()),
          eq(strategyChat.userId, session.user.id)
        )
      );

    // Transform the data to include parsed monthly P&L
    const transformedData = currentYearMonthlyPnL.map(record => {
      let monthlyProfitLoss;
      
      // Check if it's already an object/array
      if (typeof record.monthlyProfitLoss === 'object' && record.monthlyProfitLoss !== null) {
        monthlyProfitLoss = record.monthlyProfitLoss;
      } else if (typeof record.monthlyProfitLoss === 'string') {
        try {
          monthlyProfitLoss = JSON.parse(record.monthlyProfitLoss);
        } catch (parseError) {
          // Fallback to empty array if JSON is invalid
          monthlyProfitLoss = new Array(12).fill(0);
        }
      } else {
        monthlyProfitLoss = new Array(12).fill(0);
      }
      
      return {
        ...record,
        monthlyProfitLoss
      };
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch monthly P&L data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Get all active strategies
    const activeStrategies = await db
      .select()
      .from(strategyChat)
      .where(eq(strategyChat.status, 'active'));
    
    let processed = 0;
    let errors = 0;
    const results = [];
    
    for (const strategy of activeStrategies) {
      try {
        const monthlyData = await calculateMonthlyPnL(strategy);
        
        if (monthlyData) {
          await upsertMonthlyPnL(monthlyData);
          processed++;
          results.push({
            strategyId: strategy.id,
            strategyName: strategy.strategyName,
            year: monthlyData.year,
            monthlyPnL: monthlyData.monthlyProfitLoss
          });
        } else {
          results.push({
            strategyId: strategy.id,
            strategyName: strategy.strategyName,
            skipped: 'No data for current year'
          });
        }
      } catch (error) {
        errors++;
        results.push({
          strategyId: strategy.id,
          error: 'Failed to process strategy',
        });
      }
    }
    
    const response = {
      status: 'success',
      processedStrategies: activeStrategies.length,
      processed,
      errors,
      results,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to calculate monthly P&L',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}