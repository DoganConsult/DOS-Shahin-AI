import { ATTESTATION_MANIFEST } from '../attestation.module';

/**
 * Attestation Module — Security Extraction
 * Re-exports from manifest for independent consumption by seed-module-security.
 */
export const ATTESTATION_PERMISSIONS = ATTESTATION_MANIFEST.securityPermissions;
export const ATTESTATION_ROLES = ATTESTATION_MANIFEST.securityRoles;
export const ATTESTATION_ACTIONS = ATTESTATION_MANIFEST.securityActions;
