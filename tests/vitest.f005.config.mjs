import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['modules/action/source/backend/action/events/action.foundation-unassigned.test.ts'],
    environment: 'node',
  },
});
