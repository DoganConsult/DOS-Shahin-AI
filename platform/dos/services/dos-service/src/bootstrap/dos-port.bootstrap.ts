/**
 * DOS port bootstrap — binds the persistent DOSPort on service startup.
 *
 * The Pg repositories read from / write to platform_dos.*. The
 * backbone publisher + subscriber adapt the service's event-bus so the
 * port's pub/sub methods delegate to it transparently.
 */

import {
  createDOSPort,
  setDOSPort,
  PgTenantsRepository,
  PgModulesRepository,
  PgProductsRepository,
  PgEventsLogRepository,
  type BackbonePublisher,
  type BackboneSubscriber,
} from '@dos/dos-core';
import { assertPortsCompatible } from '@dos/ports';

export interface BootstrapDeps {
  readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>;
  readonly backbonePublisher: BackbonePublisher;
  readonly backboneSubscriber: BackboneSubscriber;
}

export function bootstrapDOSPlatformPort(deps: BootstrapDeps): void {
  assertPortsCompatible('dos', '1.0');
  const port = createDOSPort({
    tenants: new PgTenantsRepository(deps.query),
    modules: new PgModulesRepository(deps.query),
    products: new PgProductsRepository(deps.query),
    events: new PgEventsLogRepository(deps.query),
    backbonePublisher: deps.backbonePublisher,
    backboneSubscriber: deps.backboneSubscriber,
  });
  setDOSPort(port);
}
