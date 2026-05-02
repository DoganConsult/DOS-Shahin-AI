// Cross-module proxy: re-export canonical obligation.service from
// modules/governance. Compliance route files dynamically import via
// `../../../governance/services/misc/obligation.service.js` which
// resolves here. The deeper relative path is how modules/governance is
// reached within the shared tsconfig.modules.json include.
export * from '../../../../../../governance/source/backend/governance/services/misc/obligation.service';
