/**
 * Consumer contract test — dnoc-service itself as a DNOCPort consumer.
 */

import { beforeEach, afterEach } from 'vitest';
import {
  createDNOCPort,
  setDNOCPort,
  getDNOCPort,
  resetDNOCPort,
  InMemoryMetricsRepository,
  InMemoryLogsRepository,
  InMemoryTracesRepository,
  InMemoryRoutesRepository,
  InMemoryHealthRepository,
} from '@dos/dnoc-core';
import { runDNOCPortContract } from '@dos/dnoc-contract-tests';

beforeEach(() => {
  resetDNOCPort();
  setDNOCPort(
    createDNOCPort({
      metrics: new InMemoryMetricsRepository(),
      logs: new InMemoryLogsRepository(),
      traces: new InMemoryTracesRepository(),
      routes: new InMemoryRoutesRepository(),
      health: new InMemoryHealthRepository(),
    }),
  );
});
afterEach(() => resetDNOCPort());

runDNOCPortContract(() => getDNOCPort(), { consumerName: 'dnoc-service' });
