/**
 * Layer 6 of the Carbon-only enforcement stack — client-side allowlist guard.
 *
 * Fetches the server-side allowlist from
 * `/api/foundation/dynamic-ui/allowlist` (Layer 2) at app bootstrap and
 * exposes a `verify(componentKey)` API that any caller can invoke before
 * rendering. Fail-closed semantics: if the allowlist hasn't loaded yet,
 * verify() returns false and the caller MUST refuse to render.
 *
 * The contract is intentionally narrow: this guard does NOT resolve the
 * Angular Type<T> for a key — that stays in the existing
 * WidgetRegistryService / component-class-resolver path. Layer 6 is a
 * pure allow/deny gate sitting in front of those resolvers.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

export interface AllowlistRow {
  component_key: string;
  carbon_key: string | null;
  catalog_package_name: string;
  catalog_package_version: string;
  catalog_source_component_name: string | null;
  catalog_integration_mode: string;
  catalog_runtime_status: string;
  catalog_dynamic_ui_allowed: boolean;
}

export interface AllowlistResponse {
  version: number;
  generated_at: string;
  count: number;
  component_keys: string[];
  rows: AllowlistRow[];
}

export type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Injectable({ providedIn: 'root' })
export class CarbonAllowlistGuard {
  private readonly http = inject(HttpClient);

  private readonly _state = signal<LoadState>('idle');
  private readonly _allowed = signal<ReadonlySet<string>>(new Set());
  private readonly _rows = signal<ReadonlyMap<string, AllowlistRow>>(new Map());
  private readonly _lastError = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly allowedKeys = computed(() => this._allowed());
  readonly count = computed(() => this._allowed().size);

  /**
   * Fetch the allowlist. Call this once during APP_INITIALIZER. Idempotent —
   * subsequent calls re-fetch (useful after a tenant context change).
   */
  async load(opts: { url?: string; signal?: AbortSignal } = {}): Promise<void> {
    const url = opts.url ?? '/api/foundation/dynamic-ui/allowlist';
    this._state.set('loading');
    this._lastError.set(null);
    try {
      const res = await this.http
        .get<AllowlistResponse>(url, { withCredentials: true })
        .toPromise();
      if (!res || !Array.isArray(res.component_keys)) {
        throw new Error('allowlist response malformed');
      }
      this._allowed.set(new Set(res.component_keys));
      this._rows.set(new Map(res.rows.map((r) => [r.component_key, r])));
      this._state.set('loaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this._lastError.set(msg);
      this._state.set('error');
      // Fail-closed: empty allowlist on error.
      this._allowed.set(new Set());
      this._rows.set(new Map());
    }
  }

  /**
   * Returns true ONLY if the allowlist has loaded AND the key is in it.
   * Pre-load / load-error => false (fail-closed).
   */
  isAllowed(componentKey: string): boolean {
    if (this._state() !== 'loaded') return false;
    return this._allowed().has(componentKey);
  }

  /**
   * Throws a RuntimeError if the key is not allowed. Use at the
   * resolver boundary so a render attempt for a banned key crashes
   * loudly instead of silently rendering a stale or unsafe widget.
   */
  verify(componentKey: string): void {
    if (!this.isAllowed(componentKey)) {
      throw new Error(
        `CarbonAllowlistGuard: component_key "${componentKey}" is not in ` +
          `the IBM Carbon allowlist (state=${this._state()}, allowlist_size=${this.count()}). ` +
          `Refusing to render.`,
      );
    }
  }

  /**
   * Read full catalog metadata for an allowed key (returns undefined if
   * not allowed). Useful when a renderer wants to check
   * runtime_status / package_name without re-fetching.
   */
  getRow(componentKey: string): AllowlistRow | undefined {
    return this._rows().get(componentKey);
  }
}
