/**
 * Foundation FE access port — a minimal interface that pages inject instead
 * of reaching across packages into `frontend/products/shahin/.../dauth/access/access.store`.
 *
 * The host product binds the real AccessStore at app bootstrap via:
 *   { provide: FOUNDATION_ACCESS_STORE, useExisting: AccessStore }
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase I-2)
 */
import { InjectionToken } from '@angular/core';

export interface FoundationAccessStore {
  /** Returns true when the current user has the given permission code. */
  hasPermission(permission: string): boolean;
}

export const FOUNDATION_ACCESS_STORE = new InjectionToken<FoundationAccessStore>(
  'FoundationAccessStore',
);

/**
 * Stub implementation that denies everything. Used as a default in
 * environments where the host hasn't wired the real store. Tests can swap
 * this in to assert the deny path.
 */
export class DenyAllFoundationAccessStore implements FoundationAccessStore {
  hasPermission(_permission: string): boolean {
    return false;
  }
}
