/**
 * Foundation dynamic-page port.
 *
 * Foundation pages may optionally consume Dynamic UI resolution (page type,
 * layout, KPI scope, capability flags, etc.) but must not reach into the
 * product-level config-center resolver at
 * `@app/core/services/platform/dynamic-page-experience.resolver`.
 *
 * The host binds the real resolver at bootstrap:
 *   { provide: FOUNDATION_DYNAMIC_PAGE, useExisting: DynamicPageExperienceResolver }
 *
 * When the host has not wired the real resolver, NullFoundationDynamicPage
 * returns sensible defaults that let pages render without Dynamic UI.
 */
import { InjectionToken, Signal, signal, computed } from '@angular/core';

export type FoundationPageType     = 'overview' | 'list' | 'object' | 'workflow' | 'analytics' | 'audit' | 'settings';
export type FoundationPageLayout   = 'dashboard' | 'full-page' | 'split-view' | 'object-page' | 'wizard' | 'report';
export type FoundationKpiScope     = 'module-overview' | 'page-local' | 'none';
export type FoundationDataScope    = 'tenant' | 'org_scope' | 'department_scope' | 'self' | 'global';

export interface FoundationPageExperience {
  route: string;
  pageType: FoundationPageType;
  layout: FoundationPageLayout;
  kpiScope: FoundationKpiScope;
  userIntent?: string;
  signatureWidget: string | null;
  dataScopeMode: FoundationDataScope;
  realtimeChannels: string[];
  evidenceRequired: boolean;
  mobileEnabled: boolean;
  emptyStateKey?: string;
  errorStateKey?: string;
  helpKey?: string;
  visibleForCurrentUser: boolean;
}

export interface FoundationDynamicPage {
  /** Returns the current page experience for a given route path, or null if not resolved. */
  forRoute(route: string): FoundationPageExperience | null;
  /** Signal with all resolved experiences keyed by route. */
  experiences: Signal<Map<string, FoundationPageExperience>>;
  /** Returns true when the named capability is active for the current user. */
  isCapabilityActive(capability: string): boolean;
  /** Resolved user context display name. */
  userName: Signal<string>;
  /** Whether the bootstrap data has been loaded. */
  ready: Signal<boolean>;
}

export const FOUNDATION_DYNAMIC_PAGE =
  new InjectionToken<FoundationDynamicPage>('FoundationDynamicPage');

/** Fallback used when Dynamic UI is not yet wired (Phase C / Phase F pending). */
export class NullFoundationDynamicPage implements FoundationDynamicPage {
  readonly experiences = signal<Map<string, FoundationPageExperience>>(new Map());
  readonly userName    = signal('');
  readonly ready       = signal(false);

  forRoute(_route: string): FoundationPageExperience | null {
    return null;
  }

  isCapabilityActive(_capability: string): boolean {
    return false;
  }
}

/** Convenience helper — mirrors the existing isCapabilityActive import name.
 * Two call shapes are supported:
 *   isCapabilityActive(capability)                  // standalone (returns false)
 *   isCapabilityActive(dynamicPage, capability)     // with resolver
 */
export function isCapabilityActive(capability: string): boolean;
export function isCapabilityActive(dynamicPage: FoundationDynamicPage, capability: string): boolean;
export function isCapabilityActive(a: FoundationDynamicPage | string, b?: string): boolean {
  if (typeof a === 'string') return false;
  return a.isCapabilityActive(b!);
}
