# Solvo database

PostgreSQL 17 with the `vector` extension (pgvector). Schema source of truth:
[`prisma/schema.prisma`](../prisma/schema.prisma). Migrations:
[`prisma/migrations`](../prisma/migrations) — production runs
`prisma migrate deploy` on boot (see `Dockerfile`).

## Conventions

- Postgres names are `snake_case` (`@map`), code uses camelCase.
- **One fact, one column.** A yes/no that also needs a date is stored as a
  nullable timestamp only: `verified_at`, `preferred_at`, `claimed_at`
  (set = yes). The GraphQL API still exposes `verified` / `preferred` as
  computed booleans.
- Locations are **ISO 3166-2 codes** (`CR-SJ`, `CR-A`, `CR-C`, `CR-H`, `CR-G`,
  `CR-P`, `CR-L`). Names come from `src/shared/geo`, never from the DB.
- `rating` / `review_count` on `supplier` are a **cache** of the `review`
  rows, recomputed by `ReviewService` in the same transaction as any review
  write. Never write them anywhere else.

## Tables (16)

| Table | Purpose |
|---|---|
| `user` | Login identity. `is_customer` / `is_supplier` = account type, `is_admin` = permission. Social-login users have both type flags false until onboarding. |
| `oauth_account` | Google/GitHub identities linked to a user. |
| `password_reset_token` | Single-use 1 h reset tokens. |
| `customer` | Anchor for a signed-in customer's reviews and contacts (no own data). Guests never get one. |
| `supplier` | The business: name, description, skills, contacts, `province` (based in) + `service_provinces` (served, always includes `province`), `city`, `address`, `lat/lng`, rating cache, `verified_at`, `preferred_at` / `preferred_until`, `source` + `claimed_at`, `description_embedding vector(1536)`. |
| `category` | Bilingual categories (`slug`, `name_es`, `name_en`, `icon`). Seeded by migrations — services AND material/product suppliers. |
| `supplier_category` | Supplier ↔ category (1–5 per supplier, one `is_primary`). |
| `service` | Services/products listed on a profile, optional `price_from` + free-text `price_unit`. |
| `media_asset` | Profile photos (bytes in Google Drive; `display_order` 0 = cover). |
| `review` | 1–5 stars + text, **unique (customer_id, supplier_id)**. |
| `contact_event` | A customer (or guest device) reaching out to a supplier, by channel. Saved interactions, review prompts, analytics. |
| `ai_conversation` / `ai_message` | Persisted AI chats (owner: `user_id`, else `device_id`). `providers_json` keeps the cards shown under a reply. |
| `ai_usage_log` | One row per model call: model, tokens, estimated USD. |
| `scrape_source` | Raw Google Places payloads for suppliers imported by `dne-scraper`. |

Important indexes: `supplier_service_provinces_idx` (GIN, used by every chat
search), `supplier_province_idx`, `supplier_description_embedding_hnsw_idx`
(HNSW, raw SQL — see below), `review_customer_id_supplier_id_key`.

## The 2026-11-20 cleanup (`20261120000000_mvp_simplification`)

**Dropped tables** (feature removed; code on `archive/pre-mvp-simplification`):
`request`, `quote`, `quote_item`, `booking`, `payment`, `payout`,
`calendar_event`, `conversation`, `message`, `message_attachment`,
`conversation_participant_state`, `notification`, `favorite`, `verification`,
`subscription`, `pricing_plan`, `admin`, `audit_log`, `search_log`,
`supplier_service_area` (replaced by `supplier.service_provinces`).

**Redundant columns removed**

