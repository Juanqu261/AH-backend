import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to protect /api/admin routes using a simple API key
 * defined in SYNC_ADMIN_KEY environment variable.
 */
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const adminKey = process.env.SYNC_ADMIN_KEY;

    if (!adminKey) {
        console.error('[Security] SYNC_ADMIN_KEY is not defined in environment variables.');
        // We fail closed if the key isn't setup properly to avoid exposing admin routes
        res.status(500).json({ error: 'Server configuration error.' });
        return;
    }

    // Check for the key in 'x-admin-key' header or standard 'Authorization' header
    const providedKey = req.headers['x-admin-key'] || req.headers.authorization;

    if (!providedKey) {
        res.status(401).json({ error: 'Unauthorized: Admin key required.' });
        return;
    }

    // Support simply passing the key or passing it as a Bearer token
    const isMatch = providedKey === adminKey || providedKey === `Bearer ${adminKey}`;

    if (isMatch) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid admin key.' });
    }
};
