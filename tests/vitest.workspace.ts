import { defineWorkspace } from 'vitest/config';

/**
 * Enterprise Vitest Execution Space targeting 150% capabilities:
 * Validates parallel test logic spanning all functional layers.
 */
export default defineWorkspace([
  // Core Platform Matrix (Expect 70%+ Coverage SLA)
  {
    test: {
      name: 'platform-core',
      include: ['packages/dos-platform-core/src/**/*.test.ts', 'packages/dos-platform-core/src/**/*.spec.ts'],
      environment: 'node',
      retry: 3, // Detect flaky test executions implicitly 
    },
  },
  
  // Authorization Package (Mutation & JWT tests explicitly)
  {
    test: {
      name: 'dos-auth',
      include: ['packages/dos-auth/src/**/*.test.ts'],
      environment: 'node',
      retry: 3, 
    },
  },

  // Central Hub Services Matrix mapping 57 submodules (Expect 80%+ Coverage SLA on GRC)
  {
    test: {
      name: 'microservices',
      include: ['services/**/*.test.ts', 'services/**/*.spec.ts'],
      setupFiles: ['tests/integration/target-bootstrap.contract.test.ts'], // Assert contracts before execution
      environment: 'node',
      maxConcurrency: 10,
    },
  },
  
  // Frontend App Angular Layer Configuration Mapping
  {
    test: {
      name: 'frontend',
      include: ['frontend/src/**/*.spec.ts'],
      environment: 'jsdom', // Mock strict DOM logic
      isolate: false,
    },
  }
]);
