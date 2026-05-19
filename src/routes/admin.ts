import { Router } from 'express';
import { triggerSync } from '../controllers/admin.controller';
import { adminAuth } from '../middleware/admin-auth';

const router = Router();

// Protect all admin routes
router.use(adminAuth);

// POST /api/admin/sync?mode=full|delta
router.post('/sync', triggerSync);

// GET /api/admin/verify — middleware does the actual key check
router.get('/verify', (_req, res) => {
    res.json({ ok: true });
});

export default router;
