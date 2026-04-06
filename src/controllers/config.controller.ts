import { Request, Response } from 'express';
import { prisma } from '../config/db';

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
        const newConfig = req.body;

        if (!newConfig || typeof newConfig !== 'object') {
            res.status(400).json({ error: 'Invalid configuration format. Must be a JSON object.' });
            return;
        }

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
