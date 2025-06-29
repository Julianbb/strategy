ALTER TABLE "Strategy_Chat" RENAME COLUMN "name" TO "strategyName";--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "averagePrice_Perpetual_USD" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "averagePrice_Options_USD" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "positionSize_Perpetual" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" ADD COLUMN "positionSize_Options" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "Strategy_Chat" DROP COLUMN IF EXISTS "initialCapitalInUSD";--> statement-breakpoint
ALTER TABLE "Strategy_Chat" DROP COLUMN IF EXISTS "currentValueInUSD";--> statement-breakpoint
ALTER TABLE "Strategy_Chat" DROP COLUMN IF EXISTS "profitLossInUSD";