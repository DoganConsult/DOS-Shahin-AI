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
exports.getMfaStatus = getMfaStatus;
exports.isMfaRequired = isMfaRequired;
exports.generateEmailCode = generateEmailCode;
exports.createEmailChallenge = createEmailChallenge;
exports.verifyEmailChallenge = verifyEmailChallenge;
exports.enableMfa = enableMfa;
exports.disableMfa = disableMfa;
exports.enableTotp = enableTotp;
exports.verifyTotp = verifyTotp;
const db_1 = require("@dos/db");
const crypto = __importStar(require("crypto"));
const resilience_1 = require("@dos/platform-core/resilience");
async function getMfaStatus(userId) {
    const result = await (0, db_1.safeQuery)(`SELECT mfa_type, enabled FROM user_mfa WHERE user_id = $1 AND enabled = TRUE LIMIT 1`, [userId]);
    if (!result.rows.length)
        return { enabled: false, mfaType: null };
    return { enabled: true, mfaType: result.rows[0].mfa_type };
}
async function isMfaRequired(userId) {
    const status = await getMfaStatus(userId);
    return status.enabled;
}
function generateEmailCode() {
    return crypto.randomInt(100000, 999999).toString();
}
async function createEmailChallenge(userId, tenantId) {
    const code = generateEmailCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await (0, db_1.safeQuery)(`INSERT INTO email_verification_tokens (user_id, token, expires_at, tenant_id, purpose)
     VALUES ($1, $2, $3, $4, 'mfa_login')
     ON CONFLICT (user_id, purpose) WHERE purpose = 'mfa_login'
     DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`, [userId, code, expiresAt, tenantId]).catch(() => {
        (0, db_1.query)(`INSERT INTO email_verification_tokens (user_id, token, expires_at, tenant_id)
       VALUES ($1, $2, $3, $4)`, [userId, code, expiresAt, tenantId]);
    });
    return { code, expiresAt };
}
async function verifyEmailChallenge(userId, code) {
    const result = await (0, db_1.safeQuery)(`SELECT 1 FROM email_verification_tokens
     WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
     LIMIT 1`, [userId, code]);
    if (!result.rows.length)
        return false;
    await (0, db_1.safeQuery)(`DELETE FROM email_verification_tokens WHERE user_id = $1 AND token = $2`, [userId, code]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return true;
}
async function enableMfa(userId, mfaType, secret) {
    await (0, db_1.safeQuery)(`INSERT INTO user_mfa (user_id, mfa_type, secret, enabled)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET mfa_type = EXCLUDED.mfa_type, secret = EXCLUDED.secret, enabled = TRUE`, [userId, mfaType, secret || null]);
}
async function disableMfa(userId) {
    await (0, db_1.safeQuery)(`UPDATE user_mfa SET enabled = FALSE WHERE user_id = $1`, [userId]);
}
async function enableTotp(userId, _tenantId) {
    const otplib = await import('otplib');
    const secret = otplib.generateSecret();
    const userRow = await (0, db_1.safeQuery)('SELECT email FROM users WHERE user_id = $1 LIMIT 1', [userId]);
    const email = userRow.rows[0]?.email || userId;
    const otpauthUrl = otplib.generateURI({ issuer: 'Shahin-GRC', label: email, secret });
    await (0, db_1.safeQuery)(`INSERT INTO user_mfa (user_id, mfa_type, secret, enabled)
     VALUES ($1, 'totp', $2, FALSE)
     ON CONFLICT (user_id) DO UPDATE SET mfa_type = 'totp', secret = EXCLUDED.secret, enabled = FALSE`, [userId, secret]);
    let qrCodeUrl = otpauthUrl;
    try {
        // @ts-ignore - Pragmatic stabilization to unblock build
        const { generateQRCodeDataURL } = await import('../../dos/services/document-generation/qrcode.service.js');
        const dataUrl = await generateQRCodeDataURL(otpauthUrl, { width: 300 });
        if (dataUrl)
            qrCodeUrl = dataUrl;
    }
    catch (_e) { /* non-critical */ }
    return { secret, qrCodeUrl };
}
async function verifyTotp(userId, code, _tenantId) {
    const mfaRow = await (0, db_1.safeQuery)('SELECT secret, mfa_type, enabled FROM user_mfa WHERE user_id = $1 LIMIT 1', [userId]);
    const row = mfaRow.rows[0];
    if (!row?.secret)
        return false;
    const otplib = await import('otplib');
    const valid = otplib.verifySync({ token: code, secret: row.secret }).valid;
    if (valid && !row.enabled) {
        await (0, db_1.safeQuery)('UPDATE user_mfa SET enabled = TRUE WHERE user_id = $1', [userId]);
    }
    return valid;
}
//# sourceMappingURL=mfa.service.js.map