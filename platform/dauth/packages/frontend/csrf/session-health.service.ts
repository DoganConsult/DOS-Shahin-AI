import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DAUTH_CONNECTIVITY_PORT } from '../ports';
import { environment } from '@env/environment';

/**
 * Session health states — each maps to a different recovery posture.
 *
 *   healthy    → normal operation, all recovery strategies available
 *   unstable   → elevated 403s or refresh failures, retry with caution
 *   degraded   → persistent failures or clock drift, prompt re-auth
 *   expired    → unrecoverable, force logout
 */
export type SessionHealthState = 'healthy' | 'unstable' | 'degraded' | 'expired';

interface HealthWindow {
  csrfFailures: number;
  refreshFailures: number;
  refreshSuccesses: number;
  tokenMismatches: number;
  timestamps: number[];
}

const WINDOW_MS = 5 * 60 * 1000;
const UNSTABLE_THRESHOLD = 3;
const DEGRADED_THRESHOLD = 6;
const REFRESH_FAILURE_WEIGHT = 2;
const CLOCK_DRIFT_THRESHOLD_MS = 30_000;
const REPORT_DEBOUNCE_MS = 10_000;

/**
 * Tracks session security health via signals + reports to backend.
 *
 * Feeds into the CSRF recovery engine so retry decisions consider
 * the overall session stability, not just the individual request.
 * Reports significant state changes to the backend for server-side tracking.
 */
@Injectable({ providedIn: 'root' })
export class SessionHealthService implements OnDestroy {
  private connectivity = inject(DAUTH_CONNECTIVITY_PORT);
  private http = inject(HttpClient);

  private readonly _state = signal<SessionHealthState>('healthy');
  private readonly _score = signal(100);
  private readonly _clockDrift = signal<number | null>(null);
  private _window: HealthWindow = this._freshWindow();
  private _pruneTimer: ReturnType<typeof setInterval> | null = null;
  private _reportTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastReportedState: SessionHealthState = 'healthy';

  readonly state = this._state.asReadonly();
  readonly score = this._score.asReadonly();
  readonly clockDrift = this._clockDrift.asReadonly();

  readonly isHealthy = computed(() => this._state() === 'healthy');
  readonly isDegraded = computed(() =>
    this._state() === 'degraded' || this._state() === 'expired',
  );

  constructor() {
    this._pruneTimer = setInterval(() => this._pruneAndReassess(), 30_000);
  }

  recordCsrfFailure(): void {
    this._window.csrfFailures++;
    this._window.timestamps.push(Date.now());
    this._reassess();
  }

  recordTokenMismatch(): void {
    this._window.tokenMismatches++;
    this._window.timestamps.push(Date.now());
    this._reassess();
  }

  recordRefreshSuccess(): void {
    this._window.refreshSuccesses++;
    if (this._window.csrfFailures > 0) this._window.csrfFailures--;
    this._reassess();
  }

  recordRefreshFailure(): void {
    this._window.refreshFailures++;
    this._window.timestamps.push(Date.now());
    this._reassess();
  }

  recordServerTimestamp(serverTimestampMs: number): void {
    const drift = Math.abs(Date.now() - serverTimestampMs);
    if (drift > CLOCK_DRIFT_THRESHOLD_MS) {
      this._clockDrift.set(drift);
    } else {
      this._clockDrift.set(null);
    }
  }

  reset(): void {
    this._window = this._freshWindow();
    this._state.set('healthy');
    this._score.set(100);
    this._clockDrift.set(null);
    this._lastReportedState = 'healthy';
  }

  markExpired(): void {
    this._state.set('expired');
    this._score.set(0);
    this._reportStateChange('expired');
  }

  ngOnDestroy(): void {
    if (this._pruneTimer) clearInterval(this._pruneTimer);
    if (this._reportTimer) clearTimeout(this._reportTimer);
  }

  // ── Internal ──

  private _reassess(): void {
    this._pruneOldEntries();

    const w = this._window;
    const weightedFailures = w.csrfFailures
      + w.tokenMismatches
      + (w.refreshFailures * REFRESH_FAILURE_WEIGHT);

    if (!this.connectivity.online) return;

    let state: SessionHealthState;
    let score: number;

    if (weightedFailures >= DEGRADED_THRESHOLD) {
      state = 'degraded';
      score = Math.max(0, 20 - (weightedFailures - DEGRADED_THRESHOLD) * 5);
    } else if (weightedFailures >= UNSTABLE_THRESHOLD) {
      state = 'unstable';
      score = Math.max(20, 60 - (weightedFailures - UNSTABLE_THRESHOLD) * 10);
    } else {
      state = 'healthy';
      score = Math.max(60, 100 - weightedFailures * 15);
    }

    if (this._clockDrift() !== null && state === 'healthy') {
      state = 'unstable';
      score = Math.min(score, 50);
    }

    const previousState = this._state();
    this._state.set(state);
    this._score.set(score);

    // Report significant state transitions to backend (debounced)
    if (state !== previousState && state !== this._lastReportedState) {
      this._scheduleReport(state);
    }
  }

  private _scheduleReport(newState: SessionHealthState): void {
    if (this._reportTimer) clearTimeout(this._reportTimer);
    this._reportTimer = setTimeout(() => {
      this._reportStateChange(newState);
    }, REPORT_DEBOUNCE_MS);
  }

  private _reportStateChange(newState: SessionHealthState): void {
    this._lastReportedState = newState;
    const eventType = newState === 'healthy' ? 'session_health_recovered' : 'session_health_degraded';
    const riskLevel = newState === 'degraded' || newState === 'expired' ? 'high'
      : newState === 'unstable' ? 'medium' : 'low';

    this.http.post(
      `${environment.apiUrl}/csrf/session-health`,
      { eventType, riskLevel, metadata: { score: this._score(), state: newState } },
      { withCredentials: true },
    ).subscribe({ error: () => {} }); // best-effort, don't block UI
  }

  private _pruneOldEntries(): void {
    const cutoff = Date.now() - WINDOW_MS;
    this._window.timestamps = this._window.timestamps.filter(t => t > cutoff);
    if (this._window.timestamps.length === 0) {
      this._window.csrfFailures = 0;
      this._window.refreshFailures = 0;
      this._window.tokenMismatches = 0;
      this._window.refreshSuccesses = 0;
    }
  }

  private _pruneAndReassess(): void {
    this._pruneOldEntries();
    this._reassess();
  }

  private _freshWindow(): HealthWindow {
    return { csrfFailures: 0, refreshFailures: 0, refreshSuccesses: 0, tokenMismatches: 0, timestamps: [] };
  }
}
