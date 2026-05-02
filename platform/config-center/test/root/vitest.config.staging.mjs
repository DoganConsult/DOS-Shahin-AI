import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.mjs';

const stagingConfig = defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      reporter: ['text', 'lcov', 'html', 'json'],
      reportsDirectory: './coverage/staging',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
    setupFiles: ['./test-setup.ts'],
    env: {
      NODE_ENV: 'staging',
      DATABASE_URL: process.env.STAGING_DATABASE_URL || 'postgresql://staging_user:staging_pass@staging-db.example.com:5432/shahin_grc_staging',
      REDIS_URL: process.env.STAGING_REDIS_URL || 'redis://staging-redis.example.com:6379',
      LOG_LEVEL: 'info',
      MOCK_EXTERNAL_SERVICES: 'false',
      REAL_EXTERNAL_APIS: 'true',
    },
  },
});

export default mergeConfig(baseConfig, stagingConfig);
