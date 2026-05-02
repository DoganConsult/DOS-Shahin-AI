import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['modules/issues/source/backend/issues/events/issues.foundation-manager-changed.test.ts'],
    environment: 'node',
  },
});
