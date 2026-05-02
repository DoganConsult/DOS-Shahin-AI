import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const BLUEPRINT_DIR = resolve(__dirname, '..');

const GRC_INJECT_THRESHOLD = 0;
const GRC_FILE_THRESHOLD = 0;

function walkTs(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        files.push(...walkTs(full));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

describe('GrcService Migration Ratchet', () => {
  const allFiles = walkTs(BLUEPRINT_DIR);

  const grcServiceFile = 'core/products/agrc/services/grc.service.ts';
  const filesWithGrcImport: string[] = [];
  let injectCount = 0;

  for (const file of allFiles) {
    if (file.endsWith('grc.service.ts') && file.includes('agrc')) continue;
    const content = readFileSync(file, 'utf-8');
    if (content.includes('GrcService')) {
      filesWithGrcImport.push(file);
      const matches = content.match(/inject\(GrcService\)/g);
      if (matches) injectCount += matches.length;
    }
  }

  it(`inject(GrcService) count should be at or below ratchet threshold (${GRC_INJECT_THRESHOLD})`, () => {
    console.log(`[Ratchet] inject(GrcService) count: ${injectCount} (threshold: ${GRC_INJECT_THRESHOLD})`);
    expect(injectCount).toBeLessThanOrEqual(GRC_INJECT_THRESHOLD);
  });

  it(`files referencing GrcService should be at or below ratchet threshold (${GRC_FILE_THRESHOLD})`, () => {
    console.log(`[Ratchet] Files referencing GrcService: ${filesWithGrcImport.length} (threshold: ${GRC_FILE_THRESHOLD})`);
    expect(filesWithGrcImport.length).toBeLessThanOrEqual(GRC_FILE_THRESHOLD);
  });

  it('GrcService god-object file should be deleted (B1e complete)', () => {
    const grcPath = resolve(BLUEPRINT_DIR, grcServiceFile);
    expect(existsSync(grcPath), `${grcServiceFile} should be deleted`).toBe(false);
  });
});
