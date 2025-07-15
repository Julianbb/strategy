import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { priceAlerts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET() {
  try {
    const activeAlerts = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.isActive, true));

    return NextResponse.json(activeAlerts);
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}