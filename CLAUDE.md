# CLAUDE.md — Solvo API

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DATABASE.md](docs/DATABASE.md) before changing behaviour or schema.

## Product in one paragraph

Solvo only connects a customer with a supplier. The customer asks the AI chat
for something ("fontanero en Heredia"), the API returns the **real** suppliers
from the DB that serve that **province**, and the customer contacts them
directly (phone / WhatsApp / email / website). No bookings, quotes, payments
or in-app messaging. Customers may stay anonymous; signing in only adds saved
contacts and reviews. Suppliers edit their own page; admins verify suppliers
and mark some as preferred.

## Rules that matter

- **Never return or invent suppliers that aren't in the DB.** The chat shows
  exactly what `searchSuppliers` returns.
- **AI calls go through `ChatService.send` only.** Claude first, Gemini
  fallback, fixed order. Don't add a model parameter to any input.
- **Ownership comes from the token.** Use `supplierIdForUser(userId)` /
  `@CurrentUser()`; never accept a supplierId/userId from input for writes.
  Admin resolvers use `@UseGuards(JwtAuthGuard, AdminGuard)`.
- **One fact, one column** (see DATABASE.md). Don't add `isX` booleans next to
  `xAt` timestamps; add a computed GraphQL field instead
  (`COMPUTED_FIELDS` in `shared/decorators/graphql-fields.ts` +
  `@ResolveField` in the resolver).
- **Provinces are ISO 3166-2 codes.** Names and place lookups live in
  `src/shared/geo`. `supplier.service_provinces` must always include
  `supplier.province` (use `GeoService.normalizeServiceProvinces`).
- **GraphQL is the API.** The only REST endpoint is `GET /health`.
- **Prompts live server-side** in `src/api/assistant` (`prompts.ts`,
  `intent.ts`). The client sends only the message and where the user is
  (`chatTurn`). Never add an endpoint that accepts a prompt from the client.
- **No supplier photos.** They were removed on purpose (keep it minimal).
- Migrations: move data before dropping; strip the HNSW index drop that
  `prisma migrate diff` always proposes.

## Commands

```bash
npm run start:dev        # API on :5000, writes schema.gql
npx tsc --noEmit         # type-check
npm test                 # unit tests (geo, chat fallback, chat turn)
npm run prisma:generate  # after schema edits
```

After any GraphQL change, regenerate the frontend client:
`cd ../dne-frontend && npm run generate-graphql-schema` (API must be running).

## Workflow

New branch per piece of work, commit and push; the team opens PRs themselves.
