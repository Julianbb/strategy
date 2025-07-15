import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, timestamp } = await request.json();
    
    // Log the client message to server console
    console.log(`[CLIENT-LOG] ${timestamp}: ${message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in client-log endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}