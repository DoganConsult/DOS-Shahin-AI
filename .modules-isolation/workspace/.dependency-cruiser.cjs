/**
 * Boundary rules for the standalone modules preview workspace.
 * Forbids any escape from modules/ or vendor-shims/.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-dist-imports',
      severity: 'error',
      from: {},
      to: { path: '/dist/' },
    },
    {
      name: 'no-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'modules-must-be-self-contained',
      severity: 'error',
      comment:
        'modules/ must only consume its own packages (modules/packages/*) ' +
        'and the vendor-shims/. Anything else proves an isolation leak.',
      from: { path: '^modules/' },
      to: {
        path: '^(\\.\\./)+(?!modules/|vendor-shims/)',
      },
    },
    {
      name: 'no-platform-imports',
      severity: 'error',
      from: {},
      to: { path: '^(platform|services|products)/' },
    },
    {
      name: 'allowed-external-dos-only',
      severity: 'error',
      comment:
        'Only the four shimmed @dos/* packages are allowed as externals: ' +
        '@dos/dauth-shared, @dos/ui-system, @dos/ai-gateway, @dos/auth. ' +
        'All other @dos/* must resolve inside modules/packages/*.',
      from: { path: '^modules/' },
      to: {
        path: '^@dos/',
        pathNot: [
          '^@dos/(dauth-shared|ui-system|ai-gateway|auth)$',
          // workspace packages (resolved locally)
          '^@dos/(platform-core|module-sdk|db|types|contracts|ports|event-backbone',
          'service-client|service-bootstrap|runtime-config|module-dos|module-soc',
          'module-telemetry|module-compliance|module-risk|module-qiyas',
          'sdk-compliance|architecture-types|legacy-config|legacy-errors',
          'legacy-modules|legacy-utils|bcp-service|vendor-service',
          'dnoc-contract-tests|dos-contract-tests|dsoc-contract-tests)$',
        ],
      },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(modules|vendor-shims)/',
  },
};
