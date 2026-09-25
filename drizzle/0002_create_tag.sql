CREATE TABLE "postTag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postId" uuid NOT NULL,
	"tagId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "postTag_postId_tagId_key" UNIQUE("postId","tagId")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "postTag" ADD CONSTRAINT "postTag_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postTag" ADD CONSTRAINT "postTag_tagId_tag_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "postTag_tagId_idx" ON "postTag" USING btree ("tagId");