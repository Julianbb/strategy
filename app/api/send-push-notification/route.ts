import { NextRequest, NextResponse } from 'next/server';
import { sendPriceAlertNotification } from '@/lib/push-service';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  console.log('=== SEND PUSH NOTIFICATION API ===');
  console.log('POST request received at /api/send-push-notification');
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ Unauthorized: No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);
    const { coin, currentPrice, targetPrice, condition } = await request.json();
    console.log('Request payload:', { coin, currentPrice, targetPrice, condition });

    if (!coin || !currentPrice || !targetPrice || !condition) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📱 Calling sendPriceAlertNotification...');
    const success = await sendPriceAlertNotification(
      session.user.id,
      coin,
      currentPrice,
      targetPrice,
      condition
    );

    if (success) {
      console.log('✅ Push notification sent successfully');
      return NextResponse.json({ success: true, message: 'Push notification sent' });
    } else {
      console.log('❌ Failed to send push notification');
      return NextResponse.json({ success: false, message: 'Failed to send push notification' });
    }
  } catch (error) {
    console.error('❌ Critical error in send-push-notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}