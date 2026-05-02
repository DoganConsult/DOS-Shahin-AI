#!/usr/bin/env node
/**
 * CI script: Validates 100% key parity between en.json and ar.json translation files.
 * Exits with code 1 if any keys are missing in either file.
 *
 * Usage: node scripts/check-i18n-parity.js
 */

const fs = require('fs');
const path = require('path');

const EN_PATH = path.resolve(__dirname, '../src/assets/i18n/en.json');
const AR_PATH = path.resolve(__dirname, '../src/assets/i18n/ar.json');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main() {
  if (!fs.existsSync(EN_PATH)) {
    console.error(`ERROR: en.json not found at ${EN_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(AR_PATH)) {
    console.error(`ERROR: ar.json not found at ${AR_PATH}`);
    process.exit(1);
  }

  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
  const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf-8'));

  const enKeys = new Set(flattenKeys(en));
  const arKeys = new Set(flattenKeys(ar));

  const missingInAr = [...enKeys].filter(k => !arKeys.has(k));
  const missingInEn = [...arKeys].filter(k => !enKeys.has(k));

  let hasErrors = false;

  if (missingInAr.length > 0) {
    console.error(`\n❌ ${missingInAr.length} key(s) in en.json but MISSING in ar.json:`);
    missingInAr.forEach(k => console.error(`  - ${k}`));
    hasErrors = true;
  }

  if (missingInEn.length > 0) {
    console.error(`\n❌ ${missingInEn.length} key(s) in ar.json but MISSING in en.json:`);
    missingInEn.forEach(k => console.error(`  - ${k}`));
    hasErrors = true;
  }

  if (hasErrors) {
    console.error(`\n💥 i18n parity check FAILED.`);
    process.exit(1);
  }

  console.log(`✅ i18n parity check PASSED — ${enKeys.size} keys in both en.json and ar.json.`);
  process.exit(0);
}

main();
