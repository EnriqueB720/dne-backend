-- =====================================================================
-- MVP simplification (2026-11-20)
--
-- Solvo now only connects customers with suppliers. This migration:
--   1. removes the Request → Quote → Booking pipeline, live chat,
--      notifications, favorites, subscriptions/payments and other unused
--      tables (the code lives on the `archive/pre-mvp-simplification` branch);
--   2. removes duplicated columns (user.role vs is_admin, supplier.verified
--      vs verified_at, category.categoryName vs name_en, …);
--   3. adds province-based geography to suppliers (ISO 3166-2 codes) and
--      backfills it from city + the old supplier_service_area rows;
--   4. renames the last camelCase columns to snake_case.
-- Data is transformed BEFORE anything is dropped. See docs/DATABASE.md.
--
-- NOTE: `supplier_description_embedding_hnsw_idx` (raw SQL, created in
-- 0_initial_schema) is invisible to Prisma. `prisma migrate diff` always
-- proposes dropping it — never accept that.
-- =====================================================================

-- ── 0. Lookup: normalized place name → province (from src/shared/geo) ──
CREATE TEMP TABLE _geo_place (key TEXT PRIMARY KEY, province TEXT NOT NULL);
INSERT INTO _geo_place (key, province) VALUES
  ('san jose', 'CR-SJ'),
  ('sanjose', 'CR-SJ'),
  ('chepe', 'CR-SJ'),
  ('alajuela', 'CR-A'),
  ('cartago', 'CR-C'),
  ('heredia', 'CR-H'),
  ('guanacaste', 'CR-G'),
  ('puntarenas', 'CR-P'),
  ('limon', 'CR-L'),
  ('puerto limon', 'CR-L'),
  ('escazu', 'CR-SJ'),
  ('desamparados', 'CR-SJ'),
  ('puriscal', 'CR-SJ'),
  ('tarrazu', 'CR-SJ'),
  ('aserri', 'CR-SJ'),
  ('mora', 'CR-SJ'),
  ('goicoechea', 'CR-SJ'),
  ('santa ana', 'CR-SJ'),
  ('alajuelita', 'CR-SJ'),
  ('vazquez de coronado', 'CR-SJ'),
  ('coronado', 'CR-SJ'),
  ('acosta', 'CR-SJ'),
  ('tibas', 'CR-SJ'),
  ('moravia', 'CR-SJ'),
  ('montes de oca', 'CR-SJ'),
  ('turrubares', 'CR-SJ'),
  ('dota', 'CR-SJ'),
  ('curridabat', 'CR-SJ'),
  ('perez zeledon', 'CR-SJ'),
  ('san isidro de el general', 'CR-SJ'),
  ('leon cortes', 'CR-SJ'),
  ('san pedro', 'CR-SJ'),
  ('guadalupe', 'CR-SJ'),
  ('pavas', 'CR-SJ'),
  ('rohrmoser', 'CR-SJ'),
  ('la sabana', 'CR-SJ'),
  ('la uruca', 'CR-SJ'),
  ('hatillo', 'CR-SJ'),
  ('zapote', 'CR-SJ'),
  ('san francisco de dos rios', 'CR-SJ'),
  ('sabanilla', 'CR-SJ'),
  ('barrio escalante', 'CR-SJ'),
  ('los yoses', 'CR-SJ'),
  ('lindora', 'CR-SJ'),
  ('pozos', 'CR-SJ'),
  ('ciudad colon', 'CR-SJ'),
  ('guachipelin', 'CR-SJ'),
  ('san rafael de escazu', 'CR-SJ'),
  ('san ramon', 'CR-A'),
  ('grecia', 'CR-A'),
  ('san mateo', 'CR-A'),
  ('atenas', 'CR-A'),
  ('naranjo', 'CR-A'),
  ('palmares', 'CR-A'),
  ('poas', 'CR-A'),
  ('orotina', 'CR-A'),
  ('san carlos', 'CR-A'),
  ('zarcero', 'CR-A'),
  ('sarchi', 'CR-A'),
  ('upala', 'CR-A'),
  ('los chiles', 'CR-A'),
  ('guatuso', 'CR-A'),
  ('rio cuarto', 'CR-A'),
  ('ciudad quesada', 'CR-A'),
  ('la fortuna', 'CR-A'),
  ('la guacima', 'CR-A'),
  ('el coyol', 'CR-A'),
  ('rio segundo', 'CR-A'),
  ('paraiso', 'CR-C'),
  ('la union', 'CR-C'),
  ('jimenez', 'CR-C'),
  ('turrialba', 'CR-C'),
  ('alvarado', 'CR-C'),
  ('oreamuno', 'CR-C'),
  ('el guarco', 'CR-C'),
  ('tres rios', 'CR-C'),
  ('tejar', 'CR-C'),
  ('orosi', 'CR-C'),
  ('juan vinas', 'CR-C'),
  ('barva', 'CR-H'),
  ('santo domingo', 'CR-H'),
  ('santa barbara', 'CR-H'),
  ('san rafael', 'CR-H'),
  ('san isidro', 'CR-H'),
  ('belen', 'CR-H'),
  ('flores', 'CR-H'),
  ('san pablo', 'CR-H'),
  ('sarapiqui', 'CR-H'),
  ('san joaquin de flores', 'CR-H'),
  ('lagunilla', 'CR-H'),
  ('cariari', 'CR-H'),
  ('san antonio de belen', 'CR-H'),
  ('puerto viejo de sarapiqui', 'CR-H'),
  ('liberia', 'CR-G'),
  ('nicoya', 'CR-G'),
  ('santa cruz', 'CR-G'),
  ('bagaces', 'CR-G'),
  ('carrillo', 'CR-G'),
  ('filadelfia', 'CR-G'),
  ('canas', 'CR-G'),
  ('abangares', 'CR-G'),
  ('tilaran', 'CR-G'),
  ('nandayure', 'CR-G'),
  ('la cruz', 'CR-G'),
  ('hojancha', 'CR-G'),
  ('tamarindo', 'CR-G'),
  ('flamingo', 'CR-G'),
  ('playas del coco', 'CR-G'),
  ('samara', 'CR-G'),
  ('nosara', 'CR-G'),
  ('papagayo', 'CR-G'),
  ('brasilito', 'CR-G'),
  ('potrero', 'CR-G'),
  ('esparza', 'CR-P'),
  ('buenos aires', 'CR-P'),
  ('montes de oro', 'CR-P'),
  ('osa', 'CR-P'),
  ('quepos', 'CR-P'),
  ('golfito', 'CR-P'),
  ('coto brus', 'CR-P'),
  ('parrita', 'CR-P'),
  ('corredores', 'CR-P'),
  ('garabito', 'CR-P'),
  ('monteverde', 'CR-P'),
  ('puerto jimenez', 'CR-P'),
  ('jaco', 'CR-P'),
  ('manuel antonio', 'CR-P'),
  ('uvita', 'CR-P'),
  ('dominical', 'CR-P'),
  ('ojochal', 'CR-P'),
  ('santa teresa', 'CR-P'),
  ('mal pais', 'CR-P'),
  ('montezuma', 'CR-P'),
  ('cobano', 'CR-P'),
  ('ciudad neily', 'CR-P'),
  ('san vito', 'CR-P'),
  ('ciudad cortes', 'CR-P'),
  ('palmar norte', 'CR-P'),
  ('pococi', 'CR-L'),
  ('siquirres', 'CR-L'),
  ('talamanca', 'CR-L'),
  ('matina', 'CR-L'),
  ('guacimo', 'CR-L'),
  ('guapiles', 'CR-L'),
  ('puerto viejo', 'CR-L'),
  ('cahuita', 'CR-L'),
  ('tortuguero', 'CR-L'),
  ('manzanillo', 'CR-L');

