/**
 * Re-export shim — PlatformBootstrapService canonical location is core/services/platform/platform-bootstrap.service.
 * This path is consumed by bootstrap.guard.ts via ../../services/platform-bootstrap.service.
 */
export {
  PlatformBootstrapService,
  type PlatformBootstrapConfig,
  type BootstrapContext,
  type BootstrapContextEntitlements,
  type BootstrapContextData,
} from './platform/platform-bootstrap.service';
