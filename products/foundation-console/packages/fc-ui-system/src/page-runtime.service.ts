// Doctrine: NO direct DB read. NO fallback page. Failure/missing = visible diagnostic state.
import { Injectable, inject, signal, type Signal } from '@angular/core';
import type { FcPageRuntime } from '@fc/ui-contracts';
import { FC_RUNTIME_CONFIG, type FcRuntimeConfigToken } from './tokens.js';

export type FcPageState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly path: string }
  | { readonly kind: 'ready';   readonly page: FcPageRuntime }
  | { readonly kind: 'error';   readonly path: string; readonly status: number; readonly message: string };

@Injectable({ providedIn: 'root' })
export class PageRuntimeService {
  private readonly cfg = inject<FcRuntimeConfigToken>(FC_RUNTIME_CONFIG);
  private readonly _state = signal<FcPageState>({ kind: 'idle' });
  private readonly _path  = signal<string | null>(null);
  readonly state: Signal<FcPageState>     = this._state.asReadonly();
  readonly path:  Signal<string | null>   = this._path.asReadonly();

  setPath(path: string): void {
    if (typeof path !== 'string' || path.length === 0) return;
    this._path.set(path);
    void this.load(path);
  }

  async load(path: string): Promise<void> {
    this._state.set({ kind: 'loading', path });
    try {
      const url = `${this.cfg.endpoints.pageRuntime}?path=${encodeURIComponent(path)}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        this._state.set({ kind: 'error', path, status: res.status, message: `page-runtime ${res.status}` });
        return;
      }
      const page = (await res.json()) as FcPageRuntime;
      this._state.set({ kind: 'ready', page });
    } catch (err) {
      this._state.set({
        kind: 'error',
        path,
        status: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
