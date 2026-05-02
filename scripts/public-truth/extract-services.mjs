import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Define paths
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const SERVICES_DIR = path.join(REPO_ROOT, 'services');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'services.registry.json');

// Ensure output directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractServices() {
  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`Services directory not found at ${SERVICES_DIR}`);
    return [];
  }

  const services = [];
  const entries = fs.readdirSync(SERVICES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const servicePath = path.join(SERVICES_DIR, entry.name);
      const pkgPath = path.join(servicePath, 'package.json');
      
      let version = '1.0.0';
      let description = '';
      
      if (fs.existsSync(pkgPath)) {
        try {
          const pkgObj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          version = pkgObj.version || version;
          description = pkgObj.description || description;
        } catch (e) {
          // ignore parsing errors
        }
      }

      services.push({
        id: entry.name,
        name: entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        version,
        description,
        provenance: `services/${entry.name}`,
        status: 'verified'
      });
    }
  }
  
  return services;
}

const registry = {
  metadata: {
    generator: 'extract-services.mjs',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'services/'
  },
  services: extractServices()
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote ${registry.services.length} services to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
