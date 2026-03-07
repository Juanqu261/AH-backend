# AH-Backend

Backend and database service for the AdagiozAndHarmonie catalog application.

## API Endpoints

### Public Endpoints
- **`GET /api/products`**
  - Fetches a paginated list of products available in the catalog.
  - Query parameters: `?skip=0&take=20`
- **`GET /api/products/:id`**
  - Fetches details of a single product by its database ID, including variants and images.
- **`GET /api/search`**
  - Searches for products containing a specific string in their name or description.
  - Query parameters: `?q=search_term&skip=0&take=20`

### Admin Endpoints
- **`POST /api/admin/sync`**
  - Triggers a manual synchronization job with Shopify.
  - Query parameters: `?mode=full` or `?mode=delta` (defaults to delta).
  - **Security:** Requires an `x-admin-key` header or an `Authorization: Bearer <KEY>` header that matches the `SYNC_ADMIN_KEY` environment variable.

## Shopify Synchronization

The backend is connected to the Shopify GraphQL interface to fetch product data and automatically update the Neon PostgreSQL database.

**Automatic Synchronization (Cron Job):**
By default, the backend schedules a background task using `node-cron` that runs every 4 hours. It performs a **delta sync**, pulling only products that have been modified within the last 4 hours. This behavior is controlled by the `SYNC_CRON_SCHEDULE` and `SYNC_ENABLED` environment variables.

**Manual Synchronization:**
You can also manually trigger a synchronization through the Admin API endpoint mentioned above, or directly via the command line:
```bash
# Run a full synchronization
npm run sync:full

# Run a delta synchronization (last 24 hours)
npm run sync:delta
```
