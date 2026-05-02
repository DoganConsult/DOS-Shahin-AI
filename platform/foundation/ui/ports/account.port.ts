/**
 * Foundation account port.
 *
 * Pages that display or update the current user's profile should inject this
 * token instead of `@app/core/services/user-account/account.service`.
 *
 * Host binding:
 *   { provide: FOUNDATION_ACCOUNT, useExisting: AccountService }
 */
import { InjectionToken, Signal, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface FoundationUserInfo {
  userId:      string;
  email:       string;
  displayName: string;
  avatarUrl?:  string | null;
  tenantId:    string;
  roles?:      string[];
}

export interface FoundationAccount {
  /** Current user profile. null while loading or unauthenticated. */
  userInfo: Signal<FoundationUserInfo | null>;
  /** Refresh the current user profile from the server. */
  refresh(): Observable<FoundationUserInfo | null>;
  /** Update the display name. */
  updateDisplayName(name: string): Observable<void>;
}

export const FOUNDATION_ACCOUNT =
  new InjectionToken<FoundationAccount>('FoundationAccount');

/** No-op fallback used when the host has not bound a real AccountService. */
export class NoopFoundationAccount implements FoundationAccount {
  readonly userInfo = signal<FoundationUserInfo | null>(null);

  refresh(): Observable<FoundationUserInfo | null> {
    return of(null);
  }

  updateDisplayName(_name: string): Observable<void> {
    return of(undefined);
  }
}
