import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoPath } from './lib/repo-root.mjs';

const crosswalkPath = resolveRepoPath('migration', 'crosswalks', 'current-estate.seed.json');

const entries = [
  {
    entryCode: 'platform-auth-tenant-user',
    currentPaths: [
      resolveRepoPath('platform', 'dauth'),
      resolveRepoPath('services', 'tenant-service'),
      resolveRepoPath('services', 'user-service')
    ],
    targetPath: 'platform/core',
    ownership: 'platform-owned',
    futureService: 'auth-service',
    status: 'inventory'
  },
  {
    entryCode: 'module-onboarding',
    currentPaths: [resolveRepoPath('modules', 'onboarding')],
    targetPath: 'modules/onboarding',
    ownership: 'module-owned',
    futureService: 'onboarding-service',
    status: 'copy-ready'
  },
  {
    entryCode: 'module-governance',
    currentPaths: [resolveRepoPath('modules', 'governance')],
    targetPath: 'modules/governance',
    ownership: 'module-owned',
    futureService: 'governance-policy-service',
    status: 'copy-ready'
  },
  {
    entryCode: 'module-risk',
    currentPaths: [resolveRepoPath('modules', 'risk')],
    targetPath: 'modules/risk',
    ownership: 'module-owned',
    futureService: 'risk-incident-service',
    status: 'copy-ready'
  },
  {
    entryCode: 'module-compliance',
    currentPaths: [resolveRepoPath('modules', 'compliance')],
    targetPath: 'modules/compliance',
    ownership: 'module-owned',
    futureService: 'compliance-controls-service',
    status: 'copy-ready'
  },
  {
    entryCode: 'module-evidence-audit-reporting',
    currentPaths: [
      resolveRepoPath('modules', 'evidence'),
      resolveRepoPath('modules', 'audit'),
      resolveRepoPath('modules', 'reporting')
    ],
    targetPath: 'modules/evidence',
    ownership: 'module-owned',
    futureService: 'evidence-audit-reporting-service',
    status: 'copy-ready'
  }
];

fs.writeFileSync(crosswalkPath, JSON.stringify(entries, null, 2));
console.log(`Wrote ${crosswalkPath}`);
