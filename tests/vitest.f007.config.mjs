import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['modules/vendor/source/backend/vendor/events/vendor.foundation-unassigned.test.ts'],
    environment: 'node',
  },
});
