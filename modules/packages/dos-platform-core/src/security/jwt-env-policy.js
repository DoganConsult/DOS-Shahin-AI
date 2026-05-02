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
exports.resolveNodeEnv = resolveNodeEnv;
exports.isProductionLikeEnv = isProductionLikeEnv;
exports.assertJwtSigningSecret = assertJwtSigningSecret;
exports.getEphemeralDevJwtSecret = getEphemeralDevJwtSecret;
exports.resolveJwtSigningSecret = resolveJwtSigningSecret;
/**
 * Canonical NODE_ENV + JWT signing secret policy for all services.
 * - production: JWT_SECRET must be set, non-weak, length >= 32
 * - staging: same as production (no dev-secret)
 * - development / test: unset allowed → ephemeral per-process secret (callers must opt in)
 */
const crypto = __importStar(require("crypto"));
const WEAK_SECRETS = new Set(['dev-secret', 'secret', 'changeme', 'test', 'jwt-secret', 'your-256-bit-secret', 'password', 'admin'].map((s) => s.toLowerCase()));
/** Default per plan: unset NODE_ENV → treat as development (explicit product decision). */
function resolveNodeEnv() {
    const raw = process.env.NODE_ENV?.trim();
    return raw && raw.length > 0 ? raw : 'development';
}
function isProductionLikeEnv() {
    const e = resolveNodeEnv();
    return e === 'production' || e === 'staging';
}
/**
 * Throws if secret is missing in production, or weak/short in staging/production.
 * @param context — service name for error messages
 */
function assertJwtSigningSecret(secret, context) {
    const env = resolveNodeEnv();
    const s = secret?.trim();
    if (!s) {
        if (env === 'production') {
            throw new Error(`[${context}] JWT_SECRET is required in production`);
        }
        if (env === 'staging') {
            throw new Error(`[${context}] JWT_SECRET is required in staging`);
        }
        if (env === 'development' || env === 'test') {
            throw new Error(`[${context}] JWT_SECRET is required (use resolveJwtSigningSecret for ephemeral dev)`);
        }
        throw new Error(`[${context}] JWT_SECRET is required in ${env}`);
    }
    if (isProductionLikeEnv()) {
        if (s.length < 32) {
            throw new Error(`[${context}] JWT_SECRET must be at least 32 characters in ${env}`);
        }
        if (WEAK_SECRETS.has(s.toLowerCase())) {
            throw new Error(`[${context}] Refused known-weak JWT_SECRET in ${env}`);
        }
    }
    return s;
}
const _ephemeralByContext = new Map();
/** Deterministic-enough for dev: one 48-byte hex secret per process per context label. */
function getEphemeralDevJwtSecret(context) {
    let v = _ephemeralByContext.get(context);
    if (!v) {
        v = crypto.randomBytes(48).toString('hex');
        _ephemeralByContext.set(context, v);
    }
    return v;
}
/**
 * Resolve JWT signing secret: env in prod-like; ephemeral in dev/test when unset.
 */
function resolveJwtSigningSecret(context) {
    const raw = process.env.JWT_SECRET?.trim();
    const env = resolveNodeEnv();
    if (raw) {
        return assertJwtSigningSecret(raw, context);
    }
    if (env === 'development' || env === 'test') {
        return getEphemeralDevJwtSecret(context);
    }
    return assertJwtSigningSecret(undefined, context);
}
//# sourceMappingURL=jwt-env-policy.js.map