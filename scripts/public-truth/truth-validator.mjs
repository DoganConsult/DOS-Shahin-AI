import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'public-truth');

function validate() {
  console.log('--- Starting Public Truth Validation ---');
  let errors = 0;

  // 1. Check if files exist
  const requiredFiles = [
    'services.registry.json', 
    'modules.registry.json', 
    'agents.registry.json', 
    'frameworks.registry.json',
    'workflows.registry.json',
    'landing-sources.registry.json',
    'platform.registry.json'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(GENERATED_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`[ERROR] Missing required registry file: ${file}`);
      errors++;
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Ignore platform registry from item loops as it is an aggregator
    if (file === 'platform.registry.json') {
      if (!data.status || data.status !== 'verified') {
        console.error(`[ERROR] Missing or invalid status in platform.registry.json`);
        errors++;
      }
      console.log(`[OK] Validated platform.registry.json`);
      continue;
    }

    // Determine the key array name (e.g. 'modules' for modules.registry.json)
    let keyName = file.split('.')[0];
    if (keyName === 'landing-sources') keyName = 'landingSources';

    const items = data[keyName] || [];

    const seenIds = new Set();

    for (const item of items) {
      // Rule: No public catalog item without provenance
      if (!item.provenance || item.provenance.trim() === '') {
        console.error(`[ERROR] Missing provenance for ${keyName} item: ${item.id || item.name}`);
        errors++;
      }

      // Rule: No duplicate codes
      if (item.id) {
        if (seenIds.has(item.id)) {
          console.error(`[ERROR] Duplicate ID found in ${keyName}: ${item.id}`);
          errors++;
        }
        seenIds.add(item.id);
      }
    }
    
    console.log(`[OK] Validated ${items.length} items in ${file}`);
  }

  if (errors > 0) {
    console.error(`\nValidation FAILED with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log('\nValidation PASSED successfully.');
  }
}

validate();
