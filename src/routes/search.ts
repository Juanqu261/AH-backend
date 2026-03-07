import { Router } from 'express';
import { getProducts } from '../controllers/product.controller';

const router = Router();

// GET /api/search?q=query
// We reuse the getProducts controller since it natively supports search via the `q` query string.
router.get('/', getProducts);

export default router;
