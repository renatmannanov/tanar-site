ALTER TABLE "products" ADD COLUMN "label" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "care" text;--> statement-breakpoint
ALTER TABLE "skus" ADD COLUMN "article" text;--> statement-breakpoint
ALTER TABLE "skus" ADD COLUMN "ru_size" text;