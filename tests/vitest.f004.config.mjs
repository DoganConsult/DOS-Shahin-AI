import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['modules/issues/source/backend/issues/events/issues.foundation-unassigned.test.ts'],
    environment: 'node',
  },
});
