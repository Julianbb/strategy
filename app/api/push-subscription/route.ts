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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const subscription = await request.json();

    const existingSubscription = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, session.user.id))
      .limit(1);

    if (existingSubscription.length > 0) {
      
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