import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['modules/evidence/source/backend/evidence/events/evidence.foundation-unassigned.test.ts'],
    environment: 'node',
  },
});
