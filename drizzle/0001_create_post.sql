CREATE TYPE "public"."postStatus" AS ENUM('open', 'closed', 'removed');--> statement-breakpoint
CREATE TYPE "public"."postType" AS ENUM('seeking', 'offering');--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"authorId" uuid NOT NULL,
	"type" "postType" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "postStatus" DEFAULT 'open' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_status_createdAt_idx" ON "post" USING btree ("status","createdAt");