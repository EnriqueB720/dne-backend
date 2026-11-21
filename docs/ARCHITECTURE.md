# Solvo API — Architecture

Solvo connects people in Costa Rica with **local service providers** (plumbers,
electricians, cleaners, DJs…) and **product / material suppliers** (bakeries,
hardware and building-material stores…). A customer describes what they need
in the AI chat; Solvo shows the real suppliers that serve their province, with
their contact details. The customer contacts the supplier directly — there is
no booking, quote or payment flow.

This repo is the NestJS + GraphQL API. The Next.js app lives in `dne-frontend`.
Data model details are in [DATABASE.md](./DATABASE.md).

> History: until 2026-11-20 the app also had requests → quotes → bookings,
> customer↔supplier live chat, notifications, favorites, packages, calendars,
> subscriptions and payments. All of that was removed in the MVP
> simplification. The full code is on the `archive/pre-mvp-simplification`
> branch in both repos if anything needs to come back.

## Stack

| Piece | What |
|---|---|
| NestJS 11 | HTTP + GraphQL (Apollo, code-first, `schema.gql` is generated on boot) |
| Prisma 6 | PostgreSQL 17 + **pgvector** (`supplier.description_embedding`) |
| Auth | Own JWT (1 h, renewed by the frontend every 15 min); Google/GitHub via NextAuth on the frontend → `socialLogin` mutation |
| AI | Claude (`@anthropic-ai/sdk`) first, Gemini (`@google/genai`) as automatic fallback. OpenAI only for embeddings |
| Storage | Google Drive for supplier photos (streamed back through `GET /files/media/:id`) |
| Ops | pino logs, Sentry, throttling (`@nestjs/throttler`), `/health` |

## Module map (`src/`)

```
api/
  user/          me, updateMe                           (JWT)
  supplier/      public profile, browse, AI search, owner edits, stats
  service/       saveMyService, deleteMyService         (JWT, owner)
  category/      categories (bilingual)
  review/        supplierReviews (public), saveReview / deleteReview (JWT customer)
  contact/       logSupplierContact (guest ok), mySavedContacts, review prompts
  chat/          ChatService (Claude → Gemini), aiComplete, persisted AI chats
  embedding/     OpenAI text-embedding-3-small wrapper
  ai-usage-log/  one row per model call (tokens + estimated cost)
  admin/         adminOverview, adminSuppliers, verify, preferred (JWT + admin)
shared/
  auth/          login, signup, socialLogin, completeOnboarding, refresh, password reset; guards
  geo/           Costa Rica provinces/cantons registry + province resolution
  google-drive/  POST /files/upload (JWT), GET /files/media/:id
  decorators/    @GraphQLFields (GraphQL selection → Prisma select), @CurrentUser
  config/, datasource/prisma/, email/ (Resend), health/, throttler/
scripts/         backfills (embeddings, skills, provinces)
```

## Core flows

### 1. AI chat search (the product)

The frontend orchestrates a turn (see `dne-frontend/docs/ARCHITECTURE.md`); the
API provides three pieces:

1. **`aiComplete`** — stateless completion used for intent parsing.
2. **`searchSuppliers(data: SupplierSearchInput)`** — the DB lookup.
3. **`sendAiMessage`** — persists the user message, calls the model with the
   conversation history + a grounding block describing the suppliers found,
   persists the reply.

`SupplierService.search` (`src/api/supplier/supplier.service.ts`):

- **Zone first.** `GeoService.resolve` picks ONE province (ISO 3166-2, e.g.
  `CR-H`) in this order: an explicit `province` the user picked → a place
  named in the message (`location`, e.g. "Escazú" → `CR-SJ`) → the device
  coordinates (`lat/lng`, nearest known canton). When a province resolves the
  search is **strict**: only suppliers whose `service_provinces` contain it.
  With no province the search is nationwide and the AI asks where.
- **Relevance.** pgvector cosine similarity on the supplier embedding
  (threshold `SUPPLIER_SEMANTIC_MAX_DISTANCE`, default 0.65), topped up by a
  keyword pass over name / tagline / description / skills / services /
  categories when the vector pool is thin or `OPENAI_API_KEY` is missing.
- **Only reachable suppliers.** Rows without any phone / WhatsApp / email /
  website are never returned.
- **Order.** Active *preferred* (admin-pinned) → based in the province →
  relevance. Up to `limit` (default 6, max 20). The chat shows exactly what
  comes back — it never pads results with invented suppliers.

The result also returns the resolved `province { code name source }` so the UI
and the AI can say "in Heredia".

### 2. Claude first, Gemini fallback (`src/api/chat/chat.service.ts`)

Every model call in the app (parser, chat replies, skill drafting) goes
through `ChatService.send`. The chain is fixed — the client cannot choose:

```
Claude (ANTHROPIC_MODEL, default claude-haiku-4-5)  ─ 2 attempts, 30 s timeout each
  └─ on error / timeout / refusal → Gemini (GEMINI_MODEL, default gemini-2.5-flash)
       └─ on error → 503 "The assistant is unavailable right now"
```

