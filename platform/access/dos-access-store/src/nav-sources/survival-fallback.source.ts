import { Injectable, inject } from '@angular/core';
import { AccessStore } from '../access.store';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';

/**
 * L6 — Survival fallback (dynamic-nav posture).
 *
 * While `!access.loaded()`, returns an empty list so no hardcoded sidebar
 * stubs appear before bootstrap/session resolves (workspace bootstrap / DB is
 * the source of truth for nav rows).
 *
 * Once loaded, returns `null` so merge prefers contributions from L1..L5 only.
 *
 * Anonymous visitors must not enter workspace chrome without passing shell
 * guards; sidebar stays empty until navigation adapters contribute rows.
 */
@Injectable({ providedIn: 'root' })
export class SurvivalFallbackNavSource implements NavSource {
  readonly id = 'survival-fallback';
  private readonly access = inject(AccessStore);

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    if (!this.access.loaded()) return [];
    return null;
  }
}
