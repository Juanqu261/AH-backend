# AH-Backend

Express + Prisma service for the Adagioz & Harmonie catalog. Syncs products from Shopify, enriches them with Claude (Haiku) to extract fragrance notes, and exposes a small public API plus an admin surface.

## Modules

```
src/
  server.ts                # Express bootstrap, route mounting 
  config/                  # Zod-validated env (DB, Shopify, Anthropic)
  routes/                  # Express routers
    products.ts            # GET /api/products, /:id, /handle/:handle
    search.ts              # GET /api/search?q=
    config.routes.ts       # GET /api/config (public site config)
    admin.ts               # POST /api/admin/sync, GET /api/admin/verify
    admin-config.routes.ts # PUT /api/admin/config
  controllers/             # Request handlers (thin — delegate to services)
  middleware/
    admin-auth.ts          # x-admin-key check against SYNC_ADMIN_KEY
  services/
    shopify/               # GraphQL client + product fetch
    llm/                   # Claude Haiku call for note extraction
    sync/                  # Orchestrates full/delta sync into Prisma
    product.service.ts     # Paginated queries, handle lookup
  jobs/
    shopify-sync.job.ts    # Cron-scheduled sync (also runnable as a script)
prisma/
  schema.prisma            # SiteConfig, Product, ProductVariant, ProductImage
```

## API surface (short)

Public:
- `GET /api/products?skip&take` — paginated catalog
- `GET /api/products/:id` — by DB id
- `GET /api/products/handle/:handle` — by Shopify handle
- `GET /api/search?q=` — name/description match
- `GET /api/config` — site config JSON for the frontend

Admin (require `x-admin-key: $SYNC_ADMIN_KEY`):
- `GET /api/admin/verify` — 200 if key valid (used by the frontend guard)
- `POST /api/admin/sync?mode=full|delta` — trigger a sync
- `PUT /api/admin/config` — overwrite the site config

## Run locally

```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL, SHOPIFY_*, ANTHROPIC_API_KEY, SYNC_ADMIN_KEY
npm install
npm run prisma:generate
npm run prisma:migrate     # creates tables on a fresh DB
npm run dev                # http://localhost:3000
```

Smoke-test:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/products?skip=0&take=5
```

## Sync commands

```bash
npm run sync:full          # replace all products
npm run sync:delta         # products updated in the last 7 days
```

A delta sync also runs on the `SYNC_CRON_SCHEDULE` (default `0 0 * * 0`, weekly). Set `SYNC_ENABLED=false` to disable the cron.

## Spanish translations

Each `Product` row carries Spanish-translated copies of its key fields alongside the English originals:

| English (source) | Spanish |
|---|---|
| `name` | `nameEs` |
| `description` | `descriptionEs` |
| `principalNotes` | `principalNotesEs` |

A `translationSourceHash` column stores a sha256 of the English `title::description` at the moment the translation was produced. Translations are generated inside `processProduct()` (`src/services/sync/sync.service.ts`) via `translationService.translateProductToSpanish()` (`src/services/llm/translation.service.ts`), which calls Claude Haiku 4.5 with a prompt that explicitly forbids translating commercial fragrance/brand names (e.g. "Aventus", "Sauvage", "Baccarat Rouge 540" must remain unchanged).

A product is (re-)translated only when one of these is true, which keeps API spend flat and avoids wording drift across syncs:

- `translationSourceHash` is `NULL` (never translated yet), **or**
- the current source hash differs from the stored one (the English copy changed in Shopify), **or**
- `descriptionEs` is `NULL`.

### Forcing a re-translation later

If you want to re-translate everything without wiping data (e.g. after improving the prompt):

```sql
UPDATE "Product" SET "translationSourceHash" = NULL;
```

Then run `npm run translate:backfill` again. To re-translate a single product, scope the `UPDATE` with a `WHERE` clause.

## Required env vars

`DATABASE_URL`, `SHOPIFY_STORE`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `SYNC_ADMIN_KEY`, `FRONTEND_URL`. See `.env.example`.
