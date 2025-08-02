CREATE TABLE IF NOT EXISTS "Strategy_Monthly_PnL" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategyChatId" uuid NOT NULL,
	"year" numeric(4, 0) NOT NULL,
	"monthlyProfitLoss" json NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy_Monthly_PnL" ADD CONSTRAINT "Strategy_Monthly_PnL_strategyChatId_Strategy_Chat_id_fk" FOREIGN KEY ("strategyChatId") REFERENCES "public"."Strategy_Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
