import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/audit/source/backend/audit/events/audit.foundation-role.test.ts'], environment: 'node' },
});
