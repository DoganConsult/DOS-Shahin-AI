/**
 * Foundation workspace-chrome port.
 *
 * Foundation pages must read DB-sourced shell chrome scalars
 * (e.g. `shell.foundation-register.search.ariaLabel`) without depending
 * on `@platform/shell` directly. The host product provides the real
 * implementation at bootstrap by binding this token to the live
 * WorkspaceShellBindingService:
 *
 *   { provide: FOUNDATION_WORKSPACE_CHROME, useFactory: () => {
 *       const svc = inject(WorkspaceShellBindingService);
 *       return { read: (key) => svc.chromeStringFirst(key) };
 *     }
 *   }
 *
 * The Noop fallback (test/standalone) returns null for every key so
 * foundation pages fail-closed — no hardcoded fallback labels.
 */
import { InjectionToken } from '@angular/core';

export interface FoundationWorkspaceChrome {
  /** Read a runtime-resolved chrome scalar by key, or null when absent. */
  read(key: string): string | null;
}

export const FOUNDATION_WORKSPACE_CHROME =
  new InjectionToken<FoundationWorkspaceChrome>('FoundationWorkspaceChrome');

export class NoopFoundationWorkspaceChrome implements FoundationWorkspaceChrome {
  read(_key: string): string | null { return null; }
}
