import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // The delegation service imports audit via a deep relative path that escapes the repo.
      // Redirect to the real file so vitest can resolve and mock it.
      '/root/modules/audit/source/backend/audit/services/audit/core/audit-trail.service':
        path.resolve(__dirname, '../../modules/audit/source/backend/audit/services/audit/core/audit-trail.service.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    setupFiles: ['./src/test-setup.ts'],
  },
});
