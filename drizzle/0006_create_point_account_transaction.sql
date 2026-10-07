CREATE TYPE "public"."transactionType" AS ENUM('initial', 'release');--> statement-breakpoint
CREATE TABLE "pointAccount" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pointAccount_userId_unique" UNIQUE("userId"),
	CONSTRAINT "pointAccount_reserved_nonnegative" CHECK ("pointAccount"."reserved" >= 0),
	CONSTRAINT "pointAccount_reserved_within_balance" CHECK ("pointAccount"."balance" >= "pointAccount"."reserved")
);
--> statement-breakpoint
CREATE TABLE "pointTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accountId" uuid NOT NULL,
	"agreementId" uuid,
	"amount" integer NOT NULL,
	"type" "transactionType" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pointTransaction_amount_nonzero" CHECK ("pointTransaction"."amount" <> 0),
	CONSTRAINT "pointTransaction_agreement_matches_type" CHECK (("pointTransaction"."type" = 'initial') = ("pointTransaction"."agreementId" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "pointAccount" ADD CONSTRAINT "pointAccount_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pointTransaction" ADD CONSTRAINT "pointTransaction_accountId_pointAccount_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."pointAccount"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pointTransaction" ADD CONSTRAINT "pointTransaction_agreementId_agreement_id_fk" FOREIGN KEY ("agreementId") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pointTransaction_accountId_createdAt_idx" ON "pointTransaction" USING btree ("accountId","createdAt");