import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/controls/source/backend/controls/events/controls.foundation-dept-created.test.ts'], environment: 'node' },
});
