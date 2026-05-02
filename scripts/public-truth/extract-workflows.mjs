import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'workflows.registry.json');
const SRC_DIR = path.join(REPO_ROOT, 'packages', 'shahin-product', 'src');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractWorkflows() {
  const workflows = [];
  
  // Look at cross-hub and workflows directories to infer workflows
  const targetDirs = [
    path.join(SRC_DIR, 'workflows'),
    path.join(SRC_DIR, 'cross-hub', 'core-modules'),
    path.join(SRC_DIR, 'cross-hub', 'extended-modules'),
    path.join(SRC_DIR, 'cross-hub', 'operational')
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'helpers.ts');
      for (const file of files) {
        const rawName = file.replace(/\.ts$/, '');
        workflows.push({
          id: rawName,
          name: rawName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type: dir.includes('cross-hub') ? 'hub' : 'workflow',
          status: 'inferred',
          provenance: path.relative(REPO_ROOT, path.join(dir, file))
        });
      }
    }
  }

  // Deduplicate
  const uniqueWorkflows = [];
  const seen = new Set();
  for (const wf of workflows) {
    if (!seen.has(wf.id)) {
      seen.add(wf.id);
      uniqueWorkflows.push(wf);
    }
  }
  
  return uniqueWorkflows;
}

const registry = {
  metadata: {
    generator: 'extract-workflows.mjs',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'packages/shahin-product/src/'
  },
  workflows: extractWorkflows()
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote ${registry.workflows.length} workflows to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
