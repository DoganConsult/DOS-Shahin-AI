export * from './component-keys.js';
export * from './responsive-contract.js';
export * from './action-contract.js';
export * from './navigation-contract.js';
export * from './nav-contract.js';
export * from './page-contract.js';
export * from './capability-registry.js';
export * from './workspace-resolver-contract.js';
export * from './workspace-gate-attributes.js';
export * from './shell-action.contract.js';
// Phase F — mobile component contract removed. The DB-shaped (snake_case)
// interfaces are dead now that /api/ui-os/mobile-* is gone. Mobile config
// is normalized to camelCase WorkspaceRuntimeBreakpoint /
// WorkspaceRuntimeTouchGesture / WorkspaceRuntimeTouchTargets /
// WorkspaceRuntimeVariant inside @dos/ui-system's workspace-shell
// contracts and consumed via WorkspaceShellBindingService.
