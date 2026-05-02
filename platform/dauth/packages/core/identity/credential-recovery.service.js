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
exports.requestPasswordReset = requestPasswordReset;
exports.validateResetToken = validateResetToken;
exports.completePasswordReset = completePasswordReset;
exports.requestEmailVerification = requestEmailVerification;
exports.verifyEmail = verifyEmail;
const crypto = __importStar(require("crypto"));
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const resilience_1 = require("@dos/platform-core/resilience");
/**
 * Hash a raw token for secure storage (never store raw tokens in DB).
 */
function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}
async function requestPasswordReset(email, tenantId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) AND status = 'active' LIMIT 1`, [email]);
    if (!rows[0])
        return null;
    const userId = rows[0].user_id;
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60_000);
    // Invalidate any existing unused tokens for this user
    await (0, db_1.safeQuery)(`UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`, [userId]);
    // Insert new token (table: token_id, user_id, token_hash, expires_at, used, created_at)
    await (0, db_1.safeQuery)(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`, [userId, tokenHash, expiresAt]);
    await (0, publish_with_dsoc_1.publish)('dauth.password_reset.requested', tenantId, {
        userId,
        email,
        requestedAt: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return { token, expiresAt };
}
async function validateResetToken(token) {
    const tokenHash = hashToken(token);
    const { rows } = await (0, db_1.safeQuery)(`SELECT prt.user_id, u.tenant_id
     FROM password_reset_tokens prt
     JOIN users u ON u.user_id = prt.user_id
     WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used = FALSE
     LIMIT 1`, [tokenHash]);
    return rows[0] ? { userId: rows[0].user_id, tenantId: rows[0].tenant_id } : null;
}
async function completePasswordReset(token, newPasswordHash) {
    const valid = await validateResetToken(token);
    if (!valid)
        return false;
    await (0, db_1.safeQuery)(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`, [newPasswordHash, valid.userId]);
    const tokenHash = hashToken(token);
    await (0, db_1.safeQuery)(`UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1`, [tokenHash]);
    await (0, publish_with_dsoc_1.publish)('dauth.password_reset.completed', valid.tenantId, {
        userId: valid.userId,
        completedAt: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return true;
}
async function requestEmailVerification(userId, _email, _tenantId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
    await (0, db_1.safeQuery)(`INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`, [userId, token, expiresAt]);
    return { token, expiresAt };
}
async function verifyEmail(token) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT user_id FROM email_verification_tokens
     WHERE token = $1 AND expires_at > NOW() LIMIT 1`, [token]);
    if (!rows[0])
        return false;
    await (0, db_1.safeQuery)(`UPDATE users SET email_verified = TRUE, status = 'active', updated_at = NOW() WHERE user_id = $1`, [rows[0].user_id]);
    await (0, db_1.safeQuery)(`DELETE FROM email_verification_tokens WHERE token = $1`, [token]);
    return true;
}
//# sourceMappingURL=credential-recovery.service.js.map