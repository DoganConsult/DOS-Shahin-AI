import type { FullAccessSnapshot } from '../contracts/access-snapshot.contract';
export type { FullAccessSnapshot as AccessSnapshot };
export declare function getAccessSnapshot(tenantId: string, userId: string): Promise<FullAccessSnapshot>;
export declare function provisionAccessFromRole(tenantId: string, userId: string, role: string, actorId: string): Promise<void>;
export declare function canPerform(tenantId: string, userId: string, permissionCode: string): Promise<boolean>;
export declare const accessSnapshotService: {
    getUserAuthzPayload: typeof getAccessSnapshot;
    provisionFromLegacyRole: typeof provisionAccessFromRole;
    can: typeof canPerform;
};
