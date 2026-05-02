import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

function resolveFromRoot(relativePath: string): string {
  return path.join(ROOT, relativePath);
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(resolveFromRoot(relativePath), 'utf-8')) as T;
}

function expectFile(relativePath: string): void {
  const absolutePath = resolveFromRoot(relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  expect(fs.statSync(absolutePath).isFile(), `${relativePath} should be a file`).toBe(true);
}

function expectDirectoryWithEntries(relativePath: string): void {
  const absolutePath = resolveFromRoot(relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  expect(fs.statSync(absolutePath).isDirectory(), `${relativePath} should be a directory`).toBe(true);
  expect(fs.readdirSync(absolutePath).length, `${relativePath} should not be empty`).toBeGreaterThan(0);
}

type CrosswalkEntry = {
  entryCode: string;
  currentPaths: string[];
  targetPath: string;
  futureService: string;
  status: string;
};

type Inventory = {
  backendModules: string[];
  sharedPackages: string[];
  frontendModuleRoutes: string[];
  targetSeedModules: string[];
  targetSeedServices: string[];
};

describe('target bootstrap contract', () => {
  it('keeps the install-critical shared packages in the workspace', () => {
    [
      'packages/architecture-types/package.json',
      'packages/dos-contracts/package.json',
      'packages/dos-db/package.json',
      'packages/dos-module-sdk/package.json',
      'packages/dos-platform-core/package.json',
      'packages/dos-runtime-config/package.json',
      'packages/dos-event-backbone/package.json',
      'packages/dos-service-bootstrap/package.json',
      'packages/dos-types/package.json',
      'packages/shahin-product/package.json',
      'platform/dauth/packages/core/package.json',
      'platform/dauth/packages/shared/package.json',
      'platform/dauth/packages/frontend/package.json'
    ].forEach(expectFile);
  });

  it('points the platform auth-tenant-user crosswalk at verified live source paths', () => {
    const entries = readJson<CrosswalkEntry[]>('migration/crosswalks/current-estate.seed.json');
    const platformEntry = entries.find((entry) => entry.entryCode === 'platform-auth-tenant-user');

    expect(platformEntry).toBeDefined();
    expect(platformEntry?.currentPaths).toEqual([
      resolveFromRoot('platform/dauth'),
      resolveFromRoot('services/tenant-service'),
      resolveFromRoot('services/user-service')
    ]);

    platformEntry?.currentPaths.forEach((currentPath) => {
      expect(fs.existsSync(currentPath), `${currentPath} should exist in the live estate`).toBe(true);
    });
  });

  it('preserves extracted platform-core and bounded module source slices', () => {
    [
      'platform/dauth',
      'platform/dsoc',
      'platform/dnoc',
      'platform/dos',
      'modules/onboarding/source/backend/onboarding',
      'modules/onboarding/source/frontend/onboarding',
      'modules/onboarding/source/contracts',
      'modules/governance/source/backend/governance',
      'modules/governance/source/frontend/governance',
      'modules/governance/source/contracts'
    ].forEach(expectDirectoryWithEntries);
  });

  it('keeps generated inventory aligned with the extracted target surfaces', () => {
    const inventory = readJson<Inventory>('migration/inventory/current-estate.generated.json');

    expect(inventory.targetSeedModules).toEqual(
      expect.arrayContaining(['audit', 'compliance', 'evidence', 'governance', 'onboarding', 'reporting', 'risk'])
    );
    expect(inventory.targetSeedServices).toEqual(
      expect.arrayContaining([
        'auth-service',
        'gateway',
        'governance-policy-service',
        'onboarding-service',
        'tenant-service',
        'user-service',
        'workflow-service'
      ])
    );
    expect(inventory.backendModules).toContain('governance');
    expect(inventory.frontendModuleRoutes).toContain('governance.module.routes.ts');
  });
});
