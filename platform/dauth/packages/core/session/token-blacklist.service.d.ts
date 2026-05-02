export declare function blacklistToken(jti: string, userIdOrTtl?: string | number, expiresInSeconds?: number): Promise<void>;
export declare function isTokenBlacklisted(jti: string): Promise<boolean>;
export declare function registerActiveJtiForUser(userId: string, jti: string, expiresInSeconds: number): Promise<void>;
export declare function removeActiveJtiForUser(userId: string, jti: string): Promise<void>;
export declare function revokeAllUserTokens(userId: string): Promise<void>;
