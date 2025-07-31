import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { priceAlerts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { priceService } from '@/lib/services/price-fetcher';
import { sendPriceAlertNotification } from '@/lib/services/push-notifications/index.server';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coin = searchParams.get('coin');
    const alertId = searchParams.get('alertId');

    if (!coin || !alertId) {
      return NextResponse.json({ error: 'Missing coin or alertId' }, { status: 400 });
    }

    // Get the alert details
    const alert = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.id, alertId))
      .limit(1);

    if (alert.length === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const alertData = alert[0];

    // Check if alert is still active
    if (!alertData.isActive) {
      return NextResponse.json({ triggered: false, message: 'Alert is inactive' });
    }

    // Fetch current price
    const priceResult = await priceService.fetchSpotPrice(coin);
    if (priceResult.error || priceResult.price === null) {
      return NextResponse.json({ error: priceResult.error || 'Failed to fetch current price' }, { status: 500 });
    }
    
    const currentPrice = priceResult.price;

    // Check if alert should be triggered
    const targetPrice = parseFloat(alertData.targetPrice);
    const shouldTrigger = 
      (alertData.condition === 'above' && currentPrice >= targetPrice) ||
      (alertData.condition === 'below' && currentPrice <= targetPrice);

    if (shouldTrigger) {
      // Send push notification
      console.log('📱 Triggering price alert notification...');
      await sendPriceAlertNotification(
        alertData.userId,
        coin,
        currentPrice,
        targetPrice,
        alertData.condition
      );

      // Update alert to inactive and set triggered timestamp
      await db
        .update(priceAlerts)
        .set({
          isActive: false,
          currentPrice: currentPrice.toString(),
          triggeredAt: new Date()
        })
        .where(eq(priceAlerts.id, alertId));

      return NextResponse.json({ 
        triggered: true, 
        currentPrice, 
        targetPrice, 
        condition: alertData.condition 
      });
    }

    // Update current price
    await db
      .update(priceAlerts)
      .set({
        currentPrice: currentPrice.toString()
      })
      .where(eq(priceAlerts.id, alertId));

    return NextResponse.json({ 
      triggered: false, 
      currentPrice, 
      targetPrice, 
      condition: alertData.condition 
    });
  } catch (error) {
    console.error('Error checking price:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}