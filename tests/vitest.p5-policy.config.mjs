import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/policy/source/backend/policy/events/policy.foundation-org-created.test.ts'], environment: 'node' },
});
