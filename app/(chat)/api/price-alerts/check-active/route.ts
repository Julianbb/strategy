import { NextRequest, NextResponse } from 'next/server';
import { getAllActivePriceAlerts } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const activeAlerts = await getAllActivePriceAlerts();
    return NextResponse.json(activeAlerts);
  } catch (error) {
    console.error('Error fetching active price alerts:', error);
    
    if (error instanceof ChatSDKError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}