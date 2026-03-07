import { Router } from 'express';
import { triggerSync } from '../controllers/admin.controller';
import { adminAuth } from '../middleware/admin-auth';

const router = Router();

// Protect all admin routes
router.use(adminAuth);

// POST /api/admin/sync?mode=full|delta
router.post('/sync', triggerSync);

export default router;
