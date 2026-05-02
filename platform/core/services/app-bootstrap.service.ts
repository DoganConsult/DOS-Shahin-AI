/**
 * Re-export shim — AppBootstrapService canonical location is core/services/platform/app-bootstrap.service.
 * This path is consumed by post-auth-orchestrator.service.ts via ../../services/app-bootstrap.service.
 */
export {
  AppBootstrapService,
  type BootstrapSessionResponse,
  SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS,
  UNIFIED_BOOTSTRAP_MAX_MS,
  REGISTRY_HTTP_TIMEOUT_MS,
} from './platform/app-bootstrap.service';
