import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';
import { strategyChat } from '@/lib/db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const createStrategyChatSchema = z.object({
  strategyName: z.string().min(1).max(200),
  baseCurrency: z.string().length(3),
  initialCapital_USD: z.number().min(0).optional(),
  initialCapital_Currency: z.number().min(0).optional(),
  strategyTypeId: z.string().uuid(),
  chatId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  try {
    const body = await request.json();
    const validatedData = createStrategyChatSchema.parse(body);

    const [newStrategyChat] = await db
      .insert(strategyChat)
      .values({
        strategyName: validatedData.strategyName,
        baseCurrency: validatedData.baseCurrency,
        initialCapital_USD: validatedData.initialCapital_USD,
        initialCapital_Currency: validatedData.initialCapital_Currency,
        strategyTypeId: validatedData.strategyTypeId,
        chatId: validatedData.chatId,
        userId: session.user.id,
        startedAt: new Date(),
        createdAt: new Date(),
      } as any)
      .returning();

    return Response.json(newStrategyChat, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('type_wrong:strategy').toResponse();
    }
    console.error('Error creating strategy chat:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}