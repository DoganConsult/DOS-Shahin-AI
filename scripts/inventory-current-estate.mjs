import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, SOURCE_ROOT, resolveRepoPath } from './lib/repo-root.mjs';

const OUTPUT_PATH = resolveRepoPath('migration', 'inventory', 'current-estate.generated.json');

function listDirectories(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => {
      if (entry.isDirectory()) return true;
      if (!entry.isSymbolicLink()) return false;
      try {
        return fs.statSync(path.join(dir, entry.name)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((entry) => entry.name)
    .sort();
}

function listFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith(suffix))
    .sort();
}

const inventory = {
  sourceRoot: SOURCE_ROOT,
  targetRoot: REPO_ROOT,
  generatedAt: new Date().toISOString(),
  backendModules: listDirectories(resolveRepoPath('modules')),
  sharedPackages: listDirectories(resolveRepoPath('packages')),
  frontendModuleRoutes: listFiles(resolveRepoPath('frontend/products/shahin/src/app/platform-manifests'), '.routes.ts'),
  targetSeedModules: listDirectories(resolveRepoPath('modules')),
  targetSeedServices: listDirectories(resolveRepoPath('services')),
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(inventory, null, 2));
console.log(`Wrote ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
