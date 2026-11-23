CREATE TYPE "public"."disputeStatus" AS ENUM('open', 'upheld', 'rejected');--> statement-breakpoint
CREATE TABLE "dispute" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreementId" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "disputeStatus" DEFAULT 'open' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvedById" uuid,
	"resolvedAt" timestamp with time zone,
	CONSTRAINT "dispute_agreementId_unique" UNIQUE("agreementId"),
	CONSTRAINT "dispute_reason_not_blank" CHECK (btrim("dispute"."reason") <> ''),
	CONSTRAINT "dispute_resolved_when_not_open" CHECK (("dispute"."status" = 'open') = ("dispute"."resolvedAt" IS NULL) AND ("dispute"."resolvedAt" IS NULL) = ("dispute"."resolvedById" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_agreementId_agreement_id_fk" FOREIGN KEY ("agreementId") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_resolvedById_user_id_fk" FOREIGN KEY ("resolvedById") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispute_status_createdAt_idx" ON "dispute" USING btree ("status","createdAt");