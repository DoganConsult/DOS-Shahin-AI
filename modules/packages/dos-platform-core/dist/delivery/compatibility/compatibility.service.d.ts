import type { CompatibilityImpact } from '../contracts/delivery.types';
export type CompatibilityClass = 'backward-compatible' | 'forward-compatible' | 'breaking' | 'additive';
export interface CompatibilityRecord {
    compatibilityId: string;
    releaseId: string;
    artifactType: 'api' | 'schema' | 'event' | 'contract' | 'config';
    artifactCode: string;
    changeClass: CompatibilityClass;
    impact: CompatibilityImpact;
    affectedConsumers: string[];
    migrationRequired: boolean;
    deprecationNoticeRequired: boolean;
    breakingChangeApprovalId: string | null;
    notes: string | null;
    verifiedAt: string | null;
    createdAt: string;
}
export declare function registerCompatibilityRecord(input: {
    releaseId: string;
    artifactType: CompatibilityRecord['artifactType'];
    artifactCode: string;
    changeClass: CompatibilityClass;
    impact: CompatibilityImpact;
    affectedConsumers?: string[];
    migrationRequired?: boolean;
    deprecationNoticeRequired?: boolean;
    breakingChangeApprovalId?: string;
    notes?: string;
}): Promise<CompatibilityRecord>;
export declare function verifyCompatibilityRecord(compatibilityId: string, verifiedBy: string): Promise<void>;
export declare function getCompatibilityRecord(compatibilityId: string): Promise<CompatibilityRecord | null>;
export declare function listCompatibilityByRelease(releaseId: string): Promise<CompatibilityRecord[]>;
export declare function listBreakingChanges(releaseId: string): Promise<CompatibilityRecord[]>;
export declare function validateBreakingChanges(releaseId: string, listFn?: (releaseId: string) => Promise<CompatibilityRecord[]>): Promise<string[]>;