| Was | Problem | Now |
|---|---|---|
| `user.role` (`ADMIN`/`SUPPLIER`) | duplicated `is_admin` / `is_supplier`, and every customer was stored as `SUPPLIER` | `is_admin`, `is_customer`, `is_supplier` |
| `user.avatar_url` + `"profilePicture"` | same picture twice | `profile_picture` |
| `user.first_name` / `last_name` | duplicated `name`, never edited | `name` |
| `user_name_key` (unique name) | display names aren't identities ("Juan Pérez" twice broke sign-up) | not unique |
| `user_email_idx`, `user_phone_idx`, `category_slug_idx` | duplicated the unique indexes on the same columns | dropped |
| `customer.preferred_language` | duplicated `user.language` | `user.language` |
| `supplier.verified` + `verified_at` | could disagree (15 rows were verified with no date) | `verified_at` |
| `supplier.claimed` + `claimed_at` | same | `claimed_at` |
| `supplier.premium`, `promotion_tier` + start/end | two ways to say "boost this supplier" | `preferred_at` / `preferred_until` |
| `supplier.source_external_id` | duplicated `scrape_source.external_id` | `scrape_source` |
| `supplier.subscription_id` | duplicated `subscription.user_id` (both removed) | — |
| `category."categoryName"` | duplicated `name_en` | `name_en` / `name_es` |
| `service.category_id` | duplicated the supplier's categories | supplier categories |
| `service.active` + `deleted_at` | two "hidden" flags | hard delete |
| `media_asset.owner_type` / `owner_id` | duplicated `supplier_id` | `supplier_id` |
| `media_asset.deleted_at` | rows are hard-deleted | — |
| `ai_conversation.model` | per-message `ai_message.model` already says who answered (and the model is no longer user-picked) | `ai_message.model` |
| `ai_message.input_tokens` / `output_tokens` | duplicated `ai_usage_log` | `ai_usage_log` |
| `review` sub-ratings, `supplier_response`, `hidden*`, `booking_id` | unused / booking-only | `rating` + `text` |
| `"companyName"`, `"profilePicture"`, `"categoryName"` | camelCase column names | snake_case |

Also unused and dropped: `supplier.slug`, `min/max_capacity`,
`response_time_minutes`, `customer.default_*`, `marketing_opt_in`,
`user.timezone`, `phone_verified_at`, `last_login_at`,
`scrape_source.refresh_due_at`, `takedown_*`, 22 enums.

**Data kept and transformed** before anything was dropped: provinces
backfilled from `city` and the old service-area cities; `verified_at` /
`claimed_at` filled from the booleans; FEATURED promotions → `preferred_at`;
`base_price` → `price_from`; pricing model → `price_unit`; duplicate reviews
(same customer + supplier) collapsed to the newest; rating cache recomputed
from real reviews (seeded fake counts like "251 reviews" became the real
count); 19 new categories added (plumbing, electrical, building materials…).

## Applying migrations

- **Production / fresh DB:** `npm run prisma:deploy` (also runs on container
  start).
- **A DB created with `prisma db push`** (no `_prisma_migrations` table — this
  was the local Docker DB): apply the SQL once, then baseline:
  ```bash
  docker exec -i dne-postgres psql -U postgres -d dne < prisma/migrations/20261120000000_mvp_simplification/migration.sql
  for m in $(ls prisma/migrations | grep -v toml); do npx prisma migrate resolve --applied $m; done
  ```
  The local DB was migrated this way on 2026-11-20 (backup taken first:
  `E:\DnE\dne-backup-pre-mvp-2026-11-20.dump`).
- **After importing suppliers** with `dne-scraper`: `npm run geo:backfill`
  fills `province` / `service_provinces` from coordinates or city.

## The raw HNSW index

`supplier_description_embedding_hnsw_idx` is created in raw SQL in
`0_initial_schema` because Prisma can't express pgvector indexes. As a result
`prisma migrate diff` / `migrate dev` always propose
`DROP INDEX "supplier_description_embedding_hnsw_idx"` — **remove that line**
from any generated migration.

## Changing the schema

1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --create-only --name <change>` against a DB that
   has the migration history, review the SQL (data moves before drops; remove
   the HNSW drop), then `npx prisma migrate dev`.
3. `npm run prisma:generate`, restart the API (regenerates `schema.gql`), then
   in `dne-frontend` run `npm run generate-graphql-schema`.
4. If `dne-scraper` writes the changed table, update
   `../dne-scraper/src/persist.ts` and run its `npm run sync-schema`.
