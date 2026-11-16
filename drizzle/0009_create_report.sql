CREATE TYPE "public"."reportStatus" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" uuid NOT NULL,
	"reporterId" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "reportStatus" DEFAULT 'open' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"moderatorId" uuid,
	"resolvedAt" timestamp with time zone,
	CONSTRAINT "report_reason_not_blank" CHECK (btrim("report"."reason") <> ''),
	CONSTRAINT "report_handled_when_not_open" CHECK (("report"."status" = 'open') = ("report"."resolvedAt" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_user_id_fk" FOREIGN KEY ("reporterId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_moderatorId_user_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_postId_reporterId_open_key" ON "report" USING btree ("postId","reporterId") WHERE "report"."status" = 'open';--> statement-breakpoint
CREATE INDEX "report_status_createdAt_idx" ON "report" USING btree ("status","createdAt");