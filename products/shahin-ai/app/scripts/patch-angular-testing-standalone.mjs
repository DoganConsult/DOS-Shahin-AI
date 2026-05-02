/**
 * Patches @angular/core for Vitest + JIT when standalone components use external
 * styleUrls/templateUrl before resolveComponentResources().
 *
 * 1) testing.mjs — TestBed compiler paths (queueTypesFromModulesArray, applyProviderOverridesInScope).
 * 2) _effect-chunk2.mjs — walkProviderTree() calls getComponentDef(container) during provider
 *    collection; that throws the same "not resolved" error at runtime.
 *
 * Idempotent per file/segment. Re-run after `pnpm install` / Angular upgrades.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
/** Real install path (pnpm hoists to repo root; frontend/node_modules may be absent). */
function resolveAngularCoreFesmDir() {
  const pkgJson = path.join(root, 'package.json');
  if (fs.existsSync(pkgJson)) {
    try {
      const require = createRequire(pkgJson);
      const coreRoot = path.dirname(require.resolve('@angular/core/package.json'));
      return path.join(coreRoot, 'fesm2022');
    } catch {
      /* fall through */
    }
  }
  return path.join(root, 'node_modules', '@angular', 'core', 'fesm2022');
}
const angularFesm = resolveAngularCoreFesmDir();
const testingPath = path.join(angularFesm, 'testing.mjs');
const effectChunkPath = path.join(angularFesm, '_effect-chunk2.mjs');

const PATCH_MARKER = 'DOS_PATCH_STANDALONE_WORKFLOW_TESTBED';
const PATCH_MARKER_PROVIDER_WALK = 'DOS_PATCH_PROVIDER_WALK_GET_COMPONENT_DEF';
const PATCH_MARKER_VERIFY_IMPORT = 'DOS_PATCH_VERIFY_STANDALONE_IMPORT_UNRESOLVED';
const PATCH_MARKER_IS_COMPONENT_SAFE = 'DOS_PATCH_IS_COMPONENT_SAFE';

const debugNodeChunkPath = path.join(angularFesm, '_debug_node-chunk.mjs');

function patchWalkProviderTree() {
  if (!fs.existsSync(effectChunkPath)) {
    console.warn('[patch-angular-testing] skipping effect chunk: file not found:', effectChunkPath);
    return false;
  }
  let src = fs.readFileSync(effectChunkPath, 'utf8');
  if (src.includes(PATCH_MARKER_PROVIDER_WALK)) {
    console.log('[patch-angular-testing] walkProviderTree already patched');
    return false;
  }
  const anchor = 'function walkProviderTree(container, visitor, parents, dedup) {';
  const helper = `// ${PATCH_MARKER_PROVIDER_WALK}
function tryGetComponentDefForProviderWalk(type) {
  try {
    return getComponentDef(type);
  } catch {
    return null;
  }
}

`;
  const oldLine = '  const cmpDef = !injDef && getComponentDef(container);';
  const newLine = '  const cmpDef = !injDef && tryGetComponentDefForProviderWalk(container);';
  if (!src.includes(anchor) || !src.includes(oldLine)) {
    console.warn('[patch-angular-testing] walkProviderTree patch skipped (upstream changed)');
    return false;
  }
  src = src.replace(anchor, `${helper}${anchor}`);
  src = src.replace(oldLine, newLine);
  fs.writeFileSync(effectChunkPath, src, 'utf8');
  console.log('[patch-angular-testing] walkProviderTree + tryGetComponentDefForProviderWalk');
  return true;
}

function patchVerifyStandaloneImport() {
  if (!fs.existsSync(debugNodeChunkPath)) {
    console.warn('[patch-angular-testing] skipping debug chunk: file not found:', debugNodeChunkPath);
    return false;
  }
  let src = fs.readFileSync(debugNodeChunkPath, 'utf8');
  if (src.includes(PATCH_MARKER_VERIFY_IMPORT)) {
    console.log('[patch-angular-testing] verifyStandaloneImport already patched');
    return false;
  }
  const anchor = 'function verifyStandaloneImport(depType, importingType) {';
  const oldBlock = `  if (getNgModuleDef(depType) == null) {
    const def = getComponentDef(depType) || getDirectiveDef(depType) || getPipeDef$1(depType);
    if (def != null) {`;
  const newBlock = `  if (getNgModuleDef(depType) == null) {
    // ${PATCH_MARKER_VERIFY_IMPORT}: getComponentDef throws when template/styles are not resolved yet (Vitest JIT).
    let def;
    try {
      def = getComponentDef(depType) || getDirectiveDef(depType) || getPipeDef$1(depType);
    } catch {
      return;
    }
    if (def != null) {`;
  if (!src.includes(anchor) || !src.includes(oldBlock)) {
    console.warn('[patch-angular-testing] verifyStandaloneImport patch skipped (upstream changed)');
    return false;
  }
  src = src.replace(oldBlock, newBlock);
  fs.writeFileSync(debugNodeChunkPath, src, 'utf8');
  console.log('[patch-angular-testing] verifyStandaloneImport unresolved-component guard');
  return true;
}

