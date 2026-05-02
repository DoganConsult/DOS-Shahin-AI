import { defineConfig } from '@stryker-mutator/api/core';

export default defineConfig({
  // Test runner configuration
  testRunner: 'vitest',
  testRunnerComment: 'Use Vitest as the test runner',
  
  // Mutation testing options
  mutator: 'typescript',
  mutatorComment: 'Use TypeScript mutator for TypeScript code',
  
  // Transpilers
  transpilers: ['typescript'],
  transpilersComment: 'Transpile TypeScript code before mutation',
  
  // Coverage analysis
  coverageAnalysis: 'perTest',
  coverageAnalysisComment: 'Analyze coverage per test for better mutation detection',
  
  // Reporters
  reporters: ['progress', 'clear-text', 'html', 'json'],
  reportersComment: 'Generate multiple report formats',
  
  // Files to mutate
  files: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.test.ts',
    '!src/mocks/**/*',
    '!src/types/**/*'
  ],
  filesComment: 'Mutate all TypeScript source files except tests and types',
  
  // Files to ignore for mutation
  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    '*.config.js',
    '*.config.ts'
  ],
  ignorePatternsComment: 'Ignore build artifacts and configuration files',
  
  // Mutation thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: 40
  },
  thresholdsComment: 'Set mutation score thresholds',
  
  // Timeout settings
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  timeoutComment: 'Set generous timeouts for mutation testing',
  
  // Max concurrent test runners
  maxConcurrentTestRunners: 4,
  maxConcurrentTestRunnersComment: 'Limit concurrent runners for stability',
  
  // Mutators to use
  mutators: [
    // Arithmetic operators
    'ArithmeticOperator',
    'ArithmeticOperator',
    
    // Logical operators
    'LogicalOperator',
    'LogicalOperator',
    
    // Equality operators
    'EqualityOperator',
    'EqualityOperator',
    
    // Conditional operators
    'ConditionalOperator',
    'ConditionalOperator',
    
    // Array methods
    'ArrayMethod',
    'ArrayMethod',
    
    // Object methods
    'ObjectMethod',
    'ObjectMethod',
    
    // String methods
    'StringMethod',
    'StringMethod',
    
    // Function calls
    'FunctionCall',
    'FunctionCall',
    
    // Unary operators
    'UnaryOperator',
    'UnaryOperator',
    
    // Update operators
    'UpdateOperator',
    'UpdateOperator',
    
    // Block statements
    'BlockStatement',
    'BlockStatement',
    
    // Return statements
    'ReturnStatement',
    'ReturnStatement',
    
    // Assignment operators
    'AssignmentOperator',
    'AssignmentOperator',
    
    // Boolean literals
    'BooleanLiteral',
    'BooleanLiteral',
    
    // Numeric literals
    'NumericLiteral',
    'NumericLiteral',
    
    // String literals
    'StringLiteral',
    'StringLiteral',
    
    // Template literals
    'TemplateLiteral',
    'TemplateLiteral'
  ],
  mutatorsComment: 'Use comprehensive set of mutators for thorough testing',
  
  // Plugin configuration
  plugins: [
    '@stryker-mutator/vitest-runner',
    '@stryker-mutator/typescript-checker'
  ],
  pluginsComment: 'Use Vitest runner and TypeScript checker plugins',
  
  // TypeScript checker configuration
  tsconfigFile: 'tsconfig.json',
  tsconfigComment: 'Use main TypeScript config file',
  
  // Dry run to verify setup
  dryRunOnly: false,
  dryRunComment: 'Run actual mutation testing, not just dry run',
  
  // Incremental results
  incremental: false,
  incrementalComment: 'Run full mutation testing each time',
  
  // Temp directory
  tempDirName: '.stryker-tmp',
  tempDirComment: 'Use specific temp directory for Stryker',
  
  // Log level
  logLevel: 'info',
  logLevelComment: 'Set appropriate log level',
  
  // Clean temp files
  cleanTempDir: true,
  cleanTempDirComment: 'Clean temporary files after testing'
});

// Mutation testing scripts for package.json
export const mutationScripts = {
  'mutation:test': 'stryker run',
  'mutation:report': 'stryker run --reporters html,json',
  'mutation:threshold': 'stryker run --break 60',
  'mutation:incremental': 'stryker run --incremental',
  'mutation:coverage': 'stryker run --coverageAnalysis perTest'
};

// Recommended mutation testing strategy
export const mutationStrategy = {
  // Core modules (high priority)
  core: {
    files: ['src/core/**/*.ts', 'src/services/**/*.ts'],
    thresholds: { high: 90, low: 70, break: 50 },
    comment: 'Core business logic with high quality standards'
  },
  
  // Platform modules (medium priority)
  platform: {
    files: ['src/platform/**/*.ts'],
    thresholds: { high: 80, low: 60, break: 40 },
    comment: 'Platform infrastructure with standard quality standards'
  },
  
  // Utility modules (low priority)
  utils: {
    files: ['src/utils/**/*.ts', 'src/helpers/**/*.ts'],
    thresholds: { high: 70, low: 50, break: 30 },
    comment: 'Utility functions with relaxed quality standards'
  },
  
  // Test files (exclude from mutation)
  tests: {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: true,
    comment: 'Never mutate test files'
  }
};

// Mutation testing CI integration
export const ciIntegration = {
  // GitHub Actions workflow
  githubActions: `
name: Mutation Testing
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run mutation testing
        run: npm run mutation:report
      
      - name: Upload mutation report
        uses: actions/upload-artifact@v3
        with:
          name: mutation-report
          path: reports/mutation/html
  `,
  
  // Quality gates
  qualityGates: {
    // Block merge if mutation score drops below threshold
    blockMerge: true,
    threshold: 60,
    
    // Require review for low mutation scores
    requireReview: true,
    reviewThreshold: 40,
    
    // Create issues for surviving mutants
    createIssues: true,
    issueThreshold: 20
  }
};

// Performance optimization
export const performanceOptimization = {
  // Parallel execution
  parallel: {
    enabled: true,
    maxWorkers: 4,
    workerMemory: '2GB'
  },
  
  // Incremental testing
  incremental: {
    enabled: true,
    cacheDir: '.stryker-cache',
    strategy: 'file-based'
  },
  
  // Selective mutation
  selective: {
    enabled: true,
    criteria: ['changed-files', 'coverage-based'],
    excludeLowRisk: true
  }
};
