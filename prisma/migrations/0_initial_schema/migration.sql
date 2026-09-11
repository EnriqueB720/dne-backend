-- Enable pgvector before any CREATE TABLE references vector(N) types.
-- Idempotent; running against an already-enabled DB is a no-op.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('SPANISH', 'ENGLISH');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'CONTENT_MODERATOR');

-- CreateEnum
CREATE TYPE "SupplierSource" AS ENUM ('SELF_SIGNUP', 'GOOGLE_PLACES', 'REGISTRO_NACIONAL', 'MANUAL_IMPORT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "PromotionTier" AS ENUM ('NONE', 'FEATURED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FLAT', 'PER_PERSON', 'PER_HOUR', 'PER_DAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('GATHERING', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_RECEIVED', 'BOOKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'QUOTE_REFERENCE', 'BOOKING_REFERENCE', 'SYSTEM_NOTICE');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('IDENTITY', 'BUSINESS_LICENSE', 'TAX_ID', 'INSURANCE', 'HEALTH_PERMIT', 'PROFESSIONAL_CERTIFICATION');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BOOKING', 'SUBSCRIPTION', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MERCADO_PAGO', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatusEnum" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('BOOKING', 'TENTATIVE', 'BLOCKED', 'EXTERNAL', 'RECURRING');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'PUSH', 'IN_APP', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "user_id" SERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "phone" TEXT,
    "language" "Language" NOT NULL DEFAULT 'SPANISH',
    "country" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPPLIER',
    "profilePicture" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar_url" TEXT,
    "timezone" TEXT DEFAULT 'America/Costa_Rica',
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "is_customer" BOOLEAN NOT NULL DEFAULT false,
    "is_supplier" BOOLEAN NOT NULL DEFAULT true,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "oauth_account" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "customer_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "default_city" TEXT,
    "default_address" TEXT,
    "default_lat" DECIMAL(10,7),
    "default_lng" DECIMAL(10,7),
    "preferred_language" "Language",
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "admin" (
    "admin_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "admin_role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "subscription_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "external_ref" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "pricing_plan" (
    "plan_id" SERIAL NOT NULL,
    "planName" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "features" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "price_monthly" DECIMAL(10,2),
    "price_yearly" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'CRC',
    "max_active_services" INTEGER,
    "max_leads_per_month" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plan_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "supplier_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "description_embedding" vector(1536),
    "slug" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "business_phone" TEXT,
    "business_email" TEXT,
    "whatsapp_number" TEXT,
    "website_url" TEXT,
    "business_phone_alt" TEXT,
    "business_email_alt" TEXT,
    "city" TEXT,
    "address" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "min_capacity" INTEGER,
    "max_capacity" INTEGER,
    "rating" DECIMAL(3,2),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "response_time_minutes" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "promotion_tier" "PromotionTier" NOT NULL DEFAULT 'NONE',
    "promotion_start_date" TIMESTAMP(3),
    "promotion_end_date" TIMESTAMP(3),
    "source" "SupplierSource" NOT NULL DEFAULT 'SELF_SIGNUP',
    "source_external_id" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT true,
    "claimed_at" TIMESTAMP(3),
    "subscription_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "post" (
    "post_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "category" (
    "category_id" SERIAL NOT NULL,
    "categoryName" TEXT NOT NULL,
    "parent_id" INTEGER,
    "slug" TEXT,
    "name_es" TEXT,
    "name_en" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "intent_schema" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "supplier_category" (
    "supplier_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_category_pkey" PRIMARY KEY ("supplier_id","category_id")
);

-- CreateTable
CREATE TABLE "service" (
    "service_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricing_model" "PricingModel" NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "min_total_price" DECIMAL(12,2),
    "max_total_price" DECIMAL(12,2),
    "min_units" INTEGER,
    "max_units" INTEGER,
    "unit_label" TEXT,
    "lead_time_hours" INTEGER,
    "duration_minutes" INTEGER,
    "tags" TEXT[],
    "inclusions" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "supplier_service_area" (
    "service_area_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "radius_km" INTEGER NOT NULL DEFAULT 20,
    "travel_fee" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_service_area_pkey" PRIMARY KEY ("service_area_id")
);

-- CreateTable
CREATE TABLE "request" (
    "request_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "raw_query" TEXT NOT NULL,
    "parsed_intent" JSONB,
    "conversation_turns" INTEGER NOT NULL DEFAULT 1,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "service_date" TIMESTAMP(3),
    "guest_count" INTEGER,
    "budget_min" DECIMAL(12,2),
    "budget_max" DECIMAL(12,2),
    "status" "RequestStatus" NOT NULL DEFAULT 'GATHERING',
    "expires_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "quote" (
    "quote_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "message" TEXT,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SENT',
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "offered_slots" JSONB,
    "selected_slot_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("quote_id")
);

-- CreateTable
CREATE TABLE "quote_item" (
    "quote_item_id" SERIAL NOT NULL,
    "quote_id" INTEGER NOT NULL,
    "service_id" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "quote_item_pkey" PRIMARY KEY ("quote_item_id")
);

-- CreateTable
CREATE TABLE "booking" (
    "booking_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "quote_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "service_end_date" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "guest_count" INTEGER,
    "total_price" DECIMAL(12,2) NOT NULL,
    "platform_fee" DECIMAL(12,2) NOT NULL,
    "supplier_payout" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "phone_revealed_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "favorite_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("favorite_id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "conversation_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_message_at" TIMESTAMP(3),
    "contact_share_warnings" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "conversation_participant_state" (
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_participant_state_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "message" (
    "message_id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "sender_user_id" INTEGER,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "filtered" BOOLEAN NOT NULL DEFAULT false,
    "filtered_reason" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "message_attachment" (
    "attachment_id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachment_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "ai_conversation" (
    "conversation_id" TEXT NOT NULL,
    "device_id" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "model" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER,
    "request_id" INTEGER,

    CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "ai_message" (
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "model" VARCHAR(64),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "providers_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "review" (
    "review_id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "rating_quality" INTEGER,
    "rating_communication" INTEGER,
    "rating_value" INTEGER,
    "rating_punctuality" INTEGER,
    "supplier_response" TEXT,
    "supplier_responded_at" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "verification" (
    "verification_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "verification_type" "VerificationType" NOT NULL,
    "document_url" TEXT,
    "notes" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("verification_id")
);

-- CreateTable
CREATE TABLE "payment" (
    "payment_id" SERIAL NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "booking_id" INTEGER,
    "subscription_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "provider" "PaymentProvider" NOT NULL,
    "external_ref" TEXT NOT NULL,
    "external_data" JSONB,
    "status" "PaymentStatusEnum" NOT NULL DEFAULT 'PENDING',
    "failed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "payout" (
    "payout_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "external_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_pkey" PRIMARY KEY ("payout_id")
);

-- CreateTable
CREATE TABLE "calendar_event" (
    "calendar_event_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "event_type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Costa_Rica',
    "booking_id" INTEGER,
    "quote_id" INTEGER,
    "location" TEXT,
    "recurrence_rule" TEXT,
    "external_calendar_id" TEXT,
    "external_event_id" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("calendar_event_id")
);

-- CreateTable
CREATE TABLE "notification" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "external_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "ai_usage_log" (
    "ai_usage_log_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "model_name" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("ai_usage_log_id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "media_asset_id" SERIAL NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "storage_provider" TEXT NOT NULL DEFAULT 'r2',
    "storage_file_id" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "caption" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("media_asset_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "audit_log_id" SERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "actor_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateTable
CREATE TABLE "scrape_source" (
    "scrape_source_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "source" "SupplierSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT,
    "raw_data" JSONB NOT NULL,
    "first_scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refresh_due_at" TIMESTAMP(3),
    "takedown_requested" BOOLEAN NOT NULL DEFAULT false,
    "takedown_requested_at" TIMESTAMP(3),

    CONSTRAINT "scrape_source_pkey" PRIMARY KEY ("scrape_source_id")
);

-- CreateTable
CREATE TABLE "search_log" (
    "search_log_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "request_id" INTEGER,
    "raw_query" TEXT NOT NULL,
    "parsed_intent" JSONB,
    "filters_applied" JSONB NOT NULL,
    "result_count" INTEGER NOT NULL,
    "result_supplier_ids" INTEGER[],
    "clicked_supplier_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "contacted_supplier_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "booked_supplier_id" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_log_pkey" PRIMARY KEY ("search_log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_name_key" ON "user"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_phone_idx" ON "user"("phone");

-- CreateIndex
CREATE INDEX "oauth_account_user_id_idx" ON "oauth_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_account_provider_provider_id_key" ON "oauth_account"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");

-- CreateIndex
CREATE INDEX "password_reset_token_user_id_idx" ON "password_reset_token"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_token_expires_at_idx" ON "password_reset_token"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_user_id_key" ON "customer"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_id_key" ON "admin"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plan_slug_key" ON "pricing_plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_user_id_key" ON "supplier"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_slug_key" ON "supplier"("slug");

-- CreateIndex
CREATE INDEX "supplier_city_idx" ON "supplier"("city");

-- CreateIndex
CREATE INDEX "supplier_rating_idx" ON "supplier"("rating");

-- CreateIndex
CREATE INDEX "supplier_source_claimed_idx" ON "supplier"("source", "claimed");

-- CreateIndex
CREATE INDEX "supplier_slug_idx" ON "supplier"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "category_parent_id_idx" ON "category"("parent_id");

-- CreateIndex
CREATE INDEX "category_slug_idx" ON "category"("slug");

-- CreateIndex
CREATE INDEX "supplier_category_category_id_idx" ON "supplier_category"("category_id");

-- CreateIndex
CREATE INDEX "service_supplier_id_idx" ON "service"("supplier_id");

-- CreateIndex
CREATE INDEX "service_category_id_idx" ON "service"("category_id");

-- CreateIndex
CREATE INDEX "supplier_service_area_city_idx" ON "supplier_service_area"("city");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_service_area_supplier_id_city_key" ON "supplier_service_area"("supplier_id", "city");

-- CreateIndex
CREATE INDEX "request_customer_id_idx" ON "request"("customer_id");

-- CreateIndex
CREATE INDEX "request_status_idx" ON "request"("status");

-- CreateIndex
CREATE INDEX "request_city_service_date_idx" ON "request"("city", "service_date");

-- CreateIndex
CREATE INDEX "request_category_id_status_idx" ON "request"("category_id", "status");

-- CreateIndex
CREATE INDEX "quote_supplier_id_status_idx" ON "quote"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "quote_status_idx" ON "quote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quote_request_id_supplier_id_key" ON "quote"("request_id", "supplier_id");

-- CreateIndex
CREATE INDEX "quote_item_quote_id_idx" ON "quote_item"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_quote_id_key" ON "booking"("quote_id");

-- CreateIndex
CREATE INDEX "booking_customer_id_status_idx" ON "booking"("customer_id", "status");

-- CreateIndex
CREATE INDEX "booking_supplier_id_status_idx" ON "booking"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "booking_service_date_idx" ON "booking"("service_date");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_customer_id_supplier_id_key" ON "favorite"("customer_id", "supplier_id");

-- CreateIndex
CREATE INDEX "conversation_customer_id_last_message_at_idx" ON "conversation"("customer_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversation_supplier_id_last_message_at_idx" ON "conversation"("supplier_id", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_request_id_supplier_id_key" ON "conversation"("request_id", "supplier_id");

-- CreateIndex
CREATE INDEX "conversation_participant_state_user_id_archived_at_idx" ON "conversation_participant_state"("user_id", "archived_at");

-- CreateIndex
CREATE INDEX "message_conversation_id_created_at_idx" ON "message"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_conversation_request_id_key" ON "ai_conversation"("request_id");

-- CreateIndex
CREATE INDEX "ai_conversation_device_id_idx" ON "ai_conversation"("device_id");

-- CreateIndex
CREATE INDEX "ai_conversation_user_id_updated_at_idx" ON "ai_conversation"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "ai_message_conversation_id_idx" ON "ai_message"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_booking_id_key" ON "review"("booking_id");

-- CreateIndex
CREATE INDEX "review_supplier_id_created_at_idx" ON "review"("supplier_id", "created_at");

-- CreateIndex
CREATE INDEX "verification_supplier_id_status_idx" ON "verification"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "payment_external_ref_idx" ON "payment"("external_ref");

-- CreateIndex
CREATE INDEX "payment_status_idx" ON "payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_booking_id_key" ON "payment"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_booking_id_key" ON "payout"("booking_id");

-- CreateIndex
CREATE INDEX "payout_supplier_id_status_idx" ON "payout"("supplier_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_booking_id_key" ON "calendar_event"("booking_id");

-- CreateIndex
CREATE INDEX "calendar_event_supplier_id_starts_at_ends_at_idx" ON "calendar_event"("supplier_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "calendar_event_status_idx" ON "calendar_event"("status");

-- CreateIndex
CREATE INDEX "notification_user_id_status_idx" ON "notification"("user_id", "status");

-- CreateIndex
CREATE INDEX "notification_created_at_idx" ON "notification"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_log_model_name_created_at_idx" ON "ai_usage_log"("model_name", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_log_created_at_idx" ON "ai_usage_log"("created_at");

-- CreateIndex
CREATE INDEX "media_asset_owner_type_owner_id_idx" ON "media_asset"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "media_asset_supplier_id_idx" ON "media_asset"("supplier_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_created_at_idx" ON "audit_log"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- CreateIndex
CREATE INDEX "scrape_source_supplier_id_idx" ON "scrape_source"("supplier_id");

-- CreateIndex
CREATE INDEX "scrape_source_refresh_due_at_idx" ON "scrape_source"("refresh_due_at");

-- CreateIndex
CREATE UNIQUE INDEX "scrape_source_source_external_id_key" ON "scrape_source"("source", "external_id");

-- CreateIndex
CREATE INDEX "search_log_user_id_created_at_idx" ON "search_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "search_log_created_at_idx" ON "search_log"("created_at");

-- AddForeignKey
ALTER TABLE "oauth_account" ADD CONSTRAINT "oauth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "category"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_category" ADD CONSTRAINT "supplier_category_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_category" ADD CONSTRAINT "supplier_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_service_area" ADD CONSTRAINT "supplier_service_area_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item" ADD CONSTRAINT "quote_item_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("quote_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item" ADD CONSTRAINT "quote_item_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service"("service_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("quote_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant_state" ADD CONSTRAINT "conversation_participant_state_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant_state" ADD CONSTRAINT "conversation_participant_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("conversation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachment" ADD CONSTRAINT "message_attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("request_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "verification_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_source" ADD CONSTRAINT "scrape_source_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_log" ADD CONSTRAINT "search_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;


-- HNSW ANN index on supplier embeddings (cosine distance). Prisma can't
-- declare this natively because the source column uses the Unsupported
-- vector(1536) type, so it's added manually here.
CREATE INDEX IF NOT EXISTS "supplier_description_embedding_hnsw_idx"
  ON "supplier" USING hnsw (description_embedding vector_cosine_ops);
