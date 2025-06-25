CREATE TABLE IF NOT EXISTS "Strategy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"objective" text NOT NULL,
	"timeline" text,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"strategyTypeId" uuid NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Trades" DROP CONSTRAINT "Trades_streamId_Stream_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_strategyTypeId_Strategy_Type_id_fk" FOREIGN KEY ("strategyTypeId") REFERENCES "public"."Strategy_Type"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Trades" DROP COLUMN IF EXISTS "streamId";