/**
 * Consumer contract test — dos-service itself as a DOSPort consumer.
 */

import { beforeEach, afterEach } from 'vitest';
import {
  createDOSPort,
  setDOSPort,
  getDOSPort,
  resetDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '@dos/dos-core';
import { runDOSPortContract } from '@dos/dos-contract-tests';

beforeEach(() => {
  resetDOSPort();
  setDOSPort(
    createDOSPort({
      tenants: new InMemoryTenantsRepository(),
      modules: new InMemoryModulesRepository(),
      products: new InMemoryProductsRepository(),
      events: new InMemoryEventsLogRepository(),
      backbonePublisher: { publish: async () => {} },
      backboneSubscriber: { subscribe: () => {} },
    }),
  );
});
afterEach(() => resetDOSPort());

runDOSPortContract(() => getDOSPort(), { consumerName: 'dos-service' });
