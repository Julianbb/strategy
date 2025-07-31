import { NextRequest, NextResponse } from 'next/server';
import { getAllActivePriceAlerts, updatePriceAlert } from '@/lib/db/queries';
import { priceService } from '@/lib/services/price-fetcher';

export async function POST(request: NextRequest) {
  try {
    // Get all active price alerts from all users
    const activeAlerts = await getAllActivePriceAlerts();
    let checkedAlerts = 0;
    let triggeredAlerts = 0;


    for (const alert of activeAlerts) {
      try {
        checkedAlerts++;
        
        // Get current price
        const priceResult = await priceService.fetchSpotPrice(alert.coin);
        if (priceResult.error || priceResult.price === null) {
          console.warn(`Failed to fetch price for ${alert.coin}: ${priceResult.error || 'No price data'}`);
          continue;
        }
        
        const currentPrice = priceResult.price;

        const targetPrice = parseFloat(alert.targetPrice);
        const shouldTrigger = 
          (alert.condition === 'above' && currentPrice >= targetPrice) ||
          (alert.condition === 'below' && currentPrice <= targetPrice);

        if (shouldTrigger) {

          // Send push notification directly using the push service
          try {
            const { sendPriceAlertNotification } = await import('@/lib/services/push-notifications');
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