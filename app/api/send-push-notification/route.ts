import { NextRequest, NextResponse } from 'next/server';
import { sendPriceAlertNotification } from '@/lib/push-service';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coin, currentPrice, targetPrice, condition } = await request.json();

    if (!coin || !currentPrice || !targetPrice || !condition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await sendPriceAlertNotification(
      session.user.id,
      coin,
      currentPrice,
      targetPrice,
      condition
    );

    if (success) {
      return NextResponse.json({ success: true, message: 'Push notification sent' });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to send push notification' });
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}