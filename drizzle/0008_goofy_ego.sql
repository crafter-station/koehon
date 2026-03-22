CREATE TABLE "user_settings" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"models" json DEFAULT '{"extractor":"openai","translator":"openai","audio_generator":"openai"}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");