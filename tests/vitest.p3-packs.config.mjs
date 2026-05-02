import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/packs/source/backend/packs/events/packs.foundation-scope-changed.test.ts'], environment: 'node' },
});
