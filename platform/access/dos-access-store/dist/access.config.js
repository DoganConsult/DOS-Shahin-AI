import { InjectionToken } from '@angular/core';
export const ACCESS_STORE_CONFIG = new InjectionToken('ACCESS_STORE_CONFIG');
export const DEFAULT_ACCESS_STORE_CONFIG = {
    baseUrl: '',
    myPermissionsPath: '/api/access/my-permissions',
    mePath: '/api/tenants/me',
    trialSummaryPath: null,
    loginRedirectUrl: '/api/auth/oidc/start?mode=login',
};
/** Ergonomic provider helper for product bootstrap files. */
export function provideAccessStore(config = {}) {
    return {
        provide: ACCESS_STORE_CONFIG,
        useValue: { ...DEFAULT_ACCESS_STORE_CONFIG, ...config },
    };
}
//# sourceMappingURL=access.config.js.map