import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/training/source/backend/training/events/training.foundation-position-assigned.test.ts'], environment: 'node' },
});
