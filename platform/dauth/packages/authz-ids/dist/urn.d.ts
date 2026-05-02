/**
 * Resource URN primitive — the single canonical shape of a resource across
 * Postgres (typed column), OpenFGA (object id), and Cerbos (resource.id).
 *
 * Format: urn:dos:<moduleCode>:<tenantId>:<resourceId>[:<subPath>]
 */
import type { ModuleCode, TenantId } from './ids.js';
export interface ResourceUrnParts {
    readonly moduleCode: ModuleCode;
    readonly tenantId: TenantId;
    readonly resourceId: string;
    readonly subPath?: string;
}
export declare function buildResourceUrn(parts: ResourceUrnParts): string;
export declare function parseResourceUrn(urn: string): ResourceUrnParts;
