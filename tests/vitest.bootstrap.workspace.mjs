// Wave-1 bootstrap workspace wrapper.
// Tells vitest 1.6 to use ONLY the bootstrap config (root integration/contract/migration suites),
// shadowing the per-package workspace projects in tests/vitest.workspace.ts.
export default ['./tests/vitest.bootstrap.config.mjs'];
