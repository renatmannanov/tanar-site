CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone1" text,
	"phone2" text,
	"instagram" text,
	"email" text,
	"city" text,
	"address" text,
	"pickup_info" text,
	"ip_name" text,
	"bin" text,
	"bank_name" text,
	"iban" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "faq_items_sort_order_idx" ON "faq_items" USING btree ("sort_order");