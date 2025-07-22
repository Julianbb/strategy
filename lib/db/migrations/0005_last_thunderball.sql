ALTER TABLE "Strategy_Chat" RENAME COLUMN "profit_loss" TO "last_profit_loss";--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "last_apr" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "lastCapital_USD" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "lastCapital_Currency" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "initialBaseCurrencyPrice" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "lastBaseCurrencyPrice" numeric(20, 8);