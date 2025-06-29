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
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  strategyType,
  type StrategyType,
  strategyChat,
  type StrategyChat,
  trades,
  type Trades,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
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

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
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
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
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

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
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

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
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

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
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
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
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
  side,
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
  strategyChatId: string;
  userId: string;
  product: string;
  side: 'buy' | 'sell';
  orderType?: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  priceInCurrency?: string;
  priceInUSD?: string;
  amount: string;
  costInCurrency?: string;
  costInUSD?: string;
  feeInCurrency?: string;
  feeInUSD?: string;
  executedAt: Date;
}) {
  try {

    console.log({
      strategyChatId,
      userId,
      product,
      side,
      orderType,
      priceInCurrency,
      priceInUSD,
      amount,
      costInCurrency,
      costInUSD,
      feeInCurrency,
      feeInUSD,
      executedAt,
    });



    return await db
      .insert(trades)
      .values({
        strategyChatId,
        userId,
        product,
        side,
        orderType: orderType || 'market',
        priceInCurrency: priceInCurrency || null,
        priceInUSD: priceInUSD || null,
        amount,
        costInCurrency: costInCurrency || null,
        costInUSD: costInUSD || null,
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
  priceInCurrency,
  priceInUSD,
  costInCurrency,
  costInUSD,
  feeInCurrency,
  feeInUSD,
}: {
  id: string;
  userId: string;
  priceInCurrency?: string;
  priceInUSD?: string;
  costInCurrency?: string;
  costInUSD?: string;
  feeInCurrency?: string;
  feeInUSD?: string;
}) {
  try {
    const updateData: Partial<Trades> = {};
    if (priceInCurrency !== undefined) updateData.priceInCurrency = priceInCurrency;
    if (priceInUSD !== undefined) updateData.priceInUSD = priceInUSD;
    if (costInCurrency !== undefined) updateData.costInCurrency = costInCurrency;
    if (costInUSD !== undefined) updateData.costInUSD = costInUSD;
    if (feeInCurrency !== undefined) updateData.feeInCurrency = feeInCurrency;
    if (feeInUSD !== undefined) updateData.feeInUSD = feeInUSD;

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

export async function getStrategyChatIdFromChatId({ chatId }: { chatId: string }) {
  try {
    const [selectedStrategyChat] = await db
      .select()
      .from(strategyChat)
      .where(eq(strategyChat.chatId, chatId))
      .limit(1);
    return selectedStrategyChat;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get strategy chat id from chat id',
    );
  }
}



