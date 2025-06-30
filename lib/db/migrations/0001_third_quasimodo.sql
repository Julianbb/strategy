CREATE TABLE IF NOT EXISTS "Strategy_Snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategyChatId" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"currentValue" numeric(20, 8) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Strategy_Snapshot" ADD CONSTRAINT "Strategy_Snapshot_strategyChatId_Strategy_Chat_id_fk" FOREIGN KEY ("strategyChatId") REFERENCES "public"."Strategy_Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
