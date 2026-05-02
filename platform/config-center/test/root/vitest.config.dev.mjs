import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.mjs';

const devConfig = defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/dev',
    },
    setupFiles: ['./test-setup.ts'],
    env: {
      NODE_ENV: 'development',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc_dev',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      LOG_LEVEL: 'debug',
      MOCK_EXTERNAL_SERVICES: 'true',
    },
  },
});

export default mergeConfig(baseConfig, devConfig);
