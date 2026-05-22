import { Request, Response } from 'express';
import { z } from 'zod';
import * as productService from '../services/product.service';

const GetProductsQuerySchema = z.object({
    skip: z.coerce.number().int().min(0).default(0),
    take: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(),
});

export const getProducts = async (req: Request, res: Response) => {
    try {
        const parsed = GetProductsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
            return;
        }
        const { skip, take, q: search } = parsed.data;

        const result = await productService.getProducts({ skip, take, search });
        res.json(result);
    } catch (error) {
        console.error('[ProductController] getProducts Error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

export const getProductByHandle = async (req: Request, res: Response) => {
    try {
        const handle = req.params.handle as string;
        if (!handle) {
            res.status(400).json({ error: 'Invalid product handle' });
            return;
        }

        const product = await productService.getProductByHandle(handle);
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json(product);
    } catch (error) {
        console.error('[ProductController] getProductByHandle Error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid product ID' });
            return;
        }

        const product = await productService.getProductById(id);
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json(product);
    } catch (error) {
        console.error('[ProductController] getProductById Error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};
