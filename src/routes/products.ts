import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/product.controller';

const router = Router();

// GET /api/products
router.get('/', getProducts);

// GET /api/products/:id
router.get('/:id', getProductById);

export default router;
