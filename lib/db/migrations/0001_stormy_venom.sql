CREATE TABLE IF NOT EXISTS "Price_Alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"coin" varchar(10) NOT NULL,
	"targetPrice" numeric(20, 8) NOT NULL,
	"currentPrice" numeric(20, 8) NOT NULL,
	"condition" varchar NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp NOT NULL,
	"triggeredAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Price_Alerts" ADD CONSTRAINT "Price_Alerts_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
