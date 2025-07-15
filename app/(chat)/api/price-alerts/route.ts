import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createPriceAlert,
  getPriceAlertsByUserId,
  getPriceAlertById,
  updatePriceAlert,
  deletePriceAlert,
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
      const priceAlert = await getPriceAlertById({ id });
      
      if (!priceAlert) {
        return NextResponse.json(
          { error: 'Price alert not found' },
          { status: 404 }
        );
      }

      if (priceAlert.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json(priceAlert);
    }

    const priceAlerts = await getPriceAlertsByUserId({ 
      userId: session.user.id 
    });

    return NextResponse.json(priceAlerts);
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    
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
    const { coin, targetPrice, currentPrice, condition } = body;

    console.log("价格预警请求收到：");
    console.log("币种:", coin);
    console.log("当前价格:", currentPrice);
    console.log("目标价格:", targetPrice);
    console.log("条件:", condition);
    

    if (!coin || typeof coin !== 'string') {
      return NextResponse.json(
        { error: 'Coin is required and must be a string' },
        { status: 400 }
      );
    }

    if (!targetPrice || typeof targetPrice !== 'number') {
      return NextResponse.json(
        { error: 'Target price is required and must be a number' },
        { status: 400 }
      );
    }

    if (!currentPrice || typeof currentPrice !== 'number') {
      return NextResponse.json(
        { error: 'Current price is required and must be a number' },
        { status: 400 }
      );
    }

    if (!condition || !['above', 'below'].includes(condition)) {
      return NextResponse.json(
        { error: 'Condition is required and must be either "above" or "below"' },
        { status: 400 }
      );
    }

 
    const [priceAlert] = await createPriceAlert({
      userId: session.user.id,
      coin: coin.trim().toUpperCase(),
      targetPrice: targetPrice.toString(),
      currentPrice: currentPrice.toString(),
      condition,
    });

    return NextResponse.json(priceAlert, { status: 201 });
  } catch (error) {
    console.error('Error creating price alert:', error);
    
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
    const { id, currentPrice, isActive, triggeredAt, coin, targetPrice, condition } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID is required and must be a string' },
        { status: 400 }
      );
    }

    const existingPriceAlert = await getPriceAlertById({ id });
    
    if (!existingPriceAlert) {
      return NextResponse.json(
        { error: 'Price alert not found' },
        { status: 404 }
      );
    }

    if (existingPriceAlert.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const updateData: {
      currentPrice?: string;
      isActive?: boolean;
      triggeredAt?: Date;
      coin?: string;
      targetPrice?: string;
      condition?: 'above' | 'below';
    } = {};

    if (currentPrice !== undefined) {
      if (typeof currentPrice !== 'number') {
        return NextResponse.json(
          { error: 'Current price must be a number' },
          { status: 400 }
        );
      }
      updateData.currentPrice = currentPrice.toString();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'isActive must be a boolean' },
          { status: 400 }
        );
      }
      updateData.isActive = isActive;
    }

    if (triggeredAt !== undefined) {
      updateData.triggeredAt = new Date(triggeredAt);
    }

    if (coin !== undefined) {
      if (typeof coin !== 'string' || coin.trim() === '') {
        return NextResponse.json(
          { error: 'Coin must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.coin = coin.trim().toUpperCase();
    }

    if (targetPrice !== undefined) {
      if (typeof targetPrice !== 'number' || targetPrice <= 0) {
        return NextResponse.json(
          { error: 'Target price must be a positive number' },
          { status: 400 }
        );
      }
      updateData.targetPrice = targetPrice.toString();
    }

    if (condition !== undefined) {
      if (!['above', 'below'].includes(condition)) {
        return NextResponse.json(
          { error: 'Condition must be either "above" or "below"' },
          { status: 400 }
        );
      }
      updateData.condition = condition;
    }

    const [updatedPriceAlert] = await updatePriceAlert({
      id,
      ...updateData,
    });

    return NextResponse.json(updatedPriceAlert);
  } catch (error) {
    console.error('Error updating price alert:', error);
    
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

    const existingPriceAlert = await getPriceAlertById({ id });
    
    if (!existingPriceAlert) {
      return NextResponse.json(
        { error: 'Price alert not found' },
        { status: 404 }
      );
    }

    if (existingPriceAlert.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const deletedPriceAlert = await deletePriceAlert({ 
      id, 
      userId: session.user.id 
    });

    return NextResponse.json(deletedPriceAlert);
  } catch (error) {
    console.error('Error deleting price alert:', error);
    
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