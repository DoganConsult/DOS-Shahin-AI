import { authenticate as _authenticate } from '../../ports/auth.port';
/**
 * Qiyas route shim -- delegates to the module-scoped controller.
 * Listed in ROUTE_MODULE_MAP for governance audits.
 */
export { default } from '../modules/qiyas/qiyas.controller';
