import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { SessionHealthService } from './session-health.service';

const DEFAULT_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface CsrfBootstrapResponse {
  token: string;
  serverTimestamp?: number;
}

interface CsrfPolicyResponse {
  tokenMaxAgeMs: number;
  rotationIntervalMs: number;
  graceWindowMs: number;
  enforcementMode: 'block' | 'warn' | 'log';
  maxFailuresPerWindow: number;
  failureWindowMs: number;
}

/**
 * Enterprise CSRF token lifecycle manager — DB-policy-driven.
 *
 * • Proactive bootstrap via GET /api/csrf/token on app init
 * • Reads per-tenant CSRF policy from GET /api/csrf/policy
 * • Adapts refresh interval to tenant policy
 * • Feeds session health signals on refresh success/failure
 * • Reports session health changes to backend
 */
@Injectable({ providedIn: 'root' })
export class CsrfTokenService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sessionHealth = inject(SessionHealthService);

  private readonly _token = signal<string | null>(null);
  private readonly _isReady = signal(false);
  private readonly _lastRefreshed = signal<number | null>(null);
  private readonly _policy = signal<CsrfPolicyResponse | null>(null);
  private _refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private _bootstrapPromise: Promise<void> | null = null;

  private _readyResolve: (() => void) | null = null;
  private _readyPromise = new Promise<void>(resolve => { this._readyResolve = resolve; });

  readonly token = this._token.asReadonly();
  readonly isReady = this._isReady.asReadonly();
  readonly lastRefreshed = this._lastRefreshed.asReadonly();
  readonly policy = this._policy.asReadonly();

  /** Called from APP_INITIALIZER. Fetches token + policy. */
  bootstrap(): Promise<void> {
    if (this._bootstrapPromise) return this._bootstrapPromise;
    this._bootstrapPromise = this._doBootstrap();
    return this._bootstrapPromise;
  }

  /** Re-fetch token from bootstrap endpoint. */
  async refresh(): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<CsrfBootstrapResponse>(
          `${environment.apiUrl}/csrf/token`,
          { withCredentials: true },
        ),
      );
      this._setToken(res.token);
      if (res.serverTimestamp) this.sessionHealth.recordServerTimestamp(res.serverTimestamp);
      this.sessionHealth.recordRefreshSuccess();
      return res.token;
    } catch {
      this.sessionHealth.recordRefreshFailure();
      return this.readFromCookie();
    }
  }

  /** Fallback: read token directly from browser cookie. */
  readFromCookie(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    if (token) this._setToken(token);
    return token;
  }

  waitUntilReady(): Promise<void> {
    return this._readyPromise;
  }

  /** Clear all CSRF state (call on logout). */
  clear(): void {
    this._token.set(null);
    this._isReady.set(false);
    this._lastRefreshed.set(null);
    this._policy.set(null);
    this._clearTimer();
    this._bootstrapPromise = null;
    this._readyPromise = new Promise<void>(resolve => { this._readyResolve = resolve; });
    this.sessionHealth.reset();
  }

  ngOnDestroy(): void {
    this._clearTimer();
  }

  // ── Private ──

  private async _doBootstrap(): Promise<void> {
    // Fetch token
    try {
      const res = await firstValueFrom(
        this.http.get<CsrfBootstrapResponse>(
          `${environment.apiUrl}/csrf/token`,
          { withCredentials: true },
        ),
      );
      this._setToken(res.token);
      if (res.serverTimestamp) this.sessionHealth.recordServerTimestamp(res.serverTimestamp);
      this.sessionHealth.recordRefreshSuccess();
    } catch {
      this.sessionHealth.recordRefreshFailure();
      this.readFromCookie();
    }

    this._isReady.set(true);
    this._readyResolve?.();
    this._scheduleRefresh();
  }

  private async _loadPolicy(): Promise<void> {
    try {
      const policy = await firstValueFrom(
        this.http.get<CsrfPolicyResponse>(
          `${environment.apiUrl}/csrf/policy`,
          { withCredentials: true },
        ),
      );
      this._policy.set(policy);
    } catch {
      // Policy endpoint requires auth — may fail on pre-auth bootstrap.
      // Will retry on next refresh cycle when auth is available.
    }
  }

  private _setToken(token: string): void {
    this._token.set(token);
    this._lastRefreshed.set(Date.now());
  }

  private _scheduleRefresh(): void {
    this._clearTimer();
    // Use policy-driven interval if available, else default
    const policy = this._policy();
    const intervalMs = policy
      ? Math.min(policy.tokenMaxAgeMs / 4, DEFAULT_REFRESH_INTERVAL_MS)
      : DEFAULT_REFRESH_INTERVAL_MS;

    this._refreshTimer = setTimeout(() => {
      this.refresh()
        .then((token) => token ? this._loadPolicy() : undefined)
        .then(() => this._scheduleRefresh());
    }, intervalMs);
  }

  private _clearTimer(): void {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }
}
