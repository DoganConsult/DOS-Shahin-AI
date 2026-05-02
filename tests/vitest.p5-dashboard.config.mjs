import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/dashboard/source/backend/dashboard/events/dashboard.foundation-org-updated.test.ts'], environment: 'node' },
});
