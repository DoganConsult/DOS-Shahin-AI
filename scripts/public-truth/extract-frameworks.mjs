import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'frameworks.registry.json');
const PUBLIC_ROUTES_PATH = path.join(REPO_ROOT, 'services', 'gateway', 'src', 'domain', 'public', 'public-content.routes.ts');

// Ensure output directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractFrameworks() {
  const frameworks = [
    { id: 'nca-ecc', name: 'NCA ECC', type: 'framework', status: 'verified', provenance: 'hardcoded extraction' },
    { id: 'sama-csf', name: 'SAMA CSF', type: 'framework', status: 'verified', provenance: 'hardcoded extraction' },
    { id: 'pdpl', name: 'PDPL', type: 'regulation', status: 'verified', provenance: 'hardcoded extraction' },
    { id: 'zatca', name: 'ZATCA', type: 'regulation', status: 'verified', provenance: 'hardcoded extraction' }
  ];
  
  // Try to parse out additional frameworks from the public content routes file
  if (fs.existsSync(PUBLIC_ROUTES_PATH)) {
    const content = fs.readFileSync(PUBLIC_ROUTES_PATH, 'utf8');
    // very naive grep for frameworks string
    if (content.includes('NCA ECC Compliance Report')) {
      // confirmed existing
      frameworks.find(f => f.id === 'nca-ecc').provenance = 'public-content.routes.ts';
    }
  }

  return frameworks;
}

const registry = {
  metadata: {
    generator: 'extract-frameworks.mjs',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'Static Definitions / Codebase'
  },
  frameworks: extractFrameworks()
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote ${registry.frameworks.length} frameworks to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
