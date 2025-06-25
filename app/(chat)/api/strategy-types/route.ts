import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  saveStrategyType,
  getStrategyTypesByUserId,
  getStrategyTypeById,
  updateStrategyType,
  deleteStrategyType,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const strategyType = await getStrategyTypeById({ id });
      
      if (!strategyType) {
        return NextResponse.json(
          { error: 'Strategy type not found' },
          { status: 404 }
        );
      }

      if (strategyType.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json(strategyType);
    }

    const strategyTypes = await getStrategyTypesByUserId({ 
      userId: session.user.id 
    });

    return NextResponse.json(strategyTypes);
  } catch (error) {
    console.error('Error fetching strategy types:', error);
    
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description must be a string' },
        { status: 400 }
      );
    }

    const [strategyType] = await saveStrategyType({
      name: name.trim(),
      description: description?.trim(),
      userId: session.user.id,
    });

    return NextResponse.json(strategyType, { status: 201 });
  } catch (error) {
    console.error('Error creating strategy type:', error);
    
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

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, description } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID is required and must be a string' },
        { status: 400 }
      );
    }

    const existingStrategyType = await getStrategyTypeById({ id });
    
    if (!existingStrategyType) {
      return NextResponse.json(
        { error: 'Strategy type not found' },
        { status: 404 }
      );
    }

    if (existingStrategyType.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (name && typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name must be a string' },
        { status: 400 }
      );
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description must be a string' },
        { status: 400 }
      );
    }

    const [updatedStrategyType] = await updateStrategyType({
      id,
      name: name?.trim(),
      description: description?.trim(),
    });

    return NextResponse.json(updatedStrategyType);
  } catch (error) {
    console.error('Error updating strategy type:', error);
    
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const existingStrategyType = await getStrategyTypeById({ id });
    
    if (!existingStrategyType) {
      return NextResponse.json(
        { error: 'Strategy type not found' },
        { status: 404 }
      );
    }

    if (existingStrategyType.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const deletedStrategyType = await deleteStrategyType({ id });

    return NextResponse.json(deletedStrategyType);
  } catch (error) {
    console.error('Error deleting strategy type:', error);
    
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