import { Injectable, signal, computed } from '@angular/core';
import { KpiCardVM } from '../../../config-center/shared/models/module-overview.vm';

/**
 * ShellKpiBridgeService
 *
 * Spec basis: dynamic-ui-enrollment-page-experience-widgets-spec.md §4.1
 * (Layer 3 — KPI strip is a SHELL responsibility, not a page responsibility).
 *
 * Pattern: Pages whose route data declares `kpiScope: 'module-overview'`
 * publish a list of live KPI cards into this bridge. The shell host
 * (`ShellHostComponent`) reads from the bridge and renders the *single*
 * KPI strip above the page outlet.
 *
 * This eliminates the duplicate KPI strip bug where both the shell and
 * the page were rendering their own `<app-kpi-card-grid>` for the same
 * route (visible on /foundation/overview).
 *
 * Contract:
 *   - publish(routeKey, cards): Page declares its KPIs for a given route key.
 *   - clear(routeKey): Page clears KPIs on destroy / route change.
 *   - cardsForRoute(): Computed signal exposing the latest published cards.
 *   - hasLive(): True when a page has actively published cards (vs. fallback).
 */
@Injectable({ providedIn: 'root' })
export class ShellKpiBridgeService {
  /** Active route key (URL path) that owns the published cards */
  private readonly _activeKey = signal<string | null>(null);
  /** Live KPI cards published by the active page */
  private readonly _cards = signal<KpiCardVM[]>([]);

  /** Read-only signal exposing the live cards (empty array when no publisher). */
  readonly cards = computed(() => this._cards());

  /** True when a page has published live cards. */
  readonly hasLive = computed(() => this._cards().length > 0);

  /** Active route key for diagnostics / cache scoping. */
  readonly activeKey = computed(() => this._activeKey());

  /**
   * Publish live KPI cards for a route. Replaces any prior cards.
   * Call from the page component effect that recomputes KPIs from data.
   */
  publish(routeKey: string, cards: KpiCardVM[]): void {
    this._activeKey.set(routeKey);
    this._cards.set(cards ?? []);
  }

  /**
   * Clear cards owned by a specific route key. Use in `ngOnDestroy` or
   * when navigating away to prevent stale strips on the next page.
   */
  clear(routeKey?: string): void {
    if (routeKey && this._activeKey() && this._activeKey() !== routeKey) return;
    this._activeKey.set(null);
    this._cards.set([]);
  }
}
