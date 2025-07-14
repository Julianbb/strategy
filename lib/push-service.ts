import webpush from 'web-push';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

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
  try {
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return false;
    }

    const pushPromises = subscriptions.map(async (subscription: typeof pushSubscriptions.$inferSelect) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        console.log('Push notification sent successfully to:', subscription.endpoint);
        return true;
      } catch (error) {
        console.error('Error sending push notification:', error);
        
        if (error instanceof Error && error.message.includes('410')) {
          console.log('Subscription expired, removing from database');
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

    return successCount > 0;
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
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