import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'modules.registry.json');
const CSV_PATH = path.join(REPO_ROOT, 'DOS-AIO-Specs', 'DOS-AIO-actualcodebase.csv');

// Ensure output directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function extractModules() {
  const modules = [];
  
  if (fs.existsSync(CSV_PATH)) {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n');
    if (lines.length > 1) {
      // Very basic CSV parsing for exactly what we need
      const header = lines[0].split(',');
      const moduleCodeIdx = header.findIndex(h => h.includes('Module_Code') || h === 'ModuleCode' || h.toLowerCase().includes('module code'));
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        const rawCode = parts[0]; // Assuming module code is first column based on prior knowledge
        
        if (rawCode && typeof rawCode === 'string' && rawCode !== 'Module') {
          const modName = rawCode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          modules.push({
            id: rawCode,
            name: modName,
            category: 'general',
            status: 'verified',
            provenance: 'DOS-AIO-actualcodebase.csv'
          });
        }
      }
    }
  } else {
    // Fallback: Read backend/src/modules/
    const MODULES_DIR = process.env.DOS_AIO_SOURCE_ROOT 
      ? path.join(process.env.DOS_AIO_SOURCE_ROOT, 'backend', 'src', 'modules')
      : '/home/Dr-Dogan-AGRC-OS/backend/src/modules';
    
    if (fs.existsSync(MODULES_DIR)) {
      const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          modules.push({
            id: entry.name,
            name: entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            category: 'general',
            status: 'inferred',
            provenance: `backend/src/modules/${entry.name}`
          });
        }
      }
    } else {
      console.error(`Could not find modules to extract either from CSV or Source Root`);
    }
  }
  
  // Clean up duplicates if any
  const uniqueModules = [];
  const seen = new Set();
  for (const m of modules) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      uniqueModules.push(m);
    }
  }
  
  return uniqueModules;
}

const registry = {
  metadata: {
    generator: 'extract-modules.mjs',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'DOS-AIO-actualcodebase.csv'
  },
  modules: extractModules()
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));
console.log(`[Public Truth] Wrote ${registry.modules.length} modules to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
