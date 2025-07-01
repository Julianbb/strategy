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
});

export type Chat = InferSelectModel<typeof chat>;


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
    product: varchar('product').notNull(),
    productType: varchar('productType', { enum: ['perpetual', 'option', 'spot'] }).notNull(),
    side: varchar('side', { enum: ['buy', 'sell'] }).notNull(),
    optionType: varchar('optionType', { enum: ['call', 'put'] }), // only if productType = 'option'
    orderType: varchar('orderType', { enum: ['market', 'limit', 'stop_loss', 'take_profit'] }).notNull().default('market'),
    priceInCurrency: numeric('priceCurrency',  { precision: 20, scale: 8 }),
    priceInUSD: numeric('priceInUSD', { precision: 20, scale: 8 }),
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
    feeInCurrency: numeric('feeCurrency', { precision: 20, scale: 8 }),
    feeInUSD: numeric('feeInUSD', { precision: 20, scale: 8 }),
    executedAt: timestamp('executedAt').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  }
);

export type Trades = InferSelectModel<typeof trades>;


export const strategySnapshot = pgTable('Strategy_Snapshot', {
  id: uuid('id').primaryKey().defaultRandom(),
  strategyChatId: uuid('strategyChatId').references(() => strategyChat.id).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  currentValueInUSD: numeric('currentValue', { precision: 20, scale: 8 }).notNull(),
});

export type StrategySnapshot = InferSelectModel<typeof strategySnapshot>;