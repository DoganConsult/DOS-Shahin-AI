import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/knowledge/source/backend/knowledge/events/knowledge.foundation-scope-changed.test.ts'], environment: 'node' },
});
