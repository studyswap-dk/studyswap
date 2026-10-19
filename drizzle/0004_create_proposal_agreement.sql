CREATE TYPE "public"."agreementStatus" AS ENUM('accepted', 'completed', 'cancelled', 'expired', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."proposalStatus" AS ENUM('pending', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TABLE "agreement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposalId" uuid NOT NULL,
	"helperId" uuid NOT NULL,
	"receiverId" uuid NOT NULL,
	"cancelledById" uuid,
	"points" integer NOT NULL,
	"status" "agreementStatus" DEFAULT 'accepted' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"helperConfirmedAt" timestamp with time zone,
	"receiverConfirmedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"cancelledAt" timestamp with time zone,
	CONSTRAINT "agreement_proposalId_unique" UNIQUE("proposalId"),
	CONSTRAINT "agreement_points_positive" CHECK ("agreement"."points" > 0),
	CONSTRAINT "agreement_parties_differ" CHECK ("agreement"."helperId" <> "agreement"."receiverId")
);
--> statement-breakpoint
CREATE TABLE "proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" uuid NOT NULL,
	"proposerId" uuid NOT NULL,
	"status" "proposalStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"decidedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_proposalId_proposal_id_fk" FOREIGN KEY ("proposalId") REFERENCES "public"."proposal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_helperId_user_id_fk" FOREIGN KEY ("helperId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_receiverId_user_id_fk" FOREIGN KEY ("receiverId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_cancelledById_user_id_fk" FOREIGN KEY ("cancelledById") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_proposerId_user_id_fk" FOREIGN KEY ("proposerId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agreement_helperId_idx" ON "agreement" USING btree ("helperId");--> statement-breakpoint
CREATE INDEX "agreement_receiverId_idx" ON "agreement" USING btree ("receiverId");--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_postId_proposerId_pending_key" ON "proposal" USING btree ("postId","proposerId") WHERE "proposal"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "proposal_postId_status_idx" ON "proposal" USING btree ("postId","status");