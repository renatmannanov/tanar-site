ALTER TABLE "orders" ADD COLUMN "number" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_number_uq" UNIQUE("number");