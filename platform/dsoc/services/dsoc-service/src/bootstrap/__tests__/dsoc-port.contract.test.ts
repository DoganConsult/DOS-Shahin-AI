/**
 * Consumer contract test — dsoc-service itself as a DSOCPort consumer.
 * Runs the shared suite against the in-memory-repo DSOCPort.
 */

import { beforeEach, afterEach } from 'vitest';
import {
  createDSOCPort,
  setDSOCPort,
  getDSOCPort,
  resetDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '@dos/dsoc-core';
import { runDSOCPortContract } from '@dos/dsoc-contract-tests';

beforeEach(() => {
  resetDSOCPort();
  setDSOCPort(
    createDSOCPort({
      auditLog: new InMemoryAuditLogRepository(),
      alerts: new InMemoryAlertsRepository(),
      posture: new InMemoryPostureRepository(),
    }),
  );
});
afterEach(() => resetDSOCPort());

runDSOCPortContract(() => getDSOCPort(), { consumerName: 'dsoc-service' });
