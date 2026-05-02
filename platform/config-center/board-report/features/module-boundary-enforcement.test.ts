/**
 * Module Boundary Enforcement Tests
 *
 * Validates that feature modules respect architectural boundaries:
 * 1. No cross-feature imports except through barrel (index.ts)
 * 2. No imports from another feature's pages/ directory
 * 3. GrcService import count ratchets down toward zero
 *
 * Law 1: One canonical engine per concern (no twins)
 * Law 9: Organize by concern, not pattern
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative, sep } from 'path';

const FEATURES_DIR = resolve(__dirname);
const BLUEPRINT_DIR = resolve(FEATURES_DIR, '..');

/** Feature module directories (auto-discovered, excludes test files) */
function discoverFeatureModules(): string[] {
  return readdirSync(FEATURES_DIR).filter((name) => {
    const full = join(FEATURES_DIR, name);
    return statSync(full).isDirectory();
  });
}

/** Recursively collect all .ts files under a directory */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

/** Extract import paths from a TypeScript file */
function extractImports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const imports: string[] = [];
  // Match: import ... from '../' or import ... from "../"
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    imports.push(m[1]);
  }
  // Also match dynamic imports: import('...')
  const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamicRe.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

/** Check if an import path references a feature module */
function parseFeatureImport(importPath: string): { featureName: string; isBarrel: boolean; isPage: boolean } | null {
  // Match @app/features/<name> pattern
  const aliasMatch = importPath.match(/^@app\/features\/([^/]+)(\/(.*))?$/);
  if (aliasMatch) {
    const featureName = aliasMatch[1];
    const subPath = aliasMatch[3] || '';
    return {
      featureName,
      isBarrel: subPath === '' || subPath === 'index' || subPath === 'index.ts',
      isPage: subPath.startsWith('pages/') || subPath.includes('/pages/'),
    };
  }

  // Match relative paths that navigate directly into features/ (not nested like core/services/features/)
  const relMatch = importPath.match(/(?:^|\/|\.\.?\/)features\/([^/]+)(\/(.*))?$/);
  if (relMatch && !importPath.includes('/core/') && !importPath.includes('/services/features/')) {
    const featureName = relMatch[1];
    const subPath = relMatch[3] || '';
    return {
      featureName,
      isBarrel: subPath === '' || subPath === 'index' || subPath === 'index.ts',
      isPage: subPath.startsWith('pages/') || subPath.includes('/pages/'),
    };
  }
  return null;
}

/** Determine which feature module a file belongs to */
function getOwningFeature(filePath: string): string | null {
  const rel = relative(FEATURES_DIR, filePath);
  if (rel.startsWith('..')) return null;
  return rel.split(sep)[0];
}

// ── Tests ──────────────────────────────────────────────────────────

const ALL_FEATURES = discoverFeatureModules();
const ALL_FEATURE_FILES = new Map<string, string[]>();
for (const mod of ALL_FEATURES) {
  ALL_FEATURE_FILES.set(mod, collectTsFiles(join(FEATURES_DIR, mod)));
}

describe('Module boundary enforcement', () => {
  describe('No cross-feature deep imports (barrel only)', () => {
    for (const [featureName, files] of ALL_FEATURE_FILES) {
      it(`${featureName} — only imports other features via barrel`, () => {
        const violations: string[] = [];
        for (const file of files) {
          const imports = extractImports(file);
          for (const imp of imports) {
            const parsed = parseFeatureImport(imp);
            if (!parsed) continue;
            if (parsed.featureName === featureName) continue; // self-import ok
            if (!parsed.isBarrel) {
              const relFile = relative(FEATURES_DIR, file);
              violations.push(
                `${relFile} imports deep into '${parsed.featureName}': ${imp}`,
              );
            }
          }
        }
        expect(
          violations,
          `Cross-feature deep imports found in ${featureName}:\n${violations.join('\n')}`,
        ).toHaveLength(0);
      });
    }
  });

  describe('No external imports from page-level files', () => {
    for (const [featureName, files] of ALL_FEATURE_FILES) {
      it(`${featureName} — does not import other features' page internals`, () => {
        const violations: string[] = [];
        for (const file of files) {
          const imports = extractImports(file);
          for (const imp of imports) {
            const parsed = parseFeatureImport(imp);
            if (!parsed) continue;
            if (parsed.featureName === featureName) continue;
            if (parsed.isPage) {
              const relFile = relative(FEATURES_DIR, file);
              violations.push(
                `${relFile} imports page-level code from '${parsed.featureName}': ${imp}`,
              );
            }
          }
        }
        expect(
          violations,
          `Page-level cross-feature imports in ${featureName}:\n${violations.join('\n')}`,
        ).toHaveLength(0);
      });
    }
  });
});

describe('GrcService migration ratchet', () => {
  it('GrcService import count is below threshold', () => {
    // Scan all blueprint .ts files for GrcService imports
    const allBlueprintFiles = collectTsFiles(BLUEPRINT_DIR);
    const grcImports: string[] = [];
    for (const file of allBlueprintFiles) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('GrcService') && !file.includes('grc.service.ts')) {
        const relFile = relative(BLUEPRINT_DIR, file);
        grcImports.push(relFile);
      }
    }

    // Ratchet: reduce over time toward zero
    // 2026-04-07: GrcService file deleted (B1e). 21 residual references remain
    // (test mocks, string literals, type-only mentions). Ratchet set to current + buffer.
    const RATCHET_THRESHOLD = 25;
    expect(
      grcImports.length,
      `GrcService is referenced in ${grcImports.length} files (threshold: ${RATCHET_THRESHOLD}).\n` +
        `Top references:\n${grcImports.slice(0, 10).join('\n')}`,
    ).toBeLessThanOrEqual(RATCHET_THRESHOLD);
  });
});

describe('Config→module boundary (backend mirror)', () => {
  const BACKEND_CONFIG_DIR = resolve(BLUEPRINT_DIR, '../../../../backend/src/config');

  it('config/ has zero imports from modules/', () => {
    if (!existsSync(BACKEND_CONFIG_DIR)) return; // skip if backend not adjacent
    const configFiles = collectTsFiles(BACKEND_CONFIG_DIR);
    const violations: string[] = [];
    for (const file of configFiles) {
      const imports = extractImports(file);
      for (const imp of imports) {
        if (imp.includes('modules/platform/services/misc/')) {
          violations.push(`${relative(BACKEND_CONFIG_DIR, file)}: ${imp}`);
        }
      }
    }
    expect(
      violations,
      `Config→module imports found:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });
});
