"use strict";
/**
 * JWT Key Rotation and Session Invalidation Module.
 * Permits forceful rejection of compromised token scopes by isolating Key Identifier boundaries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.rotateKeysManually = rotateKeysManually;
const jose_1 = require("jose");
const keyStore = {
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
async function generateToken(payload) {
    const secret = keyStore.keys.get(keyStore.activeKeyId);
    if (!secret)
        throw new Error("Active JWT Key Configuration Error.");
    return new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', kid: keyStore.activeKeyId })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret);
}
async function verifyToken(token) {
    // Decode headers first to find Key ID (kid)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3)
        throw new Error("Malformed JWT Structure.");
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    const kid = header.kid;
    if (!kid)
        throw new Error("Missing Key Identifier (kid) preventing validation.");
    const secret = keyStore.keys.get(kid);
    if (!secret) {
        throw new Error("JWT Secret mapping invalid. Token likely issued before mandatory Key Rotation boundary event.");
    }
    const { payload } = await (0, jose_1.jwtVerify)(token, secret);
    return payload;
}
function rotateKeysManually(newKeyId, newSecretStr) {
    // Method exposing Admin logic to violently kill active sessions dropping old keys seamlessly
    console.log(`[AUTH] Administrator forcefully rotating platform keys to ID: ${newKeyId}`);
    keyStore.keys.set(newKeyId, new TextEncoder().encode(newSecretStr));
    keyStore.activeKeyId = newKeyId;
    // Optionally purge old keys if forced invalidation is required:
    // keyStore.keys.delete('k1-2024-03-01');
}
initKeys();
//# sourceMappingURL=jwt-rotation.js.map