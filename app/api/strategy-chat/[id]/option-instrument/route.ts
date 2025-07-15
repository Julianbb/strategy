import { getLatestOptionInstrument } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const instrument = await getLatestOptionInstrument({ strategyChatId: id });
    
    return NextResponse.json({ instrument });
  } catch (error) {
    console.error('Error fetching option instrument:', error);
    return NextResponse.json(
      { error: 'Failed to fetch option instrument' },
      { status: 500 }
    );
  }
}