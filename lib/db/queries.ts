import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  type User,
  message,
  vote,
  type DBMessage,
  stream,
  strategyType,
  type StrategyType,
  strategyChat,
  type StrategyChat,
  trades,
  type Trades,
  strategySnapshot,
  type StrategySnapshot,
  priceAlerts,
  type PriceAlert,
} from './schema';

import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';

import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createUserWithoutPassword(email: string) {
  try {
    return await db.insert(user).values({ email, password: null }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user without password');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveStrategyChat({
  id,
  userId,
  strategyTypeId,
  strategyName,
  baseCurrency = 'USD',
  initialCapital_USD,
  initialCapital_Currency,
}: {
  id: string;
  userId: string;
  strategyTypeId: string;
  strategyName: string;
  baseCurrency?: string;
  initialCapital_USD?: string;
  initialCapital_Currency?: string;
}) {
  try {
    return await db.insert(strategyChat).values({
      id,
      userId,
      strategyTypeId,
      strategyName,
      baseCurrency,
      initialCapital_USD,
      initialCapital_Currency,
      startedAt: new Date(),
      createdAt: new Date(),
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function updateStrategyChatStatus({
  id,
  status,
}: {
  id: string;
  status: 'active' | 'paused' | 'stopped' | 'completed';
}) {
  try {
    const updateData: any = { status };
    
    // Set endedAt when status is 'stopped' or 'completed'
    if (status === 'stopped' || status === 'completed') {
      updateData.endedAt = new Date();
    }
    
    const [updatedChat] = await db
      .update(strategyChat)
      .set(updateData)
      .where(eq(strategyChat.id, id))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update strategy chat status',
    );
  }
}

export async function updateStrategyChat({
  id,
  strategyName,
  baseCurrency,
  initialCapital_USD,
  initialCapital_Currency,
}: {
  id: string;
  strategyName?: string;
  baseCurrency?: string;
  initialCapital_USD?: string;
  initialCapital_Currency?: string;
}) {
  try {
    const updateData: any = {};
    
    if (strategyName !== undefined) updateData.strategyName = strategyName;
    if (baseCurrency !== undefined) updateData.baseCurrency = baseCurrency;
    if (initialCapital_USD !== undefined) updateData.initialCapital_USD = initialCapital_USD;
    if (initialCapital_Currency !== undefined) updateData.initialCapital_Currency = initialCapital_Currency;
    
    const [updatedChat] = await db
      .update(strategyChat)
      .set(updateData)
      .where(eq(strategyChat.id, id))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update strategy chat',
    );
  }
}

export async function deleteStrategyChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));
    await db.delete(trades).where(eq(trades.strategyChatId, id));
    await db.delete(strategySnapshot).where(eq(strategySnapshot.strategyChatId, id));

    const [chatsDeleted] = await db
      .delete(strategyChat)
      .where(eq(strategyChat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getStrategyChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(strategyChat)
        .where(
          whereCondition
            ? and(whereCondition, eq(strategyChat.userId, id))
            : eq(strategyChat.userId, id),
        )
        .orderBy(desc(strategyChat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<StrategyChat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(strategyChat)
        .where(eq(strategyChat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(strategyChat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(strategyChat)
        .where(eq(strategyChat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(strategyChat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getStrategyChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(strategyChat).where(eq(strategyChat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}


export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}




export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}


export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(strategyChat, eq(message.chatId, strategyChat.id))
      .where(
        and(
          eq(strategyChat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

export async function saveStrategyType({
  name,
  description,
  userId,
}: {
  name: string;
  description?: string;
  userId: string;
}) {
  try {
    return await db
      .insert(strategyType)
      .values({
        name,
        description,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save strategy type',
    );
  }
}

export async function getStrategyTypesByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(strategyType)
      .where(eq(strategyType.userId, userId))
      .orderBy(desc(strategyType.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get strategy types by user id',
    );
  }
}

export async function getStrategyTypeById({ id }: { id: string }) {
  try {
    const [selectedStrategyType] = await db
      .select()
      .from(strategyType)
      .where(eq(strategyType.id, id))
      .limit(1);
    return selectedStrategyType;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get strategy type by id',
    );
  }
}

export async function updateStrategyType({
  id,
  name,
  description,
}: {
  id: string;
  name?: string;
  description?: string;
}) {
  try {
    const updateData: Partial<StrategyType> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    return await db
      .update(strategyType)
      .set(updateData)
      .where(eq(strategyType.id, id))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update strategy type',
    );
  }
}

export async function deleteStrategyType({ id }: { id: string }) {
  try {
    const [deletedStrategyType] = await db
      .delete(strategyType)
      .where(eq(strategyType.id, id))
      .returning();
    return deletedStrategyType;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete strategy type',
    );
  }
}

export async function createTrade({
  strategyChatId,
  userId,
  product,
  productType,
  side,
  optionType,
  orderType,
  priceInCurrency,
  priceInUSD,
  amount,
  feeInCurrency,
  feeInUSD,
  executedAt,
}: {
  strategyChatId: string;
  userId: string;
  product: string;
  productType: 'perpetual' | 'option' | 'spot';
  side: 'buy' | 'sell';
  optionType?: 'call' | 'put';
  orderType?: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  priceInCurrency?: string;
  priceInUSD?: string;
  amount: string;
  feeInCurrency?: string;
  feeInUSD?: string;
  executedAt: Date;
}) {
  try {
    return await db
      .insert(trades)
      .values({
        strategyChatId,
        userId,
        product,
        productType,
        side,
        optionType: optionType || null,
        orderType: orderType || 'market',
        priceInCurrency: priceInCurrency || null,
        priceInUSD: priceInUSD || null,
        amount,
        feeInCurrency: feeInCurrency || null,
        feeInUSD: feeInUSD || null,
        executedAt,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    console.log(error)
    throw new ChatSDKError('bad_request:database', 'Failed to create trade');
  }
}

export async function getTradesByStrategyChat({
  strategyChatId,
  limit,
  offset,
}: {
  strategyChatId: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const query = db
      .select()
      .from(trades)
      .where(eq(trades.strategyChatId, strategyChatId))
      .orderBy(desc(trades.executedAt));

    if (limit && offset) {
      return await query.limit(limit).offset(offset);
    } else if (limit) {
      return await query.limit(limit);
    } else if (offset) {
      return await query.offset(offset);
    }

    return await query;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get trades by strategy chat',
    );
  }
}

export async function getTradesByUserId({
  userId,
  limit,
  offset,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const query = db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.executedAt));

    if (limit && offset) {
      return await query.limit(limit).offset(offset);
    } else if (limit) {
      return await query.limit(limit);
    } else if (offset) {
      return await query.offset(offset);
    }

    return await query;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get trades by user id',
    );
  }
}

export async function getTradeById({ id }: { id: string }) {
  try {
    const [selectedTrade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, id))
      .limit(1);
    return selectedTrade;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get trade by id');
  }
}

export async function updateTradeById({
  id,
  userId,
  product,
  productType,
  side,
  optionType,
  orderType,
  priceInCurrency,
  priceInUSD,
  amount,
  costInCurrency,
  costInUSD,
  feeInCurrency,
  feeInUSD,
  executedAt,
}: {
  id: string;
  userId: string;
  product?: string;
  productType?: 'perpetual' | 'option' | 'spot';
  side?: 'buy' | 'sell';
  optionType?: 'call' | 'put';
  orderType?: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  priceInCurrency?: string;
  priceInUSD?: string;
  amount?: string;
  costInCurrency?: string;
  costInUSD?: string;
  feeInCurrency?: string;
  feeInUSD?: string;
  executedAt?: Date;
}) {
  try {
    const updateData: Partial<Trades> = {};
    if (product !== undefined) updateData.product = product;
    if (productType !== undefined) updateData.productType = productType;
    if (side !== undefined) updateData.side = side;
    if (optionType !== undefined) updateData.optionType = optionType;
    if (orderType !== undefined) updateData.orderType = orderType;
    if (priceInCurrency !== undefined) updateData.priceInCurrency = priceInCurrency;
    if (priceInUSD !== undefined) updateData.priceInUSD = priceInUSD;
    if (amount !== undefined) updateData.amount = amount;
    if (feeInCurrency !== undefined) updateData.feeInCurrency = feeInCurrency;
    if (feeInUSD !== undefined) updateData.feeInUSD = feeInUSD;
    if (executedAt !== undefined) updateData.executedAt = executedAt;

    const [updatedTrade] = await db
      .update(trades)
      .set(updateData)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();
    
    return updatedTrade;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update trade',
    );
  }
}

export async function deleteTradeById({ 
  id, 
  userId 
}: { 
  id: string; 
  userId: string; 
}) {
  try {
    const [deletedTrade] = await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();
    return deletedTrade;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete trade',
    );
  }
}



export async function getStrategySnapshots({
  strategyChatId,
  limit,
  daysBack,
}: {
  strategyChatId: string;
  limit?: number;
  daysBack?: number;
}) {
  try {
    const conditions = [eq(strategySnapshot.strategyChatId, strategyChatId)];
    
    if (daysBack) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      conditions.push(gte(strategySnapshot.timestamp, startDate));
    }

    const query = db
      .select()
      .from(strategySnapshot)
      .where(and(...conditions))
      .orderBy(asc(strategySnapshot.timestamp));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get strategy snapshots',
    );
  }
}

export async function getLatestOptionInstrument({
  strategyChatId,
}: {
  strategyChatId: string;
}) {
  try {
    const [latestOptionTrade] = await db
      .select({ product: trades.product })
      .from(trades)
      .where(
        and(
          eq(trades.strategyChatId, strategyChatId),
          eq(trades.productType, 'option')
        )
      )
      .orderBy(trades.executedAt) // oldest one
      .limit(1);
    
    return latestOptionTrade?.product || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get latest option instrument',
    );
  }
}

export async function createPriceAlert({
  userId,
  coin,
  targetPrice,
  currentPrice,
  condition,
}: {
  userId: string;
  coin: string;
  targetPrice: string;
  currentPrice: string;
  condition: 'above' | 'below';
}) {
  try {
    return await db
      .insert(priceAlerts)
      .values({
        userId,
        coin,
        targetPrice,
        currentPrice,
        condition,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create price alert',
    );
  }
}

export async function getPriceAlertsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, userId))
      .orderBy(desc(priceAlerts.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get price alerts by user id',
    );
  }
}

