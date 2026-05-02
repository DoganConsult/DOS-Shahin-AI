import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['modules/exception/source/backend/exception/events/exception.foundation-manager-changed.test.ts'],
    environment: 'node',
  },
});
