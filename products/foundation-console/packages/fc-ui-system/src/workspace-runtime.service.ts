// WorkspaceRuntimeService — HTTP client for the Foundation Console gateway.
// Doctrine: NO direct DB read. NO fallback runtime. Failure = visible diagnostic state.
import { Injectable, inject, signal, type Signal } from '@angular/core';
import type { FcWorkspaceRuntime } from '@fc/ui-contracts';
import { FC_RUNTIME_CONFIG, type FcRuntimeConfigToken } from './tokens.js';

export type FcRuntimeState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly runtime: FcWorkspaceRuntime }
  | { readonly kind: 'error'; readonly status: number; readonly message: string };

@Injectable({ providedIn: 'root' })
export class WorkspaceRuntimeService {
  private readonly cfg = inject<FcRuntimeConfigToken>(FC_RUNTIME_CONFIG);
  private readonly _state = signal<FcRuntimeState>({ kind: 'idle' });
  readonly state: Signal<FcRuntimeState> = this._state.asReadonly();

  async load(): Promise<void> {
    this._state.set({ kind: 'loading' });
    try {
      const url = this.cfg.endpoints.workspaceRuntime;
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 401) {
        // Doctrine: not a fallback. The runtime is gated on a valid fc_sid cookie;
        // when the browser has none (or it expired), bounce through SSO. The post-login
        // landing target is the URL the user was on, preserved verbatim — never invented.
        if (typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
          const here = window.location.pathname + window.location.search + window.location.hash;
          const next = encodeURIComponent(here || '/');
          window.location.assign(`/auth/login?next=${next}`);
        }
        this._state.set({
          kind: 'error',
          status: 401,
          message: 'unauthenticated — redirecting to /auth/login',
        });
        return;
      }
      if (!res.ok) {
        this._state.set({
          kind: 'error',
          status: res.status,
          message: `workspace-runtime ${res.status}`,
        });
        return;
      }
      const runtime = (await res.json()) as FcWorkspaceRuntime;
      this._state.set({ kind: 'ready', runtime });
    } catch (err) {
      this._state.set({
        kind: 'error',
        status: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
