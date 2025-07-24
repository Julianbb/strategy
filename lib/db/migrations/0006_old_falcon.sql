ALTER TABLE "Trades" ADD COLUMN "isExpired" boolean;--> statement-breakpoint
ALTER TABLE "Trades" ADD COLUMN "deliveryPriceInCurrency" numeric(20, 8);