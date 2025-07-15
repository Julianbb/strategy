import { auth } from '@/app/(auth)/auth';
import { NextRequest } from 'next/server';
import { updateStrategyChat, getStrategyChatById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const updateStrategyChatSchema = z.object({
  id: z.string().min(1, 'Strategy ID is required'),
  strategyName: z.string().min(1, 'Strategy name is required'),
  baseCurrency: z.string().min(1, 'Base currency is required'),
  initialCapital_USD: z.string().optional(),
  initialCapital_Currency: z.string().optional(),
}).refine(
  (data) => {
    const usdValue = parseFloat(data.initialCapital_USD || '0') || 0;
    const currencyValue = parseFloat(data.initialCapital_Currency || '0') || 0;
    return usdValue > 0 || currencyValue > 0;
  },
  {
    message: 'At least one initial capital field must have a non-zero value',
  }
);

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const body = await request.json();
    const validatedData = updateStrategyChatSchema.parse(body);

    // Check if the strategy exists and belongs to the user
    const existingChat = await getStrategyChatById({ id: validatedData.id });
    
    if (!existingChat) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    if (existingChat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    // Update the strategy
    const updatedChat = await updateStrategyChat({
      id: validatedData.id,
      strategyName: validatedData.strategyName,
      baseCurrency: validatedData.baseCurrency,
      initialCapital_USD: validatedData.initialCapital_USD || undefined,
      initialCapital_Currency: validatedData.initialCapital_Currency || undefined,
    });

    return Response.json(updatedChat);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api', error.errors[0].message).toResponse();
    }
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    console.error('Error updating strategy:', error);
    return new ChatSDKError('bad_request:database', 'Failed to update strategy').toResponse();
  }
}