A provider whose key is unset is skipped. The answering provider is stored on
`ai_message.model` and logged to `ai_usage_log`. The stable part of the system
prompt is sent as `cachedSystem` (Anthropic prompt caching); the per-turn
grounding as `system` (max 12 000 chars — validated).

### 3. Contacts = customer↔supplier interactions

Tapping "Contact" or any phone / WhatsApp / email / website link calls
`logSupplierContact` → one `contact_event` row (24 h dedupe per person per
supplier). Guests are keyed by the browser `deviceId`; after sign-in
`mergeGuestContacts` moves them to the customer. These rows feed:

- the customer's **saved interactions** (`mySavedContacts`, page `/dashboard`),
- the **"How did it go?" prompt** (`reviewPrompts`, after
  `REVIEW_PROMPT_DELAY_HOURS`, default 48),
- the supplier's own stats (`mySupplierStats`) and the admin analytics.

### 4. Reviews

`saveReview` is an upsert — one review per customer per supplier (DB unique).
Only signed-in **customer** accounts can review; suppliers can't review
themselves. The supplier's `rating` / `review_count` columns are a cache
recomputed in the same transaction. `supplierReviews` returns a hand-built
`ReviewView` (reviewer shown as "Andrea R.") so no personal data can leak.

### 5. Suppliers manage their own page

`mySupplier`, `updateMySupplier`, `setMySupplierCategories` (1–5),
`setMySupplierSkills`, `suggestMySupplierSkills` (AI draft), `saveMyService`,
`deleteMyService`, `deleteMySupplierMedia`, `reorderMySupplierMedia`, plus
`POST /files/upload` (`ownerType=supplier`). The supplier is always taken from
the token (`SupplierService.supplierIdForUser`) — there is no supplierId
argument anyone could forge. Profile changes re-embed the supplier and, while
the skill list is empty, let the AI draft skills (fire-and-forget).

### 6. Admin

`@UseGuards(JwtAuthGuard, AdminGuard)` — `AdminGuard` re-reads `user.is_admin`
on every call. Operations:

- `adminOverview(days)` — new suppliers ("new supplier incomes"), new
  customers, contacts (total, unique people, by channel, per day), suppliers by
  province, top contacted suppliers, AI chats.
- `adminSuppliers(filter)` — paged table (search, province, status
  `UNVERIFIED | VERIFIED | PREFERRED`), includes owner email.
- `adminSetSupplierVerified(supplierId, verified)` — sets/clears `verified_at`.
- `adminSetSupplierPreferred({ supplierId, preferred, until })` — sets
  `preferred_at` / `preferred_until`; preferred suppliers rank first in their
  province. (Paid placement can hook in here later.)

Create an admin with `npm run prisma:seed:admin` (env `ADMIN_EMAIL`,
`ADMIN_PASSWORD`) or set `is_admin = true` on a user.

## Security model

| Surface | Rule |
|---|---|
| Public | `supplier`, `suppliers`, `searchSuppliers`, `categories`, `provinces`, `resolveProvince`, `supplierReviews`, `aiComplete`, AI chat (guest by deviceId), `logSupplierContact`, auth mutations |
| JWT | everything named `my…` / `…Me`, reviews, saved contacts, uploads |
| JWT + admin | everything named `admin…` |

- Owner checks always come from the token, never from input ids.
- `ValidationPipe` is global (registered before `listen`) so `class-validator`
  limits are enforced (e.g. chat `system` ≤ 12 000, `cachedSystem` ≤ 16 000).
- Throttling: 100 req/min/IP globally; `aiComplete` 20/min; login 5/min;
  signup 3/min; `logSupplierContact` 30/min; `searchSuppliers` 60/min.
- The `Supplier` GraphQL type never exposes the owning user (email/phone);
  admins see the owner email through `adminSuppliers` only.

**Known risk (follow-up):** prompts are built on the frontend and sent through
`aiComplete` / `sendAiMessage`, so anyone can use those endpoints as a
rate-limited LLM proxy. Moving the parser and chat prompts server-side (a
single `chatTurn` mutation) would close it.

## Geography (`src/shared/geo`)

- `countries/cr.ts` — 7 provinces (ISO 3166-2) + all 84 cantons + popular
  towns/beaches with coordinates. Add places there.
- `GeoService.fromText` — a province name in the text wins (last one
  mentioned, so "San Rafael de Alajuela" → Alajuela); otherwise the longest
  known place name.
- `GeoService.fromCoordinates` — nearest known place within 60 km, inside the
  country's bounding box.
- New country = new file in `countries/` + entry in `geo.registry.ts`. The DB
  only stores codes, so no migration is needed.

## Computed GraphQL fields

`Supplier.verified`, `preferred`, `provinceName`, `serviceProvinceNames` are
not columns. `@GraphQLFields` (`src/shared/decorators/graphql-fields.ts`)
replaces them with the columns they need (`COMPUTED_FIELDS`), and
`SupplierResolver` computes them with `@ResolveField`. Add new computed fields
in both places.

## Running it

See the [README](../README.md).
