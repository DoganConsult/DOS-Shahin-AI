/**
 * JWT Key Rotation and Session Invalidation Module.
 * Permits forceful rejection of compromised token scopes by isolating Key Identifier boundaries.
 */
export declare function generateToken(payload: any): Promise<string>;
export declare function verifyToken(token: string): Promise<import("jose").JWTPayload>;
export declare function rotateKeysManually(newKeyId: string, newSecretStr: string): void;
