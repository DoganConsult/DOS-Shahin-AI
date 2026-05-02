import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/training/source/backend/training/events/training.foundation-dept-created.test.ts'], environment: 'node' },
});
