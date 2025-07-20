import { NextRequest, NextResponse } from 'next/server'
import { priceService } from '@/lib/services/price-fetcher/index.server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = searchParams.get('baseCurrency');
    const optionInstrument = searchParams.get('optionInstrument');

    if (!baseCurrency) {
      return NextResponse.json(
        { error: 'baseCurrency is required' },
        { status: 400 }
      );
    }

    const priceData = await priceService.fetchPriceData(
      baseCurrency,
      optionInstrument
    );

    return NextResponse.json(priceData);
  } catch (error) {
    console.error('Price API error:', error);
    return NextResponse.json(
      { 
        currencyPrice: null,
        optionsPrice: null,
        optionInstrument: null,
        error: error instanceof Error ? error.message : 'Failed to fetch prices'
      },
      { status: 500 }
    );
  }
}