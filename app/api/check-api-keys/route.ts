import { NextResponse } from 'next/server';

export async function GET() {
  const apiKeys = {
    openai: !!process.env.OPENAI_API_KEY,
    xai: !!process.env.XAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };

  return NextResponse.json(apiKeys);
}