export async function getPriceAlertById({ id }: { id: string }) {
  try {
    const [selectedPriceAlert] = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.id, id))
      .limit(1);
    return selectedPriceAlert;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get price alert by id',
    );
  }
}

export async function updatePriceAlert({
  id,
  currentPrice,
  isActive,
  triggeredAt,
  coin,
  targetPrice,
  condition,
}: {
  id: string;
  currentPrice?: string;
  isActive?: boolean;
  triggeredAt?: Date;
  coin?: string;
  targetPrice?: string;
  condition?: 'above' | 'below';
}) {
  try {
    const updateData: Partial<PriceAlert> = {};
    if (currentPrice !== undefined) updateData.currentPrice = currentPrice;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (triggeredAt !== undefined) updateData.triggeredAt = triggeredAt;
    if (coin !== undefined) updateData.coin = coin;
    if (targetPrice !== undefined) updateData.targetPrice = targetPrice;
    if (condition !== undefined) updateData.condition = condition;

    return await db
      .update(priceAlerts)
      .set(updateData)
      .where(eq(priceAlerts.id, id))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update price alert',
    );
  }
}

export async function getAllActivePriceAlerts() {
  try {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.isActive, true))
      .orderBy(desc(priceAlerts.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all active price alerts',
    );
  }
}

export async function deletePriceAlert({ id, userId }: { id: string; userId: string }) {
  try {
    const [deletedPriceAlert] = await db
      .delete(priceAlerts)
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)))
      .returning();
    return deletedPriceAlert;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete price alert',
    );
  }
}

export async function getActivePriceAlerts() {
  try {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.isActive, true))
      .orderBy(desc(priceAlerts.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get active price alerts',
    );
  }
}



