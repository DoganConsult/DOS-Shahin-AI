export interface AccessProfile {
    profileCode: string;
    nameEn: string;
    nameAr: string;
    isSystem: boolean;
    isActive: boolean;
    defaultLandingPage: string;
    allowedModules: string[];
}
export declare function getAccessProfiles(tenantId: string): Promise<AccessProfile[]>;
export declare function getAccessProfile(tenantId: string, profileCode: string): Promise<AccessProfile | null>;
export declare function assignAccessProfile(tenantId: string, userId: string, profileCode: string, assignedBy: string): Promise<void>;
export declare function revokeAccessProfile(tenantId: string, userId: string, profileCode: string, revokedBy: string): Promise<void>;
export declare function getUserAccessProfiles(tenantId: string, userId: string): Promise<string[]>;
