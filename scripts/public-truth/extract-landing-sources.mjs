import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'landing-sources.registry.json');
// Phase 4A (2026-04-29): canonical landing sections live under the Shahin-AI
// marketing website, which uses a flat src/app/pages layout (no `blueprint/`
// subdir). Historical path was `frontend/products/shahin/src/app/blueprint/...`
// and earlier `Shahin-AI Website/spa/src/app/blueprint/...`.
const LANDING_SECTIONS_DIR = path.join(REPO_ROOT, 'products', 'shahin-ai', 'website', 'src', 'app', 'pages', 'landing', 'sections');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractLandingSources() {
  const sources = [];
  
  // Recursively find all components in the existing marketing frontend
  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.component.ts')) {
        const rawName = entry.name.replace(/\.component\.ts$/, '');
        sources.push({
          id: rawName,
          name: rawName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type: 'component',
          status: 'verified',
          provenance: path.relative(REPO_ROOT, fullPath)
        });
      }
    }
  }

  walkDir(LANDING_SECTIONS_DIR);

  return sources;
}

const registry = {
  metadata: {
    generator: 'extract-landing-sources.mjs',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'products/shahin-ai/website/src/app/pages/landing/sections'
  },
  landingSources: extractLandingSources()
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote ${registry.landingSources.length} landing sources to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
