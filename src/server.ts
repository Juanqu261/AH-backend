import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cron from 'node-cron';

import productRoutes from './routes/products';
import searchRoutes from './routes/search';
import adminRoutes from './routes/admin';
import { shopifySyncJob } from './jobs/shopify-sync.job';

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// Global Middleware
// ==========================================
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// ==========================================
// Healthcheck & Routes
// ==========================================
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Mount API Routes
app.use('/api/products', productRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// Global Error Handler
// ==========================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Global Error]', err);

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// ==========================================
// Cron Jobs Initialization
// ==========================================
const syncSchedule = process.env.SYNC_CRON_SCHEDULE || '0 */4 * * *';

if (process.env.SYNC_ENABLED !== 'false') {
    cron.schedule(syncSchedule, async () => {
        console.log(`[Cron] Triggering shopify-sync job at ${new Date().toISOString()}`);
        try {
            // TODO: Call the actual sync service/job here
            // await syncService.runDeltaSync();
        } catch (error) {
            console.error('[Cron] Error during shopify-sync execution', error);
        }
    });
    console.log(`[Cron] Scheduled shopify-sync job with expression: ${syncSchedule}`);
} else {
    console.log('[Cron] Sync job is disabled via SYNC_ENABLED=false');
}

// ==========================================
// Start Server
// ==========================================
app.listen(port, () => {
    console.log(`[Server] Running on port ${port}`);
});
