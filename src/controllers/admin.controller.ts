import { Request, Response } from 'express';
import { z } from 'zod';
import { shopifySyncJob } from '../jobs/shopify-sync.job';

const TriggerSyncQuerySchema = z.object({
    mode: z.enum(['full', 'delta']).default('delta'),
});

export const triggerSync = async (req: Request, res: Response) => {
    try {
        const parsed = TriggerSyncQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid mode parameter. Must be "full" or "delta".' });
            return;
        }
        const { mode } = parsed.data;

        let result;
        if (mode === 'full') {
            result = await shopifySyncJob.executeFullSync();
        } else {
            const since = new Date();
            // Default to delta of last 24 hours
            since.setHours(since.getHours() - 24);
            result = await shopifySyncJob.executeDeltaSync(since);
        }

        res.json(result);
    } catch (error) {
        console.error('[AdminController] triggerSync Error:', error);
        res.status(500).json({ error: 'Failed to trigger sync' });
    }
};
