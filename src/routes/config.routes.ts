import { Router } from 'express';
import { getConfig } from '../controllers/config.controller';

const router = Router();

// GET /api/config
router.get('/', getConfig);

export default router;
