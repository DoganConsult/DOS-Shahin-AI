"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTESTATION_ACTIONS = exports.ATTESTATION_ROLES = exports.ATTESTATION_PERMISSIONS = void 0;
const attestation_module_1 = require("../attestation.module");
/**
 * Attestation Module — Security Extraction
 * Re-exports from manifest for independent consumption by seed-module-security.
 */
exports.ATTESTATION_PERMISSIONS = attestation_module_1.ATTESTATION_MANIFEST.securityPermissions;
exports.ATTESTATION_ROLES = attestation_module_1.ATTESTATION_MANIFEST.securityRoles;
exports.ATTESTATION_ACTIONS = attestation_module_1.ATTESTATION_MANIFEST.securityActions;
//# sourceMappingURL=attestation.security.js.map