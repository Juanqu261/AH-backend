import { Request, Response } from 'express';
import { shopifySyncJob } from '../jobs/shopify-sync.job';

export const triggerSync = async (req: Request, res: Response) => {
    try {
        const mode = req.query.mode === 'full' ? 'full' : 'delta';

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
