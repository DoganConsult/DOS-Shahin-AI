import type { ResolverAccessSnapshot as AccessSnapshot } from './canonical-access.types';
export declare function invalidateSnapshotCache(userId: string, tenantId?: string): void;
export declare function clearSnapshotCache(): void;
export declare function getCachedBootstrapData(userId: string, tenantId: string): unknown | null;
export declare function resolveAccessSnapshot(userId: string, tenantId: string, opts?: {
    sessionId?: string | null;
}): Promise<AccessSnapshot>;
