import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.mjs';

const productionConfig = defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'json'],
      reportsDirectory: './coverage/production',
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    setupFiles: ['./test-setup.ts'],
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.PROD_DATABASE_URL,
      REDIS_URL: process.env.PROD_REDIS_URL,
      LOG_LEVEL: 'warn',
      MOCK_EXTERNAL_SERVICES: 'false',
      REAL_EXTERNAL_APIS: 'true',
      PERFORMANCE_MONITORING: 'true',
    },
  },
});

export default mergeConfig(baseConfig, productionConfig);
