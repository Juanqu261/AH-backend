import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';

const CollectionSchema = z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    products: z.array(z.string()),
});

const SiteConfigSchema = z.object({
    spottedProduct: z.string().min(1),
    catalogRecommendations: z.array(z.string()),
    collections: z.array(CollectionSchema),
});

// Seed data based on public/site.config.json
const DEFAULT_CONFIG = {
    spottedProduct: "chanel-n-5",
    catalogRecommendations: [
        "chanel-n-5",
        "dior-sauvage-edp"
    ],
    collections: [
        {
            slug: "avant-garde",
            name: "The Avant-Garde",
            description: "Bold, architectural compositions for the unafraid.",
            products: [
                "sample-mind-games-vieri",
                "yara-lattafa-pink",
                "lattafa-fakhar-for-men"
            ]
        },
        {
            slug: "heritage",
            name: "Heritage",
            description: "Timeless silhouettes reinterpreted for the modern collector.",
            products: [
                "club-de-nuit-untold",
                "lattafa-khamrah-qahwa"
            ]
        }
    ]
};

export const getConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        let siteConfig = await prisma.siteConfig.findUnique({
            where: { id: 1 }
        });

        if (!siteConfig) {
            // Give them the default if it doesn't exist yet
            res.json(DEFAULT_CONFIG);
            return;
        }

        res.json(siteConfig.config);
    } catch (error) {
        console.error('[ConfigController] Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = SiteConfigSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid configuration', details: parsed.error.flatten() });
            return;
        }
        const newConfig = parsed.data;

        const siteConfig = await prisma.siteConfig.upsert({
            where: { id: 1 },
            update: { config: newConfig },
            create: { id: 1, config: newConfig }
        });

        res.json({ success: true, config: siteConfig.config });
    } catch (error) {
        console.error('[ConfigController] Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
};
