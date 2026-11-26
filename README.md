# Solvo API (dne-backend)

NestJS + GraphQL + Prisma/PostgreSQL (pgvector) API for **Solvo**: an AI chat
that connects customers in Costa Rica with the service providers and product
suppliers that serve their province. Customers don't need an account; they
contact suppliers directly.

- How it works: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Tables and the 2026-11-20 cleanup: [docs/DATABASE.md](docs/DATABASE.md)
- Working on it with Claude: [CLAUDE.md](CLAUDE.md)
- Frontend: `../dne-frontend`

## Run locally

```bash
docker run -d --name dne-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dne -p 5432:5432 pgvector/pgvector:pg17
cp .env.example .env.local        # fill in keys
npm install
npm run prisma:deploy             # apply migrations
npm run prisma:seed               # optional demo suppliers (local only)
npm run prisma:seed:admin         # optional admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run start:dev                 # http://localhost:5000/graphql
```

## Environment

See [.env.example](.env.example). Required: `DATABASE_URL`, `JWT_SECRET`,
`GOOGLE_CLIENT_ID` (verifies Google sign-in). AI: `ANTHROPIC_API_KEY` (primary) and/or
`GEMINI_API_KEY` (fallback); `OPENAI_API_KEY` only for semantic-search
embeddings (keyword search works without it).

## Scripts

| Command | What |
|---|---|
| `npm run start:dev` | API with watch (regenerates `schema.gql`) |
| `npm test` | unit tests (`*.spec.ts`) |
| `npm run build` / `start:prod` | production build / run |
| `npm run prisma:deploy` | apply migrations |
| `npm run prisma:seed` | demo suppliers (never in production) |
| `npm run prisma:seed:admin` | create/promote an admin |
| `npm run prisma:embed` | embed suppliers missing a vector |
| `npm run prisma:skills` | AI-draft skills for suppliers without any |
| `npm run geo:backfill` | fill provinces for imported suppliers (`-- --dry-run`) |

## Deploy

`Dockerfile` builds the app and runs `prisma migrate deploy` before
`node dist/src/main`. Set the env vars on the platform (Railway). After the
first deploy of the 2026-11-20 migration, run `npm run geo:backfill` if any
supplier still has no province (the admin "Suppliers by province" chart shows
them as "—").
