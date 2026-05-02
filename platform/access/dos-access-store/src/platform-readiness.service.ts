import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import type { DosNavDisabledReason } from '@dos/ui-contracts';

/**
 * PlatformReadinessService — DNA-only readiness probe.
 *
 * Probes `GET /api/health/<dna-module-code>` per platform DNA module.
 * Result feeds the nav resolver's tier-aware filter pipeline:
 *   - tier === 'dna' nav items use this for backend-offline / route-not-wired.
 *   - tier === 'module' (tenant-entitled) and tier === 'product' do NOT use it.
 *
 * Foundation gets `/api/health/foundation` today. DAuth/DNOC/DSOC/DOS/AI follow
 * the same convention as their endpoints land. 1.5s per-probe timeout, 404 → 'down'.
 */
@Injectable({ providedIn: 'root' })
export class PlatformReadinessService {
  private readonly http = inject(HttpClient);
  private readonly _health = signal<Record<string, 'unknown' | 'up' | 'down'>>({});

  readonly health = this._health.asReadonly();

  /** Per-DNA-module readiness flag. */
  ready(moduleCode: string, hasRouteCatalog: boolean): boolean {
    return hasRouteCatalog && this._health()[moduleCode] === 'up';
  }

  /** Disabled reason for a DNA nav item, or null when ready. */
  disabledReason(moduleCode: string, hasRouteCatalog: boolean): DosNavDisabledReason | null {
    if (!hasRouteCatalog) return 'route-not-wired';
    if ((this._health()[moduleCode] ?? 'unknown') !== 'up') return 'backend-offline';
    return null;
  }

  /** Probe every DNA module in the registry. Idempotent on per-call. */
  async probeAll(modules: readonly string[]): Promise<void> {
    await Promise.all(modules.map((m) => this.probeOne(m)));
  }

  private async probeOne(moduleCode: string): Promise<void> {
    const url = `/api/health/${moduleCode}`;
    const result = await firstValueFrom(
      this.http.get<{ status?: string }>(url, { withCredentials: true }).pipe(
        timeout(1500),
        catchError(() => of(null)),
      ),
    );
    const next = { ...this._health() };
    if (result === null) {
      next[moduleCode] = 'down';
    } else {
      const s = String(result.status ?? '').toLowerCase();
      next[moduleCode] = s === 'up' || s === 'ok' ? 'up' : 'down';
    }
    this._health.set(next);
  }
}
