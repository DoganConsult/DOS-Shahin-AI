import { Injectable, signal } from '@angular/core';

/**
 * Default idle timeout (minutes) for Shahin-AI sessions.
 *
 * SoT: `products/shahin-ai/product.manifest.json` →
 *      `tenantDefaults.sessionIdleTimeoutMinutes`.
 *
 * The post-auth response normally overrides this via `configure()` with
 * the tenant-resolved value from the config center. Keeping the manifest
 * value in sync with this constant means a missing post-auth field
 * produces the same UX as a successful one.
 */
const SHAHIN_AI_IDLE_TIMEOUT_DEFAULT_MINUTES = 30;
const SHAHIN_AI_IDLE_WARNING_DEFAULT_MINUTES = 2;

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private _timeoutMinutes = SHAHIN_AI_IDLE_TIMEOUT_DEFAULT_MINUTES;
  private _warningMinutes = SHAHIN_AI_IDLE_WARNING_DEFAULT_MINUTES;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _warningTimer: ReturnType<typeof setTimeout> | null = null;
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;
  private _onTimeout: (() => void) | null = null;
  private _events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;

  readonly warningVisible = signal(false);
  readonly remainingSeconds = signal(0);

  /**
   * Reconfigure the idle timeout. Called by the post-auth orchestrator
   * with `tenantDefaults.sessionIdleTimeoutMinutes` resolved by the
   * config center for this tenant.
   *
   * Falls back to the manifest default if the value is missing or
   * non-positive — which keeps end-user behavior identical to a
   * successful tenant lookup, just with a structured warning.
   */
  configure(minutes: number | null | undefined): void {
    if (typeof minutes === 'number' && minutes > 0) {
      this._timeoutMinutes = minutes;
      return;
    }
    if (this._timeoutMinutes !== SHAHIN_AI_IDLE_TIMEOUT_DEFAULT_MINUTES) {
      this._timeoutMinutes = SHAHIN_AI_IDLE_TIMEOUT_DEFAULT_MINUTES;
    }
    console.warn(
      '[idle-timeout] using manifest default ' +
        `${SHAHIN_AI_IDLE_TIMEOUT_DEFAULT_MINUTES}m — post-auth response did not provide ` +
        'sessionIdleTimeoutMinutes',
    );
  }

  start(onTimeout: () => void): void {
    this._onTimeout = onTimeout;
    this._resetTimer();
    this._events.forEach(e => document.addEventListener(e, this._onActivity, { passive: true }));
  }

  recordActivity(): void {
    this._resetTimer();
  }

  stop(): void {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._warningTimer) { clearTimeout(this._warningTimer); this._warningTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
    this._events.forEach(e => document.removeEventListener(e, this._onActivity));
    this._onTimeout = null;
    this.warningVisible.set(false);
    this.remainingSeconds.set(0);
  }

  private _onActivity = (): void => {
    this._resetTimer();
  };

  private _resetTimer(): void {
    if (this._timer) clearTimeout(this._timer);
    if (this._warningTimer) clearTimeout(this._warningTimer);
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    this.warningVisible.set(false);
    this.remainingSeconds.set(0);

    const warningMs = Math.max(0, (this._timeoutMinutes - this._warningMinutes)) * 60 * 1000;
    this._warningTimer = setTimeout(() => {
      this.warningVisible.set(true);
      this.remainingSeconds.set(this._warningMinutes * 60);
      this._countdownTimer = setInterval(() => {
        this.remainingSeconds.update(v => Math.max(0, v - 1));
      }, 1000);
    }, warningMs);

    this._timer = setTimeout(() => {
      this.warningVisible.set(false);
      if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
      this._onTimeout?.();
    }, this._timeoutMinutes * 60 * 1000);
  }
}
