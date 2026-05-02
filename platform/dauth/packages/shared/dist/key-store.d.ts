export interface SigningKey {
    kid: string;
    secret: string;
    algorithm: string;
    status: 'active' | 'retired' | 'revoked';
    createdAt: string;
    retiredAt: string | null;
    expiresAt: string | null;
}
/** Invalidate the in-memory key cache (call after rotation). */
export declare function invalidateKeyCache(): void;
/**
 * Get the active signing key. Returns null if no active key exists in DB
 * (caller should fall back to JWT_SECRET env var).
 */
export declare function getActiveSigningKey(): Promise<SigningKey | null>;
/**
 * Get the signing key for a specific kid. Used during token verification.
 * Returns null if kid not found (caller should fall back to JWT_SECRET).
 */
export declare function getKeyByKid(kid: string): Promise<SigningKey | null>;
/**
 * List all keys (without exposing secrets). For admin endpoints.
 */
export declare function listKeys(): Promise<Omit<SigningKey, 'secret'>[]>;
/**
 * Rotate: generate a new active key, retire the current active key.
 * Returns the new active key's kid.
 */
export declare function rotateSigningKey(): Promise<string>;
/**
 * Revoke a specific key by kid. Revoked keys cannot be used for signing or verification.
 */
export declare function revokeKey(kid: string): Promise<void>;
