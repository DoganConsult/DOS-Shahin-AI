/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/validation/**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**'
    ],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose']
  },
  resolve: {
    alias: {
      '@': '/root/DOS-AIO'
    }
  }
});
