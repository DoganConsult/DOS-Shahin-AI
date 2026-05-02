import { InjectionToken, type Provider } from '@angular/core';

/**
 * Base URL for the /api/ui-os/* surface.
 *
 * Defaults to the relative path `/api/ui-os` so the SPA hits the gateway
 * on the same origin. Override only for cross-origin/dev proxies. Always
 * passes through services/gateway → services/ui-os-service:4015. Never
 * configure a direct service URL — gateway-origin verification (Wave 10b)
 * will reject any direct call that bypasses the gateway HMAC token.
 */
export const UI_OS_API_BASE = new InjectionToken<string>('UI_OS_API_BASE', {
  providedIn: 'root',
  factory: () => '/api/ui-os',
});

export interface UiOsClientConfig {
  baseUrl?: string;
}

export function provideUiOsClient(config: UiOsClientConfig = {}): Provider[] {
  return [
    { provide: UI_OS_API_BASE, useValue: config.baseUrl ?? '/api/ui-os' },
  ];
}
