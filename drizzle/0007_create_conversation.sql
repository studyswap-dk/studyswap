CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" uuid NOT NULL,
	"participantId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_postId_participantId_key" UNIQUE("postId","participantId")
);
--> statement-breakpoint
ALTER TABLE "message" DROP CONSTRAINT "message_agreementId_agreement_id_fk";
--> statement-breakpoint
DROP INDEX "message_agreementId_createdAt_idx";--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "conversationId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_participantId_user_id_fk" FOREIGN KEY ("participantId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_participantId_idx" ON "conversation" USING btree ("participantId");--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_conversationId_createdAt_idx" ON "message" USING btree ("conversationId","createdAt");--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "agreementId";