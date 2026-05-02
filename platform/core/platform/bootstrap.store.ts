/**
 * Re-export shim — BootstrapStore canonical location is core/services/platform/bootstrap.store.
 * This path is consumed by post-auth-orchestrator.service.ts via @app/blueprint/core/platform/bootstrap.store.
 */
export {
  BootstrapStore,
  type BootstrapData,
  type BootstrapUser,
  type BootstrapTenant,
  type BootstrapRoleProfile,
  type BootstrapWorkspace,
  type BootstrapModule,
} from '../services/platform/bootstrap.store';
