import { Request, Response } from 'express';
import * as productService from '../services/product.service';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
        const take = req.query.take ? parseInt(req.query.take as string, 10) : 20;
        const search = req.query.q as string | undefined;

        const result = await productService.getProducts({ skip, take, search });
        res.json(result);
    } catch (error) {
        console.error('[ProductController] getProducts Error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
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
