import { InjectionToken, Provider } from '@angular/core';

/**
 * Configuration for AccessStore. Products provide this once at bootstrap
 * to point AccessStore at their gateway's session/permission endpoints.
 *
 * Defaults assume same-origin requests against the standard DOS gateway
 * routes (`/api/access/my-permissions`, `/api/tenants/me`).
 */
export interface AccessStoreConfig {
  /**
   * Base URL prefix prepended to every request. Empty string means
   * same-origin (the typical SPA case).
   */
  baseUrl?: string;
  /** Override for `GET <baseUrl>/api/access/my-permissions`. */
  myPermissionsPath?: string;
  /** Override for `GET <baseUrl>/api/tenants/me`. */
  mePath?: string;
  /**
   * Optional opt-in for a trial summary endpoint. Defaults to disabled so
   * workspace bootstrap does not fan out directly to `/api/trials/current`.
   * Products that still need trial chrome must provide a canonical BFF-backed
   * path explicitly.
   */
  trialSummaryPath?: string | null;
  /**
   * Where to redirect on a 401 from any session call. Empty string
   * disables the redirect (the consumer handles 401 themselves).
   */
  loginRedirectUrl?: string;
}

export const ACCESS_STORE_CONFIG = new InjectionToken<AccessStoreConfig>(
  'ACCESS_STORE_CONFIG',
);

export const DEFAULT_ACCESS_STORE_CONFIG: Required<AccessStoreConfig> = {
  baseUrl: '',
  myPermissionsPath: '/api/access/my-permissions',
  mePath: '/api/tenants/me',
  trialSummaryPath: null,
  loginRedirectUrl: '/api/auth/oidc/start?mode=login',
};

/** Ergonomic provider helper for product bootstrap files. */
export function provideAccessStore(config: AccessStoreConfig = {}): Provider {
  return {
    provide: ACCESS_STORE_CONFIG,
    useValue: { ...DEFAULT_ACCESS_STORE_CONFIG, ...config },
  };
}
