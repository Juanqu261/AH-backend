import { Router } from 'express';
import { getProducts, getProductById, getProductByHandle } from '../controllers/product.controller';

const router = Router();

// GET /api/products
router.get('/', getProducts);

// GET /api/products/handle/:handle (must precede /:id)
router.get('/handle/:handle', getProductByHandle);

// GET /api/products/:id
router.get('/:id', getProductById);

export default router;
