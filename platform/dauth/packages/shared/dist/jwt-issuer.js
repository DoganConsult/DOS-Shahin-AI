"use strict";
/**
 * Canonical JWT issuance for DOS platform services.
 *
 * Single source of truth for access + refresh token signing. Services that
 * need to mint tokens (auth-service login, onboarding-service register,
 * invitation accept, etc.) MUST import from here — no service-local JWT
 * signing is permitted.
 *
 * Secret resolution is delegated to @dos/platform-core's
 * `resolveJwtSigningSecret`, which enforces production-mode fail-closed
 * semantics and rejects weak dev sentinels.
 */
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
exports.issueAccessToken = issueAccessToken;
exports.issueRefreshToken = issueRefreshToken;
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const platform_core_1 = require("@dos/platform-core");
const DEFAULT_ACCESS_EXPIRES_IN = '1h';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';
const DEFAULT_CONTEXT = '@dos/auth:jwt-issuer';
function resolveExpiresIn(raw, fallback) {
    if (raw == null) {
        const envRaw = process.env.JWT_EXPIRES_IN;
        if (envRaw)
            return /^\d+$/.test(envRaw) ? Number(envRaw) : envRaw;
        return fallback;
    }
    if (typeof raw === 'number')
        return raw;
    return /^\d+$/.test(raw) ? Number(raw) : raw;
}
function resolveRefreshExpiresIn(raw, fallback) {
    if (raw == null) {
        const envRaw = process.env.JWT_REFRESH_EXPIRES_IN;
        if (envRaw)
            return /^\d+$/.test(envRaw) ? Number(envRaw) : envRaw;
        return fallback;
    }
    if (typeof raw === 'number')
        return raw;
    return /^\d+$/.test(raw) ? Number(raw) : raw;
}
function issueAccessToken(claims, options) {
    const jti = options?.jti ?? (0, uuid_1.v4)();
    const expiresIn = resolveExpiresIn(options?.expiresIn, DEFAULT_ACCESS_EXPIRES_IN);
    const secret = (0, platform_core_1.resolveJwtSigningSecret)(options?.context || DEFAULT_CONTEXT);
    const payload = { ...claims, jti, principalType: 'human' };
    return jwt.sign(payload, secret, { expiresIn });
}
/**
 * Mint a refresh token. The caller is responsible for persisting the
 * family row via `refresh_token_families` (see @dos/auth session
 * domain helpers) — this function only signs the JWT.
 */
function issueRefreshToken(userId, tenantId, options) {
    const jti = options?.jti ?? (0, uuid_1.v4)();
    const familyId = options?.familyId ?? (0, uuid_1.v4)();
    const expiresIn = resolveRefreshExpiresIn(options?.expiresIn, DEFAULT_REFRESH_EXPIRES_IN);
    const secret = (0, platform_core_1.resolveJwtSigningSecret)(options?.context || DEFAULT_CONTEXT);
    const token = jwt.sign({ userId, tenantId, jti, familyId, type: 'refresh' }, secret, { expiresIn });
    const decoded = jwt.decode(token);
    const expSec = decoded?.exp;
    const expiresAt = expSec ? new Date(expSec * 1000) : new Date(Date.now() + 7 * 24 * 3600_000);
    return { token, jti, familyId, expiresAt };
}
//# sourceMappingURL=jwt-issuer.js.map