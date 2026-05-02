import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['modules/foundation/source/backend/foundation/events/foundation.phase8-cross-module.test.ts'], environment: 'node' },
});
