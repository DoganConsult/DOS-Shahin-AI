import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import { MessageService } from 'primeng/api';
import { StorageService } from '@app/infrastructure';

/**
 * Global Error Handler for centralized error reporting.
 *
 * Catches all unhandled errors in the Angular application:
 * - Suppresses HTTP errors that are expected (401/403/404/502/503/504) — handled by interceptors
 * - Logs errors to console (dev) with per-window rate limiting (max 10 per 30s)
 * - Shows user-friendly error notifications via PrimeNG Toast for genuine app errors
 * - Prevents duplicate notifications with 5-second cooldown and per-hash dedup
 *
 * Requirements: ui-ux-e3
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private messageService = inject(MessageService);
  private readonly storage = inject(StorageService);

  private lastToastTime = 0;
  private toastsInWindow = 0;
  private windowResetTimer: ReturnType<typeof setTimeout> | null = null;
  private recentMessageHashes = new Set<string>();

  private consoleLogCount = 0;
  private consoleLogWindowStart = 0;

  private static readonly TOAST_COOLDOWN_MS = 5_000;
  private static readonly MAX_TOASTS_PER_WINDOW = 2;
  private static readonly WINDOW_RESET_MS = 30_000;
  private static readonly DEDUP_WINDOW_MS = 30_000;
  private static readonly MAX_CONSOLE_LOGS_PER_WINDOW = 10;
  private static readonly CONSOLE_LOG_WINDOW_MS = 30_000;
  private static suppressUntil = 0;

  static suppressFor(ms: number): void {
    GlobalErrorHandler.suppressUntil = Date.now() + ms;
  }

  private shouldLogToConsole(): boolean {
    const now = Date.now();
    if (now - this.consoleLogWindowStart > GlobalErrorHandler.CONSOLE_LOG_WINDOW_MS) {
      this.consoleLogWindowStart = now;
      this.consoleLogCount = 0;
    }
    if (this.consoleLogCount >= GlobalErrorHandler.MAX_CONSOLE_LOGS_PER_WINDOW) return false;
    this.consoleLogCount++;
    return true;
  }

  private get currentLang(): 'ar' | 'en' {
    try {
      return (document.documentElement.lang || this.storage.get('grc_lang') || 'en') === 'ar' ? 'ar' : 'en';
    } catch { return 'en'; }
  }

  handleError(error: any): void {
    try {
      const unwrapped = error?.rejection ?? error;

      if (unwrapped instanceof HttpErrorResponse) {
        const status = unwrapped.status;
        if (status === 401 || status === 403 || status === 404 || status === 0
          || status === 502 || status === 503 || status === 504) {
          return;
        }
        if (!environment.production && this.shouldLogToConsole()) {
          console.warn(`[GlobalErrorHandler] Unhandled HTTP ${status}:`, unwrapped.url);
        }
        return;
      }

      const err = unwrapped instanceof Error
        ? unwrapped
        : new Error(typeof unwrapped === 'string' ? unwrapped : JSON.stringify(unwrapped));

      const msg: string = err.message || (typeof unwrapped === 'string' ? unwrapped : 'Unknown error');

      const isNetworkError =
        msg.includes('HttpErrorResponse') ||
        msg.includes('Network') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Load failed');

      const isStoreError =
        msg.includes('Cannot read properties of') ||
        msg.includes('is not a function') ||
        msg.includes('undefined is not an object');

      const isChunkOrNavError =
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('NavigationCancel') ||
        msg.includes('NG04002');

      const is403Cascade =
        msg.includes('403') ||
        msg.includes('Access denied') ||
        msg.includes('Forbidden') ||
        msg.includes('OFFLINE_NO_CACHE');

      if (isNetworkError || isStoreError || isChunkOrNavError || is403Cascade) return;

      const now = Date.now();
      if (now < GlobalErrorHandler.suppressUntil) return;

      const msgHash = msg.slice(0, 120);
      const alreadySeen = this.recentMessageHashes.has(msgHash);
      if (!alreadySeen) {
        this.recentMessageHashes.add(msgHash);
        setTimeout(() => this.recentMessageHashes.delete(msgHash), GlobalErrorHandler.DEDUP_WINDOW_MS);
      }

      if (!alreadySeen && this.shouldLogToConsole()) {
        const errorDetails = {
          message: err.message,
          name: err.name,
          stack: err.stack,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : '',
        };
        if (!environment.production) {
          console.error('[GlobalErrorHandler] Unhandled error:', errorDetails);
        } else {
          console.error(`[Error] ${err.name}: ${err.message}`);
        }
      }

      this.reportToObservability({ message: err.message, name: err.name, stack: err.stack, timestamp: new Date().toISOString() });

      if (alreadySeen) return;
      if (this.toastsInWindow >= GlobalErrorHandler.MAX_TOASTS_PER_WINDOW) return;

      if ((now - this.lastToastTime) > GlobalErrorHandler.TOAST_COOLDOWN_MS) {
        this.lastToastTime = now;
        this.toastsInWindow++;
        if (!this.windowResetTimer) {
          this.windowResetTimer = setTimeout(() => {
            this.toastsInWindow = 0;
            this.windowResetTimer = null;
          }, GlobalErrorHandler.WINDOW_RESET_MS);
        }
        try {
          this.messageService.add({
            severity: 'error',
            summary: this.currentLang === 'ar' ? 'خطأ في التطبيق' : 'Application Error',
            detail: this.currentLang === 'ar'
              ? 'حدث خطأ غير متوقع. يرجى تحديث الصفحة أو التواصل مع الدعم إذا استمرت المشكلة.'
              : 'An unexpected error occurred. Please refresh the page or contact support if the problem persists.',
            life: 5000,
          });
        } catch (toastError) {
          console.error('[GlobalErrorHandler] Failed to show error toast:', toastError);
        }
      }
    } catch {
      // Never throw from the global error handler
    }
  }

  private reportToObservability(payload: Record<string, unknown>): void {
    try {
      const obs = (environment as { observability?: { enabled?: boolean; errorReportingUrl?: string } })
        .observability;
      if (!obs?.enabled || !obs.errorReportingUrl?.trim()) return;
      fetch(obs.errorReportingUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* never throw */
    }
  }
}
