import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/privacy/source/backend/privacy/events/privacy.foundation-role.test.ts'], environment: 'node' },
});
