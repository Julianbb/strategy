import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log('Push subscription POST: No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Push subscription POST: User ID:', session.user.id);
    const subscription = await request.json();
    console.log('Push subscription POST: Subscription data:', subscription);
    
    const existingSubscription = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, session.user.id))
      .limit(1);

    if (existingSubscription.length > 0) {
      console.log('Push subscription POST: Updating existing subscription');
      await db
        .update(pushSubscriptions)
        .set({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updatedAt: new Date()
        })
        .where(eq(pushSubscriptions.userId, session.user.id));
    } else {
      console.log('Push subscription POST: Creating new subscription');
      await db
        .insert(pushSubscriptions)
        .values({
          userId: session.user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }

    console.log('Push subscription POST: Successfully saved subscription');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}