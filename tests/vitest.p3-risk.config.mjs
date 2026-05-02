import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['services/risk-incident-service/src/domain/risk/events/risk.foundation-scope-changed.test.ts'], environment: 'node' },
});
