/**
 * dependency-cruiser configuration for DOS-AIO.
 *
 * Minimal ruleset that detects real problems without being a false-green:
 *   - circular imports
 *   - imports from dist/ (compiled output must not leak into sources)
 *   - unresolvable specifiers
 *   - imports reaching into another service's internals
 *
 * Invoked by `pnpm run verify:imports` against services/ and modules/.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Circular imports indicate tangled module boundaries.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-dist-imports',
      severity: 'error',
      comment: 'Do not import from another package\'s dist/ — use the package entry.',
      from: {},
      to: { path: '/dist/' },
    },
    {
      name: 'no-unresolvable',
      severity: 'error',
      comment: 'Import specifier cannot be resolved. Usually a typo, missing file, or missing dep.',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'service-to-service-internal',
      severity: 'error',
      comment: 'Services must not import another service\'s src/ directly — go through a shared package.',
      from: { path: '^services/([^/]+)/src' },
      to: {
        path: '^services/(?!$1)(?!_shared/)(?!_service-template/)[^/]+/src',
      },
    },
    {
      name: 'dauth-isolation',
      severity: 'error',
      comment:
        'DAuth must not import from sibling platform modules (DSOC/DNOC) or from any product. ' +
        'Cross-module communication goes through @dos/ports + the event-backbone, not direct imports. ' +
        'Allowed dependencies are declared in platform/dauth/module.manifest.json -> metadata.consumes.',
      from: { path: '^platform/dauth/' },
      to: {
        path: [
          '^platform/dsoc/',
          '^platform/dnoc/',
          '^products/',
          '^packages/shahin-product',
          '^packages/[^/]+-product',
          '^frontend/products/',
        ],
      },
    },
    {
      name: 'modules-cannot-import-dauth-direct',
      severity: 'error',
      comment:
        'Product modules MUST consume the auth surface through `@dos/module-auth`. ' +
        'Importing from `@dos/dauth-*` (core, shared, frontend) directly couples the ' +
        'module to a specific auth platform and breaks portability. The product shell is the ' +
        'gateway that adapts the underlying auth platform to `@dos/module-auth`.',
      from: { path: '^modules/' },
      to: {
        path: [
          '^platform/dauth/',
          '@dos/dauth-core',
          '@dos/dauth-shared',
          '@dos/dauth-frontend',
          '@dos/dauth-csrf',
        ],
      },
    },
    {
      name: 'dsoc-isolation',
      severity: 'error',
      comment:
        'DSOC must not import from sibling platform modules (DAuth/DNOC) or from any product. ' +
        'Inbound work flows through the event-backbone (dsoc.audit.* / dsoc.alert.* topics); ' +
        'outbound queries flow through @dos/ports interfaces.',
      from: { path: '^platform/dsoc/' },
      to: {
        path: [
          '^platform/dauth/',
          '^platform/dnoc/',
          '^products/',
          '^packages/shahin-product',
          '^packages/[^/]+-product',
          '^frontend/products/',
        ],
      },
    },
    {
      name: 'modules-cannot-import-dsoc-direct',
      severity: 'error',
      comment:
        'Product modules MUST consume the security-ops surface through `@dos/module-soc`. ' +
        'Importing from `@dos/dsoc-*` (core, shared, frontend) directly couples the ' +
        'module to the specific security-ops platform and breaks portability.',
      from: { path: '^modules/' },
      to: {
        path: [
          '^platform/dsoc/',
          '@dos/dsoc-core',
          '@dos/dsoc-shared',
          '@dos/dsoc-frontend',
        ],
      },
    },
    {
      name: 'dnoc-isolation',
      severity: 'error',
      comment:
        'DNOC must not import from sibling platform modules (DAuth/DSOC) or from any product. ' +
        'Metrics/logs/traces/health flow inbound via the DNOCPort REST or direct calls; ' +
        'outbound queries flow through @dos/ports interfaces.',
      from: { path: '^platform/dnoc/' },
      to: {
        path: [
          '^platform/dauth/',
          '^platform/dsoc/',
          '^products/',
          '^packages/shahin-product',
          '^packages/[^/]+-product',
          '^frontend/products/',
        ],
      },
    },
    {
      name: 'modules-cannot-import-dnoc-direct',
      severity: 'error',
      comment:
        'Product modules MUST consume the telemetry surface through `@dos/module-telemetry`. ' +
        'Importing from `@dos/dnoc-*` (core, shared, frontend) directly couples the ' +
        'module to the specific observability platform and breaks portability.',
      from: { path: '^modules/' },
      to: {
        path: [
          '^platform/dnoc/',
          '@dos/dnoc-core',
          '@dos/dnoc-shared',
          '@dos/dnoc-frontend',
        ],
      },
    },
    {
      name: 'dos-isolation',
      severity: 'error',
      comment:
        'DOS (orchestrator) must not import from sibling platform modules or from any product. ' +
        'Other modules reach DOS through @dos/ports/dos.DOSPort — never the other direction.',
      from: { path: '^platform/dos/' },
      to: {
        path: [
          '^platform/dauth/',
          '^platform/dsoc/',
          '^platform/dnoc/',
          '^products/',
          '^packages/shahin-product',
          '^packages/[^/]+-product',
          '^frontend/products/',
        ],
      },
    },
    {
      name: 'modules-cannot-import-dos-direct',
      severity: 'error',
      comment:
        'Product modules MUST consume the orchestrator through `@dos/module-dos`. ' +
        'Importing from `@dos/dos-*` (core, shared, frontend) directly couples the ' +
        'module to the specific DOS implementation and breaks portability.',
      from: { path: '^modules/' },
      to: {
        path: [
          '^platform/dos/',
          '@dos/dos-core',
          '@dos/dos-shared',
          '@dos/dos-frontend',
        ],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: 'node_modules|/dist/|\\.test\\.ts$|\\.spec\\.ts$|/__tests__/|\\.d\\.ts$',
    },
    combinedDependencies: true,
    progress: { type: 'none' },
    // Honour package.json `exports` conditional resolution (e.g.
    // `@dos/platform-core/observability`). Without this, cruiser falls back to
    // main-field resolution only and reports valid subpath imports as
    // no-unresolvable.
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['require', 'import', 'node', 'default', 'types', 'development'],
      mainFields: ['main', 'types'],
      extensions: ['.ts', '.js', '.d.ts'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
