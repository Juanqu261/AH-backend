import 'dotenv/config';
import { logger } from '@/utils/logger';
import { syncService, SyncResult } from '@/services/sync/sync.service';

/**
 * Job de sincronización que se ejecuta en base a cronograma
 * Se puede ejecutar de forma manual o automática
 */

export interface JobExecutionResult {
  jobName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
  status: 'success' | 'failed' | 'partial';
  syncResult: SyncResult;
}

class ShopifySyncJob {
  /**
   * Ejecuta la sincronización completa
   */
  async executeFullSync(): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const startedAt = new Date();

    logger.info('Starting Shopify Full Sync Job');

    try {
      const syncResult = await syncService.syncAllProducts();

      const completedAt = new Date();
      const duration = Date.now() - startTime;

      const result: JobExecutionResult = {
        jobName: 'shopify-full-sync',
        startedAt,
        completedAt,
        duration,
        status: syncResult.success ? 'success' : 'partial',
        syncResult,
      };

      logger.info('=== Full Sync Job Completed ===', {
        status: result.status,
        duration: `${duration}ms`,
        processed: syncResult.totalProcessed,
        created: syncResult.created,
        failed: syncResult.failed,
      });

      return result;
    } catch (error) {
      const completedAt = new Date();
      const duration = Date.now() - startTime;

      logger.error('=== Full Sync Job Failed ===', error);

      return {
        jobName: 'shopify-full-sync',
        startedAt,
        completedAt,
        duration,
        status: 'failed',
        syncResult: {
          success: false,
          totalProcessed: 0,
          created: 0,
          updated: 0,
          failed: 0,
          errors: [
            error instanceof Error ? error.message : String(error),
          ],
          startedAt,
          completedAt,
          duration,
        },
      };
    }
  }

  /**
   * Ejecuta una sincronización incremental (delta sync)
   * Más eficiente: solo sincroniza productos modificados desde 'since'
   */
  async executeDeltaSync(since: Date): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const startedAt = new Date();

    logger.info(`=== Starting Shopify Delta Sync Job (since ${since.toISOString()}) ===`);

    try {
      const syncResult = await syncService.syncProductsSince(since);

      const completedAt = new Date();
      const duration = Date.now() - startTime;

      const result: JobExecutionResult = {
        jobName: 'shopify-delta-sync',
        startedAt,
        completedAt,
        duration,
        status: syncResult.success ? 'success' : 'partial',
        syncResult,
      };

      logger.info('=== Delta Sync Job Completed ===', {
        status: result.status,
        duration: `${duration}ms`,
        processed: syncResult.totalProcessed,
        updated: syncResult.updated,
        failed: syncResult.failed,
      });

      return result;
    } catch (error) {
      const completedAt = new Date();
      const duration = Date.now() - startTime;

      logger.error('=== Delta Sync Job Failed ===', error);

      return {
        jobName: 'shopify-delta-sync',
        startedAt,
        completedAt,
        duration,
        status: 'failed',
        syncResult: {
          success: false,
          totalProcessed: 0,
          created: 0,
          updated: 0,
          failed: 0,
          errors: [
            error instanceof Error ? error.message : String(error),
          ],
          startedAt,
          completedAt,
          duration,
        },
      };
    }
  }
}

export const shopifySyncJob = new ShopifySyncJob();

// Permite ejecutar el job directamente desde la línea de comandos
if (require.main === module) {
  const mode = process.argv[2] || 'full';

  const run = async () => {
    try {
      if (mode === 'delta') {
        logger.info('Running Delta Sync via CLI...');
        const since = new Date();
        since.setHours(since.getHours() - 24); // Delta de 24 horas por defecto
        await shopifySyncJob.executeDeltaSync(since);
      } else {
        logger.info('Running Full Sync via CLI...');
        await shopifySyncJob.executeFullSync();
      }
      process.exit(0);
    } catch (error) {
      logger.error('CLI execution failed', error);
      process.exit(1);
    }
  };

  run();
}