function patchIsComponentSafe() {
  if (!fs.existsSync(debugNodeChunkPath)) {
    return false;
  }
  let src = fs.readFileSync(debugNodeChunkPath, 'utf8');
  if (src.includes(PATCH_MARKER_IS_COMPONENT_SAFE)) {
    console.log('[patch-angular-testing] isComponent already patched');
    return false;
  }
  const oldFn = `function isComponent(value) {
  return !!getComponentDef(value);
}`;
  const newFn = `function isComponent(value) {
  // ${PATCH_MARKER_IS_COMPONENT_SAFE}: DepsTracker calls isComponent after verifyStandaloneImport; unresolved external resources throw in getComponentDef (Vitest JIT).
  if (isComponentDefPendingResolution(value)) {
    return true;
  }
  try {
    return !!getComponentDef(value);
  } catch {
    return true;
  }
}`;
  if (!src.includes(oldFn)) {
    console.warn('[patch-angular-testing] isComponent patch skipped (upstream changed)');
    return false;
  }
  src = src.replace(oldFn, newFn);
  fs.writeFileSync(debugNodeChunkPath, src, 'utf8');
  console.log('[patch-angular-testing] isComponent try/catch for JIT unresolved');
  return true;
}

function main() {
  if (!fs.existsSync(testingPath)) {
    console.warn('[patch-angular-testing] skipping: file not found:', testingPath);
    process.exit(0);
  }
  let src = fs.readFileSync(testingPath, 'utf8');
  let changed = false;

  const anchor = '  queueTypesFromModulesArray(arr) {';
  const methods = `  // ${PATCH_MARKER}
  tryGetCompiledComponentDef(type) {
    try {
      return getComponentDef(type);
    } catch {
      return null;
    }
  }
  maybeStandaloneFromMetadata(type) {
    const def = this.tryGetCompiledComponentDef(type);
    if (def?.standalone) {
      return true;
    }
    const meta = this.resolvers.component.resolve(type);
    return !!(meta && (meta.standalone == null || meta.standalone));
  }
`;

  const oldQueueBlock = `        } else if (isStandaloneComponent(value)) {
          this.queueType(value, null);
          const def = getComponentDef(value);
          if (processedDefs.has(def)) {
            continue;
          }
          processedDefs.add(def);
          const dependencies = maybeUnwrapFn(def.dependencies ?? []);
          dependencies.forEach(dependency => {
            if (isStandaloneComponent(dependency) || hasNgModuleDef(dependency)) {
              queueTypesFromModulesArrayRecur([dependency]);
            } else {
              this.queueType(dependency, null);
            }
          });
        }`;

  const newQueueBlock = `        } else if (this.maybeStandaloneFromMetadata(value)) {
          this.queueType(value, null);
          const def = this.tryGetCompiledComponentDef(value);
          if (!def || processedDefs.has(def)) {
            continue;
          }
          processedDefs.add(def);
          const dependencies = maybeUnwrapFn(def.dependencies ?? []);
          dependencies.forEach(dependency => {
            if (this.maybeStandaloneFromMetadata(dependency) || hasNgModuleDef(dependency)) {
              queueTypesFromModulesArrayRecur([dependency]);
            } else {
              this.queueType(dependency, null);
            }
          });
        }`;

  if (!src.includes(PATCH_MARKER) && src.includes(oldQueueBlock) && src.includes(anchor)) {
    src = src.replace(anchor, `${methods}${anchor}`);
    src = src.replace(oldQueueBlock, newQueueBlock);
    changed = true;
    console.log('[patch-angular-testing] queueTypesFromModulesArray + helpers');
  }

  const oldProviderBlock = `  applyProviderOverridesInScope(type) {
    const hasScope = isStandaloneComponent(type) || isNgModule(type);
    if (!hasScope || this.scopesWithOverriddenProviders.has(type)) {
      return;
    }
    this.scopesWithOverriddenProviders.add(type);
    const injectorDef = type[NG_INJ_DEF];
    if (this.providerOverridesByToken.size === 0) return;
    if (isStandaloneComponent(type)) {
      const def = getComponentDef(type);
      const dependencies = maybeUnwrapFn(def.dependencies ?? []);
      for (const dependency of dependencies) {
        this.applyProviderOverridesInScope(dependency);
      }
    } else {`;

  const newProviderBlock = `  applyProviderOverridesInScope(type) {
    const hasScope = this.maybeStandaloneFromMetadata(type) || isNgModule(type);
    if (!hasScope || this.scopesWithOverriddenProviders.has(type)) {
      return;
    }
    this.scopesWithOverriddenProviders.add(type);
    const injectorDef = type[NG_INJ_DEF];
    if (this.providerOverridesByToken.size === 0) return;
    if (this.maybeStandaloneFromMetadata(type)) {
      const def = this.tryGetCompiledComponentDef(type);
      if (!def) {
        return;
      }
      const dependencies = maybeUnwrapFn(def.dependencies ?? []);
      for (const dependency of dependencies) {
        this.applyProviderOverridesInScope(dependency);
      }
    } else {`;

  if (src.includes(oldProviderBlock)) {
    if (!src.includes(PATCH_MARKER)) {
      console.error('[patch-angular-testing] provider patch needs helpers; queue patch failed or Angular changed');
      process.exit(1);
    }
    src = src.replace(oldProviderBlock, newProviderBlock);
    changed = true;
    console.log('[patch-angular-testing] applyProviderOverridesInScope');
  }

  if (changed) {
    fs.writeFileSync(testingPath, src, 'utf8');
    console.log('[patch-angular-testing] wrote', testingPath);
  } else {
    console.log('[patch-angular-testing] nothing to do (already patched or upstream changed)');
  }

  patchWalkProviderTree();
  patchVerifyStandaloneImport();
  patchIsComponentSafe();
}

main();
