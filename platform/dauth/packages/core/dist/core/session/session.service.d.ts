export interface SessionMeta {
    ipAddress?: string;
    userAgent?: string;
}
export interface SessionCreateInput {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    rememberMe?: boolean;
    permissions?: string[];
    roles?: string[];
    language?: string;
    departmentId?: string;
    name?: string;
    meta?: SessionMeta;
}
export interface SessionTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare function createSession(input: SessionCreateInput): Promise<SessionTokens>;
export declare function refreshSession(refreshTokenValue: string): Promise<SessionTokens | null>;
export declare function destroySession(userId: string, jti?: string): Promise<void>;
export declare function isSessionValid(jti: string): Promise<boolean>;
