/**
 * Foundation session port.
 *
 * Pages that need the current user's session (tenant, userId, token) should
 * inject this token instead of reaching into `@app/core/dauth/session/session.service`
 * or `@app/dauth/session/session.service`.
 *
 * Host binding:
 *   { provide: FOUNDATION_SESSION, useExisting: SessionService }
 */
import { InjectionToken, Signal, signal } from '@angular/core';

export interface FoundationSession {
  /** JWT access token string, or null when not authenticated. */
  token: Signal<string | null>;
  /** Current authenticated user UUID. */
  userId: Signal<string | null>;
  /** Current tenant UUID. */
  tenantId: Signal<string | null>;
  /** Display name (full name or email). */
  displayName: Signal<string>;
  /** Returns true when the user is authenticated. */
  isAuthenticated: Signal<boolean>;
}

export const FOUNDATION_SESSION =
  new InjectionToken<FoundationSession>('FoundationSession');

/** Deny-all fallback — unauthenticated stub for testing / missing host. */
export class NoopFoundationSession implements FoundationSession {
  readonly token           = signal<string | null>(null);
  readonly userId          = signal<string | null>(null);
  readonly tenantId        = signal<string | null>(null);
  readonly displayName     = signal('');
  readonly isAuthenticated = signal(false);
}
