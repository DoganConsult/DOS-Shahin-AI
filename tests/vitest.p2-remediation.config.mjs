import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['modules/remediation/source/backend/remediation/events/remediation.foundation-manager-changed.test.ts'],
    environment: 'node',
  },
});
