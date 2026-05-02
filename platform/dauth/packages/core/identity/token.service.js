"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccessTokenTtl = resolveAccessTokenTtl;
exports.getJwtSecret = getJwtSecret;
exports.generateAccessToken = generateAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyAccessTokenViaPort = verifyAccessTokenViaPort;
exports.decodeTokenUnsafe = decodeTokenUnsafe;
exports.getAccessTokenExpirySeconds = getAccessTokenExpirySeconds;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.setRefreshTokenCookie = setRefreshTokenCookie;
exports.clearRefreshTokenCookie = clearRefreshTokenCookie;
/**
 * DAuth TokenService — single canonical JWT token management.
 * Replaces deleted middleware/auth.ts token functions + config/jwt.ts.
 *
 * Law 1: One canonical service per concern.
 * Law 9: Organized by concern (dauth/), not implementation pattern.
 */
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const DEFAULT_TTL_HUMAN = '15m';
const DEFAULT_TTL_AGENT = '5m';
const DEFAULT_TTL_SERVICE_ACCOUNT = '60m';
const DEFAULT_TTL_EXTERNAL = '15m';
function resolveAccessTokenTtl(principalType) {
    switch (principalType) {
        case 'agent':
            return process.env.JWT_AGENT_EXPIRES_IN || DEFAULT_TTL_AGENT;
        case 'service_account':
            return process.env.JWT_SA_EXPIRES_IN || DEFAULT_TTL_SERVICE_ACCOUNT;
        case 'external':
            return process.env.JWT_EXTERNAL_EXPIRES_IN || DEFAULT_TTL_EXTERNAL;
        case 'human':
        default:
            return process.env.JWT_EXPIRES_IN || DEFAULT_TTL_HUMAN;
    }
}
// ── Secret ──
// Lazy-loaded secrets — resolved on first use, not at import time.
// This ensures dotenv.config() has already run before we read process.env.
let _jwtSecret = null;
let _jwtRefreshSecret = null;
function getJwtSecret() {
    if (_jwtSecret)
        return _jwtSecret;
    const secret = process.env.JWT_SECRET;
    if (secret) {
        _jwtSecret = secret;
        return secret;
    }
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        observability_1.logger.warn('[DAuth] JWT_SECRET not set — using dev fallback. DO NOT deploy to production.');
        _jwtSecret = 'dev-secret';
        return _jwtSecret;
    }
    throw new Error('JWT_SECRET environment variable is required');
}
function getJwtRefreshSecret() {
    if (_jwtRefreshSecret)
        return _jwtRefreshSecret;
    const secret = process.env.JWT_REFRESH_SECRET;
    if (secret) {
        _jwtRefreshSecret = secret;
        return secret;
    }
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        observability_1.logger.warn('[DAuth] JWT_REFRESH_SECRET not set — using dev fallback. DO NOT deploy to production.');
        _jwtRefreshSecret = getJwtSecret() + '_refresh';
        return _jwtRefreshSecret;
    }
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
}
// ── Access Tokens ──
function generateAccessToken(payload, opts = {}) {
    const expiresIn = opts.expiresIn ?? resolveAccessTokenTtl(payload.principalType);
    const payloadWithJti = { ...payload, jti: payload.jti || (0, uuid_1.v4)() };
    return jwt.sign(payloadWithJti, getJwtSecret(), { expiresIn });
}
function verifyAccessToken(token) {
    // Synchronous path kept for back-compat with existing middleware and call
    // sites. Uses the native HS256 verifier directly.
    return jwt.verify(token, getJwtSecret());
}
/**
 * Async token verification that flows through the TokenVerifier port.
 * Enables Keycloak shadow/enforce mode without forcing every call site to
 * become async. Shadow mismatches are logged but do not affect the returned
 * payload — the decision ledger records divergences separately via the
 * decision-engine shadow-run path.
 *
 * New code should prefer this over `verifyAccessToken`.
 */
async function verifyAccessTokenViaPort(token) {
    const { getTokenVerifiers } = await import('../adapters/token-verifier.factory.js');
    const { primary, shadow } = getTokenVerifiers();
    const primaryResult = await primary.verify(token);
    if (shadow) {
        // Best-effort shadow — never throws into the main path.
        shadow
            .verify(token)
            .then((shadowResult) => {
            const delta = computePayloadDelta(primaryResult.payload, shadowResult.payload);
            if (delta.length > 0) {
                observability_1.logger.warn('[DAuth:TokenVerifier] shadow mismatch', {
                    primarySource: primaryResult.source,
                    shadowSource: shadowResult.source,
                    fields: delta,
                });
            }
        })
            .catch((err) => {
            observability_1.logger.debug('[DAuth:TokenVerifier] shadow verify failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        });
    }
    return primaryResult.payload;
}
function computePayloadDelta(a, b) {
    const fields = ['userId', 'email', 'tenantId', 'role'];
    return fields.filter((f) => a[f] !== b[f]);
}
function decodeTokenUnsafe(token) {
    try {
        return jwt.decode(token);
    }
    catch {
        return null;
    }
}
function getAccessTokenExpirySeconds(principalType) {
    const raw = resolveAccessTokenTtl(principalType).trim();
    const unitMatch = /^(\d+)\s*([smhd])$/i.exec(raw);
    if (unitMatch) {
        const n = parseInt(unitMatch[1], 10);
        const u = unitMatch[2].toLowerCase();
        const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400;
        return Math.max(1, n * mult);
    }
    if (/^\d+$/.test(raw))
        return Math.max(1, parseInt(raw, 10));
    return 86400;
}
// ── Refresh Tokens ──
function generateRefreshToken(userId, tenantId, rememberMe = true) {
    const expiresIn = rememberMe ? '7d' : '1h';
    return jwt.sign({ userId, tenantId, type: 'refresh', jti: (0, uuid_1.v4)() }, getJwtRefreshSecret(), { expiresIn });
}
function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, getJwtRefreshSecret());
        if (decoded.type !== 'refresh')
            return null;
        return { userId: decoded.userId, tenantId: decoded.tenantId, jti: decoded.jti };
    }
    catch {
        return null;
    }
}
const observability_1 = require("@dos/platform-core/observability");
function setRefreshTokenCookie(res, refreshToken, rememberMe = true) {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
    };
    if (rememberMe)
        cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie('dauth_rt', refreshToken, cookieOptions);
}
function clearRefreshTokenCookie(res) {
    res.clearCookie('dauth_rt', { path: '/api/auth' });
}
//# sourceMappingURL=token.service.js.map