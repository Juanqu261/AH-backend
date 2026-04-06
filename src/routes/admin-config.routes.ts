import { Router } from 'express';
import { updateConfig } from '../controllers/config.controller';
import { adminAuth } from '../middleware/admin-auth';

const router = Router();

// We know this will be mounted at /api/admin/config
router.put('/', adminAuth, updateConfig);

export default router;
