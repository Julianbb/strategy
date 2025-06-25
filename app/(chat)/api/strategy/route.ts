import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  createStrategy, 
  getStrategiesByUserId, 
  deleteStrategyById,
  updateStrategyById 
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const createStrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  objective: z.string().min(1).max(1000),
  timeline: z.string().optional(),
  strategyTypeId: z.string().uuid(),
  chatId: z.string().uuid(),
});

const updateStrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  objective: z.string().min(1).max(1000).optional(),
  timeline: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  try {
    const strategies = await getStrategiesByUserId({ userId: session.user.id });
    return Response.json(strategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  try {
    const body = await request.json();
    const validatedData = createStrategySchema.parse(body);

    const strategy = await createStrategy({
      ...validatedData,
      userId: session.user.id,
    });

    return Response.json(strategy, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:validation').toResponse();
    }
    console.error('Error creating strategy:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  try {
    const body = await request.json();
    const validatedData = updateStrategySchema.parse(body);

    const strategy = await updateStrategyById({
      ...validatedData,
      userId: session.user.id,
    });

    return Response.json(strategy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:validation').toResponse();
    }
    console.error('Error updating strategy:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    await deleteStrategyById({ id, userId: session.user.id });
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}