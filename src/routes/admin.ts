import { Router } from 'express';
import { triggerSync, getSyncStatus } from '../controllers/admin.controller';
import { adminAuth } from '../middleware/admin-auth';

const router = Router();

// Protect all admin routes
router.use(adminAuth);

// POST /api/admin/sync?mode=full|delta — dispara la sync (async, responde 202)
router.post('/sync', triggerSync);

// GET /api/admin/sync/status — estado actual para polling
router.get('/sync/status', getSyncStatus);

// GET /api/admin/verify — middleware does the actual key check
router.get('/verify', (_req, res) => {
    res.json({ ok: true });
});

export default router;
