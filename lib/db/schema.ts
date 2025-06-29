import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  numeric,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;



export const strategyType = pgTable(
  'Strategy_Type',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  }
);

export type StrategyType = InferSelectModel<typeof strategyType>;




export const strategyChat = pgTable(
  'Strategy_Chat',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(),
    strategyTypeId: uuid('strategyTypeId')
      .notNull()
      .references(() => strategyType.id),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    strategyName: text('strategyName').notNull(),
    baseCurrency: varchar('baseCurrency', { length: 10 }).notNull().default('USD'),
    initialCapital_USD: numeric('initialCapital_USD', { precision: 20, scale: 8 }),
    initialCapital_Currency: numeric('initialCapital_Currency', { precision: 20, scale: 8 }),
    
    averagePrice_Perpetual_USD: numeric('averagePrice_Perpetual_USD', { precision: 20, scale: 8 }),
    averagePrice_Options_USD: numeric('averagePrice_Options_USD', { precision: 20, scale: 8 }),
    positionSize_Perpetual: numeric('positionSize_Perpetual', { precision: 20, scale: 8 }),
    positionSize_Options: numeric('positionSize_Options', { precision: 20, scale: 8 }),
    
    profitLoss_USD: numeric('profitLoss_USD', { precision: 20, scale: 8 }).default('0'),
    profitLoss_Currency: numeric('profitLoss_Currency', { precision: 20, scale: 8 }).default('0'),
    
    totalCost_USD: numeric('totalCost_USD', { precision: 20, scale: 8 }).default('0'),
    totalCost_Currency: numeric('totalCost_Currency', { precision: 20, scale: 8 }).default('0'),
    totalFees_USD: numeric('totalFees_USD', { precision: 20, scale: 8 }).default('0'),
    totalFees_Currency: numeric('totalFees_Currency', { precision: 20, scale: 8 }).default('0'),
    status: varchar('status', { enum: ['active', 'paused', 'stopped', 'completed'] }).notNull().default('active'),
    totalTrades: numeric('totalTrades').notNull().default('0'),
    startedAt: timestamp('startedAt').notNull(),
    endedAt: timestamp('endedAt'),
    createdAt: timestamp('createdAt').notNull(),
  }
);

export type StrategyChat = InferSelectModel<typeof strategyChat>;

export const trades = pgTable(
  'Trades',
  {
    id: uuid('id').notNull().defaultRandom().primaryKey(),
    strategyChatId: uuid('strategyChatId')
      .notNull()
      .references(() => strategyChat.id),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    product: text('product').notNull(),
    side: varchar('side', { enum: ['buy', 'sell'] }).notNull(),
    orderType: varchar('orderType', { enum: ['market', 'limit', 'stop_loss', 'take_profit'] }).notNull().default('market'),
    priceInCurrency: numeric('priceCurrency',  { precision: 20, scale: 8 }),
    priceInUSD: numeric('priceInUSD', { precision: 20, scale: 8 }),
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
    costInCurrency: numeric('costCurrency', { precision: 20, scale: 8 }),
    costInUSD: numeric('costInUSD', { precision: 20, scale: 8 }),
    feeInCurrency: numeric('feeCurrency', { precision: 20, scale: 8 }),
    feeInUSD: numeric('feeInUSD', { precision: 20, scale: 8 }),
    executedAt: timestamp('executedAt').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  }
);

export type Trades = InferSelectModel<typeof trades>;