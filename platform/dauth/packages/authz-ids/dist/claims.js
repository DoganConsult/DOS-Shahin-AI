"use strict";
/**
 * Canonical JWT claim shape emitted by Keycloak and consumed by DAuth. Every
 * new protocol mapper added to the realm MUST be reflected here. DAuth's
 * principal-resolution service uses this interface as the authoritative input
 * contract — services never read the raw token.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_CLAIM_KEYS = exports.CANONICAL_SCOPES = void 0;
exports.CANONICAL_SCOPES = {
    openid: 'openid',
    profile: 'profile',
    email: 'email',
    offlineAccess: 'offline_access',
    groups: 'groups',
    realmRoles: 'realm-roles',
};
exports.CANONICAL_CLAIM_KEYS = [
    'dos_user_id',
    'dos_tenant_id',
    'dos_workspace_id',
    'dos_product_code',
    'dos_role_profile',
    'dos_acr_required',
    'dos_risk_score',
    'dos_bootstrap_status',
];
//# sourceMappingURL=claims.js.map