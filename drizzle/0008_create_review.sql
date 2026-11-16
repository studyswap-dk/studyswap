CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreementId" uuid NOT NULL,
	"reviewerId" uuid NOT NULL,
	"revieweeId" uuid NOT NULL,
	"score" smallint NOT NULL,
	"givenAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_agreementId_reviewerId_key" UNIQUE("agreementId","reviewerId"),
	CONSTRAINT "review_score_between_1_and_5" CHECK ("review"."score" BETWEEN 1 AND 5),
	CONSTRAINT "review_parties_differ" CHECK ("review"."reviewerId" <> "review"."revieweeId")
);
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_agreementId_agreement_id_fk" FOREIGN KEY ("agreementId") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_reviewerId_user_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_revieweeId_user_id_fk" FOREIGN KEY ("revieweeId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_revieweeId_idx" ON "review" USING btree ("revieweeId");