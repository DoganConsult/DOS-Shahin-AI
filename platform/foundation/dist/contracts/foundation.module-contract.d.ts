/**
 * foundation — canonical module contract
 *
 * Single source of truth for nav tree, page registry, and API surface.
 * Consumed by:
 *   - scripts/publish-contract.mjs  → Dynamic UI seeds JSON
 *   - tests/smoke/dynamic-ui-drift.test.mjs  → drift gate
 *   - platform/dos registry import  → DB seed
 */
export interface FoundationPage {
    pageCode: string;
    route: string;
    component: string;
    readiness: 'production' | 'beta' | 'alpha';
    permission: string;
    apis?: string[];
}
export interface FoundationNav {
    pageCode: string;
    labelKey: string;
    icon: string;
    order: number;
    permission: string;
    group?: string;
}
export interface FoundationContract {
    identity: {
        code: string;
        version: string;
        titleKey: string;
    };
    nav: FoundationNav[];
    pages: FoundationPage[];
}
export declare const FOUNDATION_CONTRACT: FoundationContract;
