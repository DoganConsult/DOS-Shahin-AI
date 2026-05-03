/**
 * ShellErrorStateService — §B.9 items #25 (global error frame) and #40
 * (correlation-id display).
 *
 * Captures the most recent "shell-visible" HTTP failure (401 / 403 / 404
 * / 503-maintenance) plus the last server-supplied correlation id (from
 * `x-request-id` or `x-correlation-id`). The ShellHost reads this service
 * and renders a banner/frame above the content slot.
 *
 * Populated by `correlation-id.interceptor.ts`. Downstream page code can
 * also call `setError(...)` directly (e.g. for route-guard denials).
 *
 * Fail-soft: never throws. Signals default to null → shell renders nothing.
 */
import { Injectable, computed, signal } from '@angular/core';

export type DosShellErrorKind =
  | 'unauthorized'     // 401
  | 'forbidden'        // 403
  | 'not-found'        // 404
  | 'maintenance'      // 503 or explicit maintenance flag
  | 'server'           // 5xx not covered above
  | 'network';         // 0 / fetch failure

export interface DosShellError {
  kind: DosShellErrorKind;
  status: number;
  message: string;
  correlationId?: string | null;
  url?: string;
  at: string;           // ISO timestamp
}

@Injectable({ providedIn: 'root' })
export class ShellErrorStateService {
  private readonly _error         = signal<DosShellError | null>(null);
  private readonly _correlationId = signal<string | null>(null);

  /** Most recent shell-visible error, or null. */
  readonly error         = this._error.asReadonly();
  /** Last correlation id observed on ANY response, success or failure. */
  readonly correlationId = this._correlationId.asReadonly();
  readonly hasError      = computed(() => this._error() !== null);

  setCorrelationId(id: string | null | undefined): void {
    if (!id) return;
    this._correlationId.set(id);
  }

  setError(err: DosShellError): void {
    this._error.set(err);
  }

  clearError(): void {
    this._error.set(null);
  }

  /** Convenience: classify an HTTP status into a shell error kind. */
  static kindForStatus(status: number): DosShellErrorKind | null {
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not-found';
    if (status === 503) return 'maintenance';
    if (status === 0)   return 'network';
    if (status >= 500)  return 'server';
    return null;
  }
}
