import type { RefreshTokenFamily } from '../types/dauth.types';
export declare function createRefreshFamily(userId: string, tenantId: string, jti: string, expiresAt: Date): Promise<RefreshTokenFamily>;
export declare function rotateRefreshToken(familyId: string, oldJti: string, newJti: string): Promise<boolean>;
export declare function revokeRefreshFamily(familyId: string): Promise<void>;
export declare function revokeAllFamiliesForUser(userId: string): Promise<number>;
export declare function getActiveFamily(familyId: string): Promise<RefreshTokenFamily | null>;
export declare function detectReplayAttack(familyId: string, presentedJti: string): Promise<boolean>;
export declare function cleanupExpiredFamilies(): Promise<number>;
