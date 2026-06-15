import { Request, Response } from 'express';
import { z } from 'zod';
import { shopifySyncJob } from '../jobs/shopify-sync.job';
import { syncStatusTracker } from '@/services/sync/sync-status';

const TriggerSyncQuerySchema = z.object({
    mode: z.enum(['full', 'delta']).default('delta'),
});

/**
 * Dispara una sync de Shopify de forma asíncrona (fire-and-forget).
 * Responde 202 inmediatamente; el frontend consulta el progreso vía
 * GET /api/admin/sync/status. Evita timeouts de proxy en full syncs largas.
 */
export const triggerSync = async (req: Request, res: Response) => {
    try {
        const parsed = TriggerSyncQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid mode parameter. Must be "full" or "delta".' });
            return;
        }
        const { mode } = parsed.data;

        // Guard de concurrencia: solo una sync a la vez.
        if (!syncStatusTracker.start(mode)) {
            res.status(409).json({ error: 'A sync is already running.' });
            return;
        }

        // Lanzar el job sin await. El tracker registra el resultado al terminar.
        const run = mode === 'full'
            ? shopifySyncJob.executeFullSync()
            : (() => {
                const since = new Date();
                since.setHours(since.getHours() - 24); // Delta de las últimas 24h
                return shopifySyncJob.executeDeltaSync(since);
            })();

        run
            .then((result) => syncStatusTracker.finish(result))
            .catch((error) => {
                console.error('[AdminController] async sync failed:', error);
                syncStatusTracker.fail(error instanceof Error ? error.message : String(error));
            });

        res.status(202).json({ status: 'started', mode });
    } catch (error) {
        console.error('[AdminController] triggerSync Error:', error);
        syncStatusTracker.fail(error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Failed to trigger sync' });
    }
};

/**
 * Devuelve el estado actual de la sync para polling desde el admin.
 */
export const getSyncStatus = (_req: Request, res: Response) => {
    res.json(syncStatusTracker.snapshot());
};
