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
exports.createInvitation = createInvitation;
exports.validateInvitation = validateInvitation;
exports.acceptInvitation = acceptInvitation;
exports.revokeInvitation = revokeInvitation;
exports.getPendingInvitations = getPendingInvitations;
exports.expireStaleInvitations = expireStaleInvitations;
const crypto = __importStar(require("crypto"));
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const tenant_security_policy_service_1 = require("../policies/tenant-security-policy.service");
const resilience_1 = require("@dos/platform-core/resilience");
async function createInvitation(tenantId, email, roleCode, invitedBy) {
    const policy = await (0, tenant_security_policy_service_1.getTenantSecurityPolicy)(tenantId);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + policy.invitationExpiryHours * 60 * 60_000);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO invitations (tenant_id, email, role_code, invited_by, status, token, expires_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING invitation_id, created_at`, [tenantId, email, roleCode, invitedBy, token, expiresAt]);
    await (0, publish_with_dsoc_1.publish)('dauth.invitation.created', tenantId, { email, roleCode, invitedBy }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    const row = rows[0];
    return {
        invitationId: row.invitation_id,
        tenantId,
        email,
        roleCode,
        invitedBy,
        status: 'pending',
        token,
        expiresAt: expiresAt.toISOString(),
        createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
        acceptedAt: null,
    };
}
async function validateInvitation(token) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT invitation_id, tenant_id, email, role_code, invited_by, status,
            token, expires_at, created_at, accepted_at
     FROM invitations
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW() LIMIT 1`, [token]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        invitationId: r.invitation_id,
        tenantId: r.tenant_id,
        email: r.email,
        roleCode: r.role_code,
        invitedBy: r.invited_by,
        status: r.status,
        token: r.token,
        expiresAt: r.expires_at?.toISOString?.() ?? '',
        createdAt: r.created_at?.toISOString?.() ?? '',
        acceptedAt: null,
    };
}
async function acceptInvitation(token) {
    const result = await (0, db_1.safeQuery)(`UPDATE invitations SET status = 'accepted', accepted_at = NOW()
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`, [token]);
    return (result.rowCount ?? 0) > 0;
}
async function revokeInvitation(invitationId, _revokedBy) {
    const result = await (0, db_1.safeQuery)(`UPDATE invitations SET status = 'revoked'
     WHERE invitation_id = $1 AND status = 'pending'`, [invitationId]);
    return (result.rowCount ?? 0) > 0;
}
async function getPendingInvitations(tenantId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT invitation_id, tenant_id, email, role_code, invited_by, status,
            token, expires_at, created_at, accepted_at
     FROM invitations
     WHERE tenant_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`, [tenantId]);
    return rows.map((r) => ({
        invitationId: r.invitation_id,
        tenantId: r.tenant_id,
        email: r.email,
        roleCode: r.role_code,
        invitedBy: r.invited_by,
        status: r.status,
        token: r.token,
        expiresAt: r.expires_at?.toISOString?.() ?? '',
        createdAt: r.created_at?.toISOString?.() ?? '',
        acceptedAt: null,
    }));
}
async function expireStaleInvitations() {
    const result = await (0, db_1.safeQuery)(`UPDATE invitations SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`);
    return result.rowCount ?? 0;
}
//# sourceMappingURL=invitation-control.service.js.map