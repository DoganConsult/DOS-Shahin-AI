import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/compliance/source/backend/compliance/events/compliance.foundation-scope-changed.test.ts'], environment: 'node' },
});
