CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreementId" uuid NOT NULL,
	"senderId" uuid NOT NULL,
	"text" text NOT NULL,
	"sentAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_text_not_blank" CHECK (btrim("message"."text") <> '')
);
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_agreementId_agreement_id_fk" FOREIGN KEY ("agreementId") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_agreementId_sentAt_idx" ON "message" USING btree ("agreementId","sentAt");