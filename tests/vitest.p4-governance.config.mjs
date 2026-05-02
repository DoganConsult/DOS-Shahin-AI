import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/governance/source/backend/governance/events/governance.foundation-role.test.ts'], environment: 'node' },
});
