import { NextRequest, NextResponse } from 'next/server';
import { getAllActivePriceAlerts, updatePriceAlert } from '@/lib/db/queries';
import { fetchSpotPrice } from '@/lib/3party/okxapi';

export async function POST(request: NextRequest) {
  try {
    console.log(`[${new Date().toISOString()}] Starting price alert monitoring...`);
    console.log(`[${new Date().toISOString()}] Request URL: ${request.url}`);
    console.log(`[${new Date().toISOString()}] Request method: ${request.method}`);

    // Get all active price alerts from all users
    const activeAlerts = await getAllActivePriceAlerts();
    let checkedAlerts = 0;
    let triggeredAlerts = 0;

    console.log(`[${new Date().toISOString()}] Found ${activeAlerts.length} active alerts to check`);

    for (const alert of activeAlerts) {
      try {
        checkedAlerts++;
        
        // Get current price
        const currentPrice = await fetchSpotPrice(alert.coin);
        if (currentPrice === null) {
          console.warn(`Failed to fetch price for ${alert.coin}`);
          continue;
        }

        const targetPrice = parseFloat(alert.targetPrice);
        const shouldTrigger = 
          (alert.condition === 'above' && currentPrice >= targetPrice) ||
          (alert.condition === 'below' && currentPrice <= targetPrice);

        if (shouldTrigger) {
          console.log(`[${new Date().toISOString()}] Alert triggered for ${alert.coin}: ${currentPrice} ${alert.condition} ${targetPrice}`);
          
          // Send push notification directly using the push service
          try {
            const { sendPriceAlertNotification } = await import('@/lib/push-service');
            const notificationSent = await sendPriceAlertNotification(
              alert.userId,
              alert.coin,
              currentPrice,
              targetPrice,
              alert.condition
            );
            
            if (notificationSent) {
              console.log(`✅ Push notification sent successfully for ${alert.coin} alert`);
            } else {
              console.log(`❌ Failed to send push notification for ${alert.coin} alert`);
            }
          } catch (error) {
            console.error('Failed to send push notification:', error);
          }

          // Update alert in database
          await updatePriceAlert({
            id: alert.id,
            currentPrice: currentPrice.toString(),
            isActive: false,
            triggeredAt: new Date()
          });

          triggeredAlerts++;
        } else {
          // Just update the current price
          await updatePriceAlert({
            id: alert.id,
            currentPrice: currentPrice.toString()
          });
        }

        // Add small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
      }
    }

    console.log(`[${new Date().toISOString()}] Price alert monitoring completed`);

    return NextResponse.json({
      status: 'success',
      checkedAlerts,
      triggeredAlerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Price alert monitoring failed:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}