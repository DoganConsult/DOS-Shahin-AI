import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, resolveRepoPath } from './lib/repo-root.mjs';

// -----------------------------------------------------------------------------
// Required files (canonical locations under DOS Platform/).
// These paths reflect the post-restructure tree; legacy paths (e.g.
// platform/registries/, products/shahin/manifest/) were removed in Phase 1.
// -----------------------------------------------------------------------------
const requiredFiles = [
  'registries/services.registry.json',
  'products/shahin-ai/product.manifest.json',
  'manifests/tenant.manifest.json',
  'manifests/user-identity.manifest.json',
  'migration/crosswalks/current-estate.seed.json'
];

function resolveTargetPath(relativePath) {
  return resolveRepoPath(relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(resolveTargetPath(relativePath), 'utf8'));
}

function listManifestEntries(relativeDir, manifestFileName) {
  const dirPath = resolveTargetPath(relativeDir);
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => {
      const relativePath = path.join(relativeDir, entry.name, manifestFileName);
      return {
        code: entry.name,
        sourceDir: relativeDir,
        relativePath,
        fullPath: resolveTargetPath(relativePath),
      };
    })
    .filter((entry) => fs.existsSync(entry.fullPath));
}

// -----------------------------------------------------------------------------
// Platform services live one level deeper: platform/<platformModule>/services/<svc>/
// (e.g. platform/dauth/services/auth-service/, platform/dos/services/dos-service/).
// This helper enumerates every <svc>/service.manifest.json under any
// platform/<x>/services/ directory so the validator can co-locate platform-owned
// services with their owning platform module instead of forcing them under the
// flat top-level services/ tree.
// -----------------------------------------------------------------------------
function listPlatformServiceEntries(manifestFileName) {
  const platformRoot = resolveTargetPath('platform');
  if (!fs.existsSync(platformRoot)) return [];

  const results = [];
  for (const platformModule of fs.readdirSync(platformRoot, { withFileTypes: true })) {
    if (!platformModule.isDirectory() && !platformModule.isSymbolicLink()) continue;

    const servicesDir = path.join(platformRoot, platformModule.name, 'services');
    if (!fs.existsSync(servicesDir)) continue;

    for (const svc of fs.readdirSync(servicesDir, { withFileTypes: true })) {
      if (!svc.isDirectory() && !svc.isSymbolicLink()) continue;

      const relativePath = path.join('platform', platformModule.name, 'services', svc.name, manifestFileName);
      const fullPath = resolveTargetPath(relativePath);
      if (!fs.existsSync(fullPath)) continue;

      results.push({
        code: svc.name,
        sourceDir: path.join('platform', platformModule.name, 'services'),
        relativePath,
        fullPath,
      });
    }
  }
  return results;
}

