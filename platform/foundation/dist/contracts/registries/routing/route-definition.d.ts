/**
 * RouteDefinition — public typed shape of a route catalog entry.
 * Mirrors the platform router's contract so the Foundation module remains
 * standalone (no reverse import from the platform). Host registrars consume
 * RouteDefinition[] when mounting the catalogs.
 */
export type RouteOwnerKind = 'product' | 'module' | 'service' | 'platform';
export type RouteSourceKind = 'defaultExport' | 'namedExport' | 'factory' | 'router' | string;
export interface RouteGuards {
    module?: string;
    permission?: string | string[];
    role?: string | string[];
    tenant?: boolean;
    [k: string]: unknown;
}
export interface RouteDefinition {
    id: string;
    productKey?: string;
    ownerKind: RouteOwnerKind;
    sourceKind: RouteSourceKind;
    sourceFile: string;
    exportName: string;
    mountPath: string;
    guards?: RouteGuards;
    order?: number;
    description?: string;
    [k: string]: unknown;
}
