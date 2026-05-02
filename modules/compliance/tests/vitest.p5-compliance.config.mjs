import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/compliance/source/backend/compliance/events/compliance.foundation-org-created.test.ts'], environment: 'node' },
});