const missing = requiredFiles.filter((relativePath) => !fs.existsSync(resolveTargetPath(relativePath)));
if (missing.length > 0) {
  console.error('Missing required manifest files:', missing);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Discovery
// - Module manifests: discovered under both modules/ AND platform/ (3-layer
//   architecture: business modules live in modules/, platform modules live in
//   platform/<x>/). Co-location is enforced below via the `kind` discriminator.
// - Service manifests: discovered under services/.
// - Product manifests: discovered under products/.
// -----------------------------------------------------------------------------
const moduleEntries = [
  ...listManifestEntries('modules', 'module.manifest.json'),
  ...listManifestEntries('platform', 'module.manifest.json'),
];
const serviceEntries = [
  ...listManifestEntries('services', 'service.manifest.json'),
  ...listPlatformServiceEntries('service.manifest.json'),
];
const productEntries = listManifestEntries('products', 'product.manifest.json');

const jsonFiles = [
  ...requiredFiles,
  ...moduleEntries.map((entry) => entry.relativePath),
  ...serviceEntries.map((entry) => entry.relativePath),
  ...productEntries.map((entry) => entry.relativePath)
];

for (const relativePath of jsonFiles) {
  readJson(relativePath);
}

const servicesRegistry = readJson('registries/services.registry.json');
const registryServiceCodes = new Set(servicesRegistry.map((entry) => entry.serviceCode));
const serviceManifests = serviceEntries.map((entry) => ({
  ...entry,
  manifest: readJson(entry.relativePath),
}));
const serviceManifestCodes = new Set(serviceManifests.map((entry) => entry.manifest.serviceCode));
const validationErrors = [];
const validationWarnings = [];

// -----------------------------------------------------------------------------
// Transitional allow-list: services declared in registries/services.registry.json
// that have NOT yet been physically promoted into either:
//   - services/<service>/service.manifest.json                     (legacy/shared)
//   - platform/<platformModule>/services/<service>/service.manifest.json
//   - modules/<businessModule>/services/<service>/service.manifest.json
//
// Each entry is annotated with the phase that will remove it. When the entry is
// removed from this set, the cross-check becomes a hard error again
// automatically.
//
// DO NOT add entries here without a phase annotation. DO NOT add entries here
// to silence validator output — the only valid use is to track services awaiting
// physical promotion in their assigned phase.
//
// Phase 3 (2026-04-29): auth-service, dos-service, dsoc-service, dnoc-service
//   were physically promoted to platform/<x>/services/ AND added to the
//   registry; they are no longer pending. AI-OS services remain deferred
//   because the AI-OS module itself is deferred (see platform/ai/README.md).
// -----------------------------------------------------------------------------
const PENDING_SERVICE_PROMOTIONS = new Map([
  // AI-OS (ai-gateway-service / ai-engine-service / ai-governance-service) was promoted on
  // 2026-04-30 to platform/ai/services/. They are now hard-required by the cross-check below.
  ['workflow-service',            'Phase 5 — promote from Workflow Module/'],
  ['onboarding-service',          'Phase 5 — promote from Onboarding Module/'],
  ['compliance-controls-service', 'Phase 5 — promote from modules/compliance/'],
  ['bcp-service',                 'Phase 5 — promote from BCP Module/'],
  ['qiyas-journey-service',       'Phase 5 — promote from Qiyas Module/'],
  ['vendor-service',              'Phase 5 — promote from Vendor Module/'],
]);

for (const entry of serviceManifests) {
  if (entry.manifest.serviceCode !== entry.code) {
    validationErrors.push(`${entry.relativePath}: serviceCode "${entry.manifest.serviceCode}" must match directory name "${entry.code}".`);
  }

  if (!registryServiceCodes.has(entry.manifest.serviceCode)) {
    validationErrors.push(`${entry.relativePath}: serviceCode "${entry.manifest.serviceCode}" is missing from registries/services.registry.json.`);
  }
}

for (const serviceCode of registryServiceCodes) {
  if (!serviceManifestCodes.has(serviceCode)) {
    if (PENDING_SERVICE_PROMOTIONS.has(serviceCode)) {
      validationWarnings.push(`registries/services.registry.json: serviceCode "${serviceCode}" awaiting promotion (${PENDING_SERVICE_PROMOTIONS.get(serviceCode)}).`);
    } else {
      validationErrors.push(`registries/services.registry.json: serviceCode "${serviceCode}" has no matching service.manifest.json under services/<service>/, platform/<x>/services/<service>/, or modules/<x>/services/<service>/.`);
    }
  }
}

// -----------------------------------------------------------------------------
// Module-manifest binding policy
// - Every module declares lifecycle.stage (single-artifact policy: activation
//   is data-driven via manifest + entitlement + feature flag, never via code
//   branches).
// - Every module declares kind ∈ {platform, business}.
// - Co-location is enforced:
//     kind: "business" MUST live under modules/  (hard error if under platform/).
//     kind: "platform" SHOULD live under platform/ — currently a transitional
//       WARNING when found under modules/ until Phase 3 physically moves them,
//       at which point this becomes a hard error.
// -----------------------------------------------------------------------------
const ALLOWED_LIFECYCLE_STAGES = new Set(['experimental', 'alpha', 'beta', 'ga', 'deprecated']);
const ALLOWED_MIN_TENANT_STAGES = new Set(['experimental', 'alpha', 'beta', 'ga']);
const ALLOWED_MODULE_KINDS = new Set(['platform', 'business']);

for (const entry of moduleEntries) {
  const manifest = readJson(entry.relativePath);

  if (manifest.futureService && !serviceManifestCodes.has(manifest.futureService)) {
    validationErrors.push(`${entry.relativePath}: futureService "${manifest.futureService}" does not match any declared service manifest.`);
  }

  // kind is required and enumerated.
  if (typeof manifest.kind !== 'string') {
    validationErrors.push(`${entry.relativePath}: missing required string "kind" (must be one of [${[...ALLOWED_MODULE_KINDS].join(', ')}]).`);
  } else if (!ALLOWED_MODULE_KINDS.has(manifest.kind)) {
    validationErrors.push(`${entry.relativePath}: kind "${manifest.kind}" is not one of [${[...ALLOWED_MODULE_KINDS].join(', ')}].`);
  } else {
    // Co-location enforcement
    if (manifest.kind === 'business' && entry.sourceDir === 'platform') {
      validationErrors.push(`${entry.relativePath}: kind "business" must live under modules/<x>/ — currently under platform/.`);
    }
    if (manifest.kind === 'platform' && entry.sourceDir === 'modules') {
      validationWarnings.push(`${entry.relativePath}: kind "platform" should live under platform/<x>/ (transitional — to be relocated in Phase 3).`);
    }
  }

  // lifecycle.stage is required and enumerated.
  const lifecycle = manifest.lifecycle;
  if (!lifecycle || typeof lifecycle !== 'object') {
    validationErrors.push(`${entry.relativePath}: missing required object "lifecycle" (single-artifact policy: every module must declare a lifecycle stage).`);
    continue;
  }
  if (typeof lifecycle.stage !== 'string') {
    validationErrors.push(`${entry.relativePath}: missing required string "lifecycle.stage".`);
  } else if (!ALLOWED_LIFECYCLE_STAGES.has(lifecycle.stage)) {
    validationErrors.push(`${entry.relativePath}: lifecycle.stage "${lifecycle.stage}" is not one of [${[...ALLOWED_LIFECYCLE_STAGES].join(', ')}].`);
  }
  if (lifecycle.minTenantStage !== undefined && !ALLOWED_MIN_TENANT_STAGES.has(lifecycle.minTenantStage)) {
    validationErrors.push(`${entry.relativePath}: lifecycle.minTenantStage "${lifecycle.minTenantStage}" is not one of [${[...ALLOWED_MIN_TENANT_STAGES].join(', ')}].`);
  }
  for (const optionalStringField of ['owner', 'entitlementKey', 'featureFlag', 'enteredStageAt']) {
    if (lifecycle[optionalStringField] !== undefined && typeof lifecycle[optionalStringField] !== 'string') {
      validationErrors.push(`${entry.relativePath}: lifecycle.${optionalStringField} must be a string when present.`);
    }
  }

  // Guard against legacy duplication: rolloutStage was the old field, now replaced by lifecycle.stage.
  if (manifest.metadata && Object.prototype.hasOwnProperty.call(manifest.metadata, 'rolloutStage')) {
    validationErrors.push(`${entry.relativePath}: metadata.rolloutStage is deprecated — move it to lifecycle.stage at the manifest root.`);
  }
}

// -----------------------------------------------------------------------------
// Product-manifest binding policy
// - kind MUST be "product".
// - lifecycle.stage MUST be set (same vocabulary as modules).
// - productCode MUST match the directory name.
// -----------------------------------------------------------------------------
for (const entry of productEntries) {
  const manifest = readJson(entry.relativePath);

  if (manifest.productCode !== entry.code) {
    validationErrors.push(`${entry.relativePath}: productCode "${manifest.productCode}" must match directory name "${entry.code}".`);
  }

  if (typeof manifest.kind !== 'string') {
    validationErrors.push(`${entry.relativePath}: missing required string "kind" (must be "product").`);
  } else if (manifest.kind !== 'product') {
    validationErrors.push(`${entry.relativePath}: kind "${manifest.kind}" must be "product".`);
  }

  const lifecycle = manifest.lifecycle;
  if (!lifecycle || typeof lifecycle !== 'object') {
    validationErrors.push(`${entry.relativePath}: missing required object "lifecycle" (every product must declare a lifecycle stage).`);
  } else {
    if (typeof lifecycle.stage !== 'string') {
      validationErrors.push(`${entry.relativePath}: missing required string "lifecycle.stage".`);
    } else if (!ALLOWED_LIFECYCLE_STAGES.has(lifecycle.stage)) {
      validationErrors.push(`${entry.relativePath}: lifecycle.stage "${lifecycle.stage}" is not one of [${[...ALLOWED_LIFECYCLE_STAGES].join(', ')}].`);
    }
    for (const optionalStringField of ['owner', 'entitlementKey', 'featureFlag', 'enteredStageAt']) {
      if (lifecycle[optionalStringField] !== undefined && typeof lifecycle[optionalStringField] !== 'string') {
        validationErrors.push(`${entry.relativePath}: lifecycle.${optionalStringField} must be a string when present.`);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Reporting
// -----------------------------------------------------------------------------
if (validationWarnings.length > 0) {
  console.warn(`Manifest validation warnings under ${REPO_ROOT}:`);
  for (const warning of validationWarnings) {
    console.warn(`- ${warning}`);
  }
}

if (validationErrors.length > 0) {
  console.error(`Manifest validation failed under ${REPO_ROOT}:`);
  for (const error of validationErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${jsonFiles.length} manifest files under ${REPO_ROOT}.`);
console.log(`  modules:  ${moduleEntries.length} (modules/ + platform/)`);
console.log(`  services: ${serviceEntries.length}`);
console.log(`  products: ${productEntries.length}`);
if (validationWarnings.length > 0) {
  console.log(`  warnings: ${validationWarnings.length} (non-blocking, transitional)`);
}
