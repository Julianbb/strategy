CREATE TABLE IF NOT EXISTS "Strategy_Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategyTypeId" uuid NOT NULL,
	"chatId" uuid NOT NULL,
	"name" text NOT NULL,
	"baseCurrency" varchar(10) DEFAULT 'USD' NOT NULL,
	"initialCapital_USD" numeric(20, 8),
	"initialCapital_Currency" numeric(20, 8),
	"initialCapitalInUSD" numeric(20, 8),
	"currentValueInUSD" numeric(20, 8),
	"profitLoss_USD" numeric(20, 8) DEFAULT '0',
	"profitLoss_Currency" numeric(20, 8) DEFAULT '0',
	"profitLossInUSD" numeric(20, 8) DEFAULT '0',
	"totalCost_USD" numeric(20, 8) DEFAULT '0',
	"totalCost_Currency" numeric(20, 8) DEFAULT '0',
	"totalFees_USD" numeric(20, 8) DEFAULT '0',
	"totalFees_Currency" numeric(20, 8) DEFAULT '0',
	"status" varchar DEFAULT 'active' NOT NULL,
	"totalTrades" numeric DEFAULT '0' NOT NULL,
	"startedAt" timestamp NOT NULL,
	"endedAt" timestamp,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streamId" uuid NOT NULL,
	"strategyChatId" uuid NOT NULL,
	"product" text NOT NULL,
	"side" varchar NOT NULL,
	"orderType" varchar DEFAULT 'market' NOT NULL,
	"priceCurrency" numeric(20, 8),
	"priceInUSD" numeric(20, 8),
	"amount" numeric(20, 8) NOT NULL,
	"costCurrency" numeric(20, 8),
	"costInUSD" numeric(20, 8),
	"feeCurrency" numeric(20, 8),
	"feeInUSD" numeric(20, 8),
	"executedAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy_Chat" ADD CONSTRAINT "Strategy_Chat_strategyTypeId_Strategy_Type_id_fk" FOREIGN KEY ("strategyTypeId") REFERENCES "public"."Strategy_Type"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy_Chat" ADD CONSTRAINT "Strategy_Chat_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Trades" ADD CONSTRAINT "Trades_streamId_Stream_id_fk" FOREIGN KEY ("streamId") REFERENCES "public"."Stream"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Trades" ADD CONSTRAINT "Trades_strategyChatId_Strategy_Chat_id_fk" FOREIGN KEY ("strategyChatId") REFERENCES "public"."Strategy_Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
