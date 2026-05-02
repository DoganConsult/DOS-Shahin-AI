/**
 * workflow-service / config / openfga
 *
 * Re-export of the canonical OpenFGA client helpers from
 * `@dos/platform-core/security`. Keeps the provisioning activity's legacy
 * import path (`../../config/openfga.js`) working without duplicating the
 * client implementation.
 */

export { checkPermission, openfgaConnected, openfgaClient } from '@dos/platform-core/security';
