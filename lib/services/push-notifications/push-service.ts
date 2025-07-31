import { setVapidDetails, sendNotification } from 'web-push';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

function initializeVapid() {
  const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
  };

  setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  console.log('=== PUSH NOTIFICATION SERVICE ===');
  console.log('sendPushNotification called for userId:', userId);
  console.log('Payload:', JSON.stringify(payload));
  
  initializeVapid();
  
  try {
    console.log('Querying database for push subscriptions...');
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    console.log('Database query result:', subscriptions.length, 'subscriptions found');
    
    if (subscriptions.length === 0) {
      console.log('❌ No push subscriptions found for user:', userId);
      console.log('User needs to enable push notifications first');
      return false;
    }

    console.log('✅ Found', subscriptions.length, 'push subscriptions for user:', userId);

    const pushPromises = subscriptions.map(async (subscription: typeof pushSubscriptions.$inferSelect, index: number) => {
      console.log(`Processing subscription ${index + 1}/${subscriptions.length}:`, subscription.endpoint);
      
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        console.log('Sending push notification to:', subscription.endpoint);
        await sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        console.log('✅ Push notification sent successfully to:', subscription.endpoint);
        return true;
      } catch (error) {
        console.error('❌ Error sending push notification to:', subscription.endpoint, error);
        
        if (error instanceof Error && error.message.includes('410')) {
          console.log('🗑️ Subscription expired, removing from database:', subscription.id);
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, subscription.id));
        }
        
        return false;
      }
    });

    const results = await Promise.allSettled(pushPromises);
    const successCount = results.filter((result: PromiseSettledResult<boolean>) => 
      result.status === 'fulfilled' && result.value
    ).length;

    console.log('Push notification results:', successCount, 'successful out of', subscriptions.length, 'total');
    console.log('=== END PUSH NOTIFICATION SERVICE ===');
    
    return successCount > 0;
  } catch (error) {
    console.error('❌ Critical error in sendPushNotification:', error);
    console.log('=== END PUSH NOTIFICATION SERVICE (ERROR) ===');
    return false;
  }
}

export async function sendPriceAlertNotification(
  userId: string,
  coin: string,
  currentPrice: number,
  targetPrice: number,
  condition: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: `Price Alert: ${coin}`,
    body: `${coin} is now ${condition} $${targetPrice}. Current price: $${currentPrice.toFixed(2)}`,
    icon: '/icons/icon-192x192.png',
    tag: 'price-alert',
    data: {
      coin,
      currentPrice,
      targetPrice,
      condition,
      url: '/dashboard/tools/price-alert'
    }
  };

  return await sendPushNotification(userId, payload);
}