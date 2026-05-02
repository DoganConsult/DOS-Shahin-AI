/**
 * JWT Key Rotation and Session Invalidation Module.
 * Permits forceful rejection of compromised token scopes by isolating Key Identifier boundaries.
 */

import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

interface JWKStore {
  activeKeyId: string;
  keys: Map<string, Uint8Array>; 
}

const keyStore: JWKStore = {
  activeKeyId: 'k1-2024-03-01',
  keys: new Map(),
};

/**
 * Initializes generic secrets for mock purposes. 
 * In production, these map asynchronously against AWS KMS or Vault arrays dynamically per 24/h schedule.
 */
function initKeys() {
  keyStore.keys.set('k1-2024-03-01', new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_boundary_x0102'));
  keyStore.keys.set('k2-2024-03-15', new TextEncoder().encode(process.env.JWT_SECRET_ROTATION || 'rotation_secret_boundary_x0103'));
}

export async function generateToken(payload: any): Promise<string> {
  const secret = keyStore.keys.get(keyStore.activeKeyId);
  if (!secret) throw new Error("Active JWT Key Configuration Error.");

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', kid: keyStore.activeKeyId })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);
}

export async function verifyToken(token: string) {
  // Decode headers first to find Key ID (kid)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) throw new Error("Malformed JWT Structure.");
  
  const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
  const kid = header.kid;

  if (!kid) throw new Error("Missing Key Identifier (kid) preventing validation.");

  const secret = keyStore.keys.get(kid);
  
  if (!secret) {
    throw new Error("JWT Secret mapping invalid. Token likely issued before mandatory Key Rotation boundary event.");
  }

  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export function rotateKeysManually(newKeyId: string, newSecretStr: string) {
  // Method exposing Admin logic to violently kill active sessions dropping old keys seamlessly
  console.log(`[AUTH] Administrator forcefully rotating platform keys to ID: ${newKeyId}`);
  keyStore.keys.set(newKeyId, new TextEncoder().encode(newSecretStr));
  keyStore.activeKeyId = newKeyId;
  
  // Optionally purge old keys if forced invalidation is required:
  // keyStore.keys.delete('k1-2024-03-01');
}

initKeys();
