/**
 * @dos/dos-frontend — Angular DI surface for DOS consumers.
 */

export {
  DOS_TENANT_LOOKUP_PORT,
  DOS_MODULE_REGISTRY_PORT,
  DOS_PRODUCT_REGISTRY_PORT,
  DOS_EVENT_LOG_PORT,
} from './ports';

export type {
  DOSTenantLookupPort,
  DOSModuleRegistryPort,
  DOSProductRegistryPort,
  DOSEventLogPort,
} from './ports';

export {
  DOSTenantLookupHttpClient,
  DOSModuleRegistryHttpClient,
  DOSProductRegistryHttpClient,
  DOSEventLogHttpClient,
} from './services/dos-http.client';

export { DosRegistryExplorerComponent } from './components/registry-explorer/dos-registry-explorer.component';
