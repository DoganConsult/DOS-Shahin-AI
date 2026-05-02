import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { RefreshConfig } from '../../features/layout-grid/layout-grid.types';
import { computeJitter } from './refresh-timer.utils';

interface TimerEntry {
  config: RefreshConfig;
  callback: () => void;
  timerId: ReturnType<typeof setTimeout> | null;
  paused: boolean;
}

/**
 * Manages per-widget auto-refresh timers with:
 * - Individual register/unregister per widget
 * - Per-widget pause/resume
 * - Global pause/resume tied to tab visibility
 * - Staggered jitter (0–5 s) when scheduling refreshes
 */
@Injectable({ providedIn: 'root' })
export class RefreshTimerService implements OnDestroy {
  private timers = new Map<string, TimerEntry>();
  private globallyPaused = false;
  private visibilityHandler: (() => void) | null = null;

  constructor(private ngZone: NgZone) {
    this.setupVisibilityListener();
  }

  /** Register a widget for periodic refresh. */
  register(config: RefreshConfig, callback: () => void): void {
    this.unregister(config.widgetId);
    const entry: TimerEntry = { config, callback, timerId: null, paused: false };
    this.timers.set(config.widgetId, entry);
    if (!this.globallyPaused) {
      this.scheduleNext(entry);
    }
  }

  /** Unregister a widget and clear its timer. */
  unregister(widgetId: string): void {
    const entry = this.timers.get(widgetId);
    if (entry) {
      this.clearTimer(entry);
      this.timers.delete(widgetId);
    }
  }

  /** Pause all widget timers (e.g. tab hidden). */
  pauseAll(): void {
    this.globallyPaused = true;
    for (const entry of this.timers.values()) {
      this.clearTimer(entry);
    }
  }

  /** Resume all widget timers with staggered jitter. */
  resumeAll(): void {
    this.globallyPaused = false;
    for (const entry of this.timers.values()) {
      if (!entry.paused) {
        this.scheduleNext(entry);
      }
    }
  }

  /** Pause a single widget's timer. */
  pauseWidget(widgetId: string): void {
    const entry = this.timers.get(widgetId);
    if (entry) {
      entry.paused = true;
      this.clearTimer(entry);
    }
  }

  /** Resume a single widget's timer. */
  resumeWidget(widgetId: string): void {
    const entry = this.timers.get(widgetId);
    if (entry) {
      entry.paused = false;
      if (!this.globallyPaused) {
        this.scheduleNext(entry);
      }
    }
  }

  ngOnDestroy(): void {
    for (const entry of this.timers.values()) {
      this.clearTimer(entry);
    }
    this.timers.clear();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  // ── Private helpers ──

  private scheduleNext(entry: TimerEntry): void {
    this.clearTimer(entry);
    const jitter = entry.config.jitterSeconds > 0
      ? computeJitter() * (entry.config.jitterSeconds / 5)
      : 0;
    const delayMs = (entry.config.intervalSeconds + jitter) * 1000;

    this.ngZone.runOutsideAngular(() => {
      entry.timerId = setTimeout(() => {
        this.ngZone.run(() => {
          if (!this.globallyPaused && !entry.paused) {
            entry.callback();
            this.scheduleNext(entry);
          }
        });
      }, delayMs);
    });
  }

  private clearTimer(entry: TimerEntry): void {
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
  }

  private setupVisibilityListener(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}