CREATE FUNCTION pg_temp._norm_place(v TEXT) RETURNS TEXT AS $$
  SELECT btrim(regexp_replace(regexp_replace(
    translate(lower(coalesce(v, '')), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
    '[^a-z0-9\s]', ' ', 'g'), '\s+', ' ', 'g'));
$$ LANGUAGE SQL IMMUTABLE;

-- Exact name first, otherwise the longest known place contained in the text.
CREATE FUNCTION pg_temp._province_of(v TEXT) RETURNS TEXT AS $$
  SELECT coalesce(
    (SELECT province FROM _geo_place WHERE key = pg_temp._norm_place(v)),
    (SELECT province FROM _geo_place
      WHERE position(' ' || key || ' ' IN ' ' || pg_temp._norm_place(v) || ' ') > 0
      ORDER BY length(key) DESC LIMIT 1)
  );
$$ LANGUAGE SQL STABLE;

-- ── 1. Supplier: new geography, preferred placement, renamed name ──────
ALTER TABLE "supplier" RENAME COLUMN "companyName" TO "company_name";
ALTER TABLE "supplier"
  ADD COLUMN "province" VARCHAR(10),
  ADD COLUMN "service_provinces" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preferred_at" TIMESTAMP(3),
  ADD COLUMN "preferred_until" TIMESTAMP(3);

UPDATE "supplier" SET "province" = pg_temp._province_of("city");

UPDATE "supplier" s SET "service_provinces" = sub.provinces
FROM (
  SELECT s2.supplier_id,
         array_remove(ARRAY[s2.province], NULL)
           || coalesce(
                array_agg(DISTINCT pg_temp._province_of(a.city))
                  FILTER (WHERE pg_temp._province_of(a.city) IS NOT NULL
                            AND pg_temp._province_of(a.city) IS DISTINCT FROM s2.province),
                ARRAY[]::TEXT[]) AS provinces
  FROM "supplier" s2
  LEFT JOIN "supplier_service_area" a ON a.supplier_id = s2.supplier_id
  GROUP BY s2.supplier_id, s2.province
) sub
WHERE sub.supplier_id = s.supplier_id;

-- One fact, one column: booleans that had a twin timestamp become the timestamp.
UPDATE "supplier" SET "verified_at" = coalesce("verified_at", "updated_at", "created_at") WHERE "verified" = true;
UPDATE "supplier" SET "verified_at" = NULL WHERE "verified" = false;
UPDATE "supplier" SET "claimed_at" = coalesce("claimed_at", "created_at") WHERE "claimed" = true;
UPDATE "supplier" SET "claimed_at" = NULL WHERE "claimed" = false;
UPDATE "supplier"
   SET "preferred_at" = coalesce("promotion_start_date", now()),
       "preferred_until" = "promotion_end_date"
 WHERE "promotion_tier" = 'FEATURED'
   AND ("promotion_end_date" IS NULL OR "promotion_end_date" > now());

-- Source enum loses two values nothing ever wrote.
UPDATE "supplier" SET "source" = 'MANUAL_IMPORT' WHERE "source"::text IN ('REGISTRO_NACIONAL', 'REFERRAL');
UPDATE "scrape_source" SET "source" = 'MANUAL_IMPORT' WHERE "source"::text IN ('REGISTRO_NACIONAL', 'REFERRAL');
CREATE TYPE "SupplierSource_new" AS ENUM ('SELF_SIGNUP', 'GOOGLE_PLACES', 'MANUAL_IMPORT');
ALTER TABLE "supplier" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "supplier" ALTER COLUMN "source" TYPE "SupplierSource_new" USING ("source"::text::"SupplierSource_new");
ALTER TABLE "scrape_source" ALTER COLUMN "source" TYPE "SupplierSource_new" USING ("source"::text::"SupplierSource_new");
ALTER TYPE "SupplierSource" RENAME TO "SupplierSource_old";
ALTER TYPE "SupplierSource_new" RENAME TO "SupplierSource";
DROP TYPE "SupplierSource_old";
ALTER TABLE "supplier" ALTER COLUMN "source" SET DEFAULT 'SELF_SIGNUP';

-- ── 2. User: role duplicated is_admin/is_supplier ──────────────────────
ALTER TABLE "user" RENAME COLUMN "profilePicture" TO "profile_picture";
UPDATE "user" SET "profile_picture" = coalesce("profile_picture", "avatar_url");
UPDATE "user" SET "is_admin" = true WHERE "role" = 'ADMIN';
UPDATE "user" SET "country" = 'CR' WHERE "country" IS NULL OR length("country") <> 2;
UPDATE "user" SET "country" = upper("country");

-- ── 3. Category: categoryName duplicated name_en ───────────────────────
UPDATE "category" SET
  "name_en" = coalesce("name_en", "categoryName"),
  "name_es" = coalesce("name_es", "categoryName"),
  "slug"    = coalesce("slug", trim(both '-' from lower(regexp_replace("categoryName", '[^a-zA-Z0-9]+', '-', 'g'))));

-- ── 4. Service: one optional "from" price + free-text unit ─────────────
ALTER TABLE "service" ADD COLUMN "price_from" DECIMAL(12,2), ADD COLUMN "price_unit" TEXT;
UPDATE "service" SET
  "price_from" = "base_price",
  "price_unit" = CASE "pricing_model"::text
    WHEN 'PER_HOUR' THEN 'hora'
    WHEN 'PER_PERSON' THEN 'persona'
    WHEN 'PER_DAY' THEN 'día'
    ELSE nullif(btrim("unit_label"), '')
  END;

-- ── 5. Rows that only made sense in the removed flows ──────────────────
DELETE FROM "quote_item";
DELETE FROM "service" WHERE "deleted_at" IS NOT NULL OR "active" = false;
DELETE FROM "media_asset" WHERE "deleted_at" IS NOT NULL OR "supplier_id" IS NULL;
DELETE FROM "review" WHERE "hidden" = true;
-- One review per customer per supplier: keep the newest of any duplicates.
DELETE FROM "review" r USING "review" newer
 WHERE r.customer_id = newer.customer_id AND r.supplier_id = newer.supplier_id
   AND (r.created_at, r.review_id) < (newer.created_at, newer.review_id);
UPDATE "contact_event" SET "source" = 'profile' WHERE "source" = 'storefront';

-- ── 6. Foreign keys into removed tables ────────────────────────────────
ALTER TABLE "ai_conversation" DROP CONSTRAINT "ai_conversation_request_id_fkey";
ALTER TABLE "review" DROP CONSTRAINT "review_booking_id_fkey";
ALTER TABLE "service" DROP CONSTRAINT "service_category_id_fkey";
ALTER TABLE "supplier" DROP CONSTRAINT "supplier_subscription_id_fkey";
ALTER TABLE "category" DROP CONSTRAINT "category_parent_id_fkey";

-- ── 7. Drop removed tables ─────────────────────────────────────────────
DROP TABLE "payout", "payment", "calendar_event", "quote_item", "booking", "quote",
  "message_attachment", "message", "conversation_participant_state", "conversation",
  "request", "favorite", "notification", "verification", "audit_log", "search_log",
  "subscription", "pricing_plan", "admin", "supplier_service_area" CASCADE;

-- ── 8. Drop duplicated / unused columns ────────────────────────────────
ALTER TABLE "user"
  DROP COLUMN "role", DROP COLUMN "first_name", DROP COLUMN "last_name",
  DROP COLUMN "avatar_url", DROP COLUMN "timezone", DROP COLUMN "phone_verified_at",
  DROP COLUMN "last_login_at",
  ALTER COLUMN "country" SET DEFAULT 'CR',
  ALTER COLUMN "country" SET DATA TYPE VARCHAR(2),
  ALTER COLUMN "is_supplier" SET DEFAULT false;

ALTER TABLE "customer"
  DROP COLUMN "default_city", DROP COLUMN "default_address", DROP COLUMN "default_lat",
  DROP COLUMN "default_lng", DROP COLUMN "preferred_language", DROP COLUMN "marketing_opt_in";

ALTER TABLE "supplier"
  DROP COLUMN "verified", DROP COLUMN "claimed", DROP COLUMN "premium",
  DROP COLUMN "promotion_tier", DROP COLUMN "promotion_start_date", DROP COLUMN "promotion_end_date",
  DROP COLUMN "slug", DROP COLUMN "source_external_id", DROP COLUMN "min_capacity",
  DROP COLUMN "max_capacity", DROP COLUMN "response_time_minutes", DROP COLUMN "subscription_id";

ALTER TABLE "category"
  DROP COLUMN "categoryName", DROP COLUMN "parent_id", DROP COLUMN "description",
  DROP COLUMN "intent_schema",
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "name_es" SET NOT NULL,
  ALTER COLUMN "name_en" SET NOT NULL;

ALTER TABLE "service"
  DROP COLUMN "category_id", DROP COLUMN "pricing_model", DROP COLUMN "base_price",
  DROP COLUMN "min_total_price", DROP COLUMN "max_total_price", DROP COLUMN "min_units",
  DROP COLUMN "max_units", DROP COLUMN "unit_label", DROP COLUMN "lead_time_hours",
  DROP COLUMN "duration_minutes", DROP COLUMN "tags", DROP COLUMN "inclusions",
  DROP COLUMN "active", DROP COLUMN "deleted_at",
  ALTER COLUMN "description" DROP NOT NULL,
  ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

ALTER TABLE "media_asset"
  DROP COLUMN "owner_type", DROP COLUMN "owner_id", DROP COLUMN "thumbnail_url",
  DROP COLUMN "width", DROP COLUMN "height", DROP COLUMN "caption", DROP COLUMN "deleted_at",
  ALTER COLUMN "supplier_id" SET NOT NULL,
  ALTER COLUMN "storage_provider" SET DEFAULT 'google-drive';

ALTER TABLE "review"
  DROP COLUMN "booking_id", DROP COLUMN "rating_quality", DROP COLUMN "rating_communication",
  DROP COLUMN "rating_value", DROP COLUMN "rating_punctuality", DROP COLUMN "supplier_response",
  DROP COLUMN "supplier_responded_at", DROP COLUMN "hidden", DROP COLUMN "hidden_reason";

ALTER TABLE "scrape_source"
  DROP COLUMN "refresh_due_at", DROP COLUMN "takedown_requested", DROP COLUMN "takedown_requested_at";

ALTER TABLE "ai_conversation" DROP COLUMN "request_id", DROP COLUMN "model";
ALTER TABLE "ai_message" DROP COLUMN "input_tokens", DROP COLUMN "output_tokens";

-- ── 9. Indexes ─────────────────────────────────────────────────────────
-- Plain indexes that duplicated a UNIQUE index on the same column.
DROP INDEX IF EXISTS "user_email_idx";
DROP INDEX IF EXISTS "user_phone_idx";
DROP INDEX IF EXISTS "category_slug_idx";
-- Display names are not identities (two people can both be "Juan Pérez").
DROP INDEX IF EXISTS "user_name_key";
DROP INDEX IF EXISTS "supplier_city_idx";

CREATE INDEX "supplier_province_idx" ON "supplier"("province");
CREATE INDEX "supplier_service_provinces_idx" ON "supplier" USING GIN ("service_provinces");
CREATE INDEX "supplier_created_at_idx" ON "supplier"("created_at");
CREATE INDEX "contact_event_created_at_idx" ON "contact_event"("created_at");
CREATE UNIQUE INDEX "review_customer_id_supplier_id_key" ON "review"("customer_id", "supplier_id");

-- ── 10. Deleting a supplier removes what hangs off it ──────────────────
ALTER TABLE "supplier_category" DROP CONSTRAINT "supplier_category_supplier_id_fkey",
  ADD CONSTRAINT "supplier_category_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service" DROP CONSTRAINT "service_supplier_id_fkey",
  ADD CONSTRAINT "service_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_asset" DROP CONSTRAINT "media_asset_supplier_id_fkey",
  ADD CONSTRAINT "media_asset_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scrape_source" DROP CONSTRAINT "scrape_source_supplier_id_fkey",
  ADD CONSTRAINT "scrape_source_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review" DROP CONSTRAINT "review_supplier_id_fkey",
  ADD CONSTRAINT "review_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_event" DROP CONSTRAINT "contact_event_supplier_id_fkey",
  ADD CONSTRAINT "contact_event_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 11. Rating cache must match the review rows ────────────────────────
UPDATE "supplier" s SET
  "rating" = r.avg_rating,
  "review_count" = r.cnt
FROM (
  SELECT s2.supplier_id, round(avg(rv.rating)::numeric, 2) AS avg_rating, count(rv.review_id)::int AS cnt
  FROM "supplier" s2 LEFT JOIN "review" rv ON rv.supplier_id = s2.supplier_id
  GROUP BY s2.supplier_id
) r
WHERE r.supplier_id = s.supplier_id;

-- ── 12. Drop enums nothing uses any more ───────────────────────────────
DROP TYPE "Role", "AdminRole", "PromotionTier", "PricingModel", "RequestStatus", "QuoteStatus",
  "BookingStatus", "PaymentStatus", "ConversationStatus", "SenderType", "MessageType",
  "VerificationType", "VerificationStatus", "SubscriptionStatus", "PaymentType",
  "PaymentProvider", "PaymentStatusEnum", "PayoutStatus", "EventType", "EventStatus",
  "NotificationChannel", "NotificationStatus";

-- ── 13. Categories for services AND material suppliers ─────────────────
UPDATE "category" SET "icon" = v.icon, "display_order" = v.ord
FROM (VALUES ('catering','🍽️',40),('music-dj','🎧',50),('photography','📸',60),('cleaning','🧽',30),
             ('ac-repair','❄️',35),('bakery','🥖',45),('decor','🎈',55),('moving','🚚',65)) AS v(slug, icon, ord)
WHERE "category"."slug" = v.slug;

INSERT INTO "category" ("slug", "name_es", "name_en", "icon", "display_order", "updated_at") VALUES
  ('plumbing',           'Fontanería',                      'Plumbing',                  '🔧', 10, now()),
  ('electrical',         'Electricidad',                    'Electrical',                '💡', 11, now()),
  ('construction',       'Construcción y remodelación',     'Construction & remodeling', '🏗️', 12, now()),
  ('building-materials', 'Materiales de construcción',      'Building materials',        '🧱', 13, now()),
  ('carpentry',          'Carpintería',                     'Carpentry',                 '🪚', 14, now()),
  ('painting',           'Pintura',                         'Painting',                  '🎨', 15, now()),
  ('locksmith',          'Cerrajería',                      'Locksmith',                 '🔑', 16, now()),
  ('gardening',          'Jardinería',                      'Gardening',                 '🌿', 17, now()),
  ('pest-control',       'Control de plagas',               'Pest control',              '🐜', 18, now()),
  ('appliance-repair',   'Reparación de electrodomésticos', 'Appliance repair',          '🔌', 20, now()),
  ('tech-repair',        'Computadoras y celulares',        'Computers & phones',        '💻', 21, now()),
  ('auto-repair',        'Mecánica automotriz',             'Auto repair',               '🚗', 22, now()),
  ('food-groceries',     'Alimentos y abarrotes',           'Food & groceries',          '🛒', 46, now()),
  ('transport',          'Transporte',                      'Transport',                 '🚐', 66, now()),
  ('beauty',             'Belleza y cuidado personal',      'Beauty & personal care',    '💇', 70, now()),
  ('health',             'Salud y bienestar',               'Health & wellness',         '🩺', 71, now()),
  ('pets',               'Mascotas',                        'Pets',                      '🐾', 72, now()),
  ('tutoring',           'Clases y tutorías',               'Classes & tutoring',        '📚', 73, now()),
  ('other',              'Otros',                           'Other',                     '✨', 99, now())
ON CONFLICT ("slug") DO NOTHING;

DROP TABLE _geo_place;
