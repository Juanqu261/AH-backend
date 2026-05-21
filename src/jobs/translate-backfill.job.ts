import 'dotenv/config';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { translationService } from '@/services/llm/translation.service';
import { PrincipalNotes } from '@/services/llm/llm.service';

/**
 * Backfill de traducciones al español sobre productos ya existentes en la DB.
 * No toca Shopify — recorre `Product` y traduce todas las filas cuyo
 * `translationSourceHash` sea NULL o cuya copia en inglés haya cambiado
 * desde la última traducción.
 */

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
    const startedAt = new Date();
    logger.info('=== Starting Spanish translation backfill ===');

    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            description: true,
            principalNotes: true,
            descriptionEs: true,
            translationSourceHash: true,
        },
    });

    logger.info(`Found ${products.length} product(s) in DB`);

    let translated = 0;
    let skipped = 0;
    let failed = 0;

    for (const p of products) {
        const sourceHash = createHash('sha256')
            .update(`${p.name}::${p.description ?? ''}`)
            .digest('hex');

        const needsTranslation =
            !p.translationSourceHash ||
            p.translationSourceHash !== sourceHash ||
            !p.descriptionEs;

        if (!needsTranslation) {
            skipped++;
            continue;
        }

        try {
            logger.info(`Translating to Spanish: ${p.name}`);
            const result = await translationService.translateProductToSpanish({
                name: p.name,
                description: p.description ?? null,
                principalNotes: (p.principalNotes as PrincipalNotes | null) ?? null,
            });

            if (!result) {
                failed++;
                logger.warn(`Translation returned null for ${p.name}`);
                continue;
            }

            await prisma.product.update({
                where: { id: p.id },
                data: {
                    nameEs: result.nameEs,
                    descriptionEs: result.descriptionEs,
                    principalNotesEs: result.principalNotesEs as any,
                    translationSourceHash: sourceHash,
                },
            });

            translated++;
            logger.info(`Spanish translation populated for ${p.name}`);
        } catch (error) {
            failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to translate product ${p.id} (${p.name})`, { error: errorMsg });
        }
    }

    const duration = Date.now() - startedAt.getTime();
    logger.info('=== Translation backfill completed ===', {
        total: products.length,
        translated,
        skipped,
        failed,
        duration: `${duration}ms (${(duration / 1000).toFixed(1)}s)`,
    });
}

if (require.main === module) {
    run()
        .then(() => process.exit(0))
        .catch((error) => {
            // Print full error to stderr — the logger drops non-enumerable
            // fields like Prisma's `.message`, hiding the real cause.
            console.error('Backfill CLI failed:');
            console.error(error);
            process.exit(1);
        });
}
