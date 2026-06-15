import { JobExecutionResult } from '@/jobs/shopify-sync.job';

/**
 * Rastreador de estado de sincronización en memoria.
 *
 * Permite que el endpoint de admin dispare una sync de forma asíncrona
 * (fire-and-forget) y que el frontend consulte el progreso por polling.
 *
 * Nota: el estado es por proceso. Si el backend se reinicia durante una
 * sync, el estado vuelve a 'idle'. Suficiente para una herramienta de admin;
 * si se necesita historial, migrar a una tabla en DB.
 */

export type SyncState = 'idle' | 'running' | 'success' | 'partial' | 'failed';
export type SyncMode = 'full' | 'delta';

export interface SyncStatusSnapshot {
  state: SyncState;
  mode: SyncMode | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastResult: JobExecutionResult | null;
}

class SyncStatusTracker {
  private state: SyncState = 'idle';
  private mode: SyncMode | null = null;
  private startedAt: Date | null = null;
  private completedAt: Date | null = null;
  private lastResult: JobExecutionResult | null = null;

  isRunning(): boolean {
    return this.state === 'running';
  }

  /** Marca el inicio de una sync. Devuelve false si ya hay una corriendo. */
  start(mode: SyncMode): boolean {
    if (this.state === 'running') {
      return false;
    }
    this.state = 'running';
    this.mode = mode;
    this.startedAt = new Date();
    this.completedAt = null;
    this.lastResult = null;
    return true;
  }

  /** Registra el resultado final de la sync. */
  finish(result: JobExecutionResult): void {
    this.state = result.status; // 'success' | 'partial' | 'failed'
    this.completedAt = new Date();
    this.lastResult = result;
  }

  /** Registra un fallo inesperado (excepción fuera del job). */
  fail(message: string): void {
    this.state = 'failed';
    this.completedAt = new Date();
    this.lastResult = {
      jobName: this.mode === 'full' ? 'shopify-full-sync' : 'shopify-delta-sync',
      startedAt: this.startedAt ?? new Date(),
      completedAt: this.completedAt,
      duration: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      status: 'failed',
      syncResult: {
        success: false,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [message],
        startedAt: this.startedAt ?? new Date(),
        completedAt: this.completedAt,
        duration: 0,
      },
    };
  }

  snapshot(): SyncStatusSnapshot {
    return {
      state: this.state,
      mode: this.mode,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      lastResult: this.lastResult,
    };
  }
}

export const syncStatusTracker = new SyncStatusTracker();
