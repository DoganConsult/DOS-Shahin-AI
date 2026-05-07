#!/usr/bin/env node
/**
 * Automated migration script to add health check router to all services
 * 
 * This script:
 * 1. Finds all server.ts files in services/
 * 2. Checks if they already use createHealthRouter
 * 3. Adds the import and health check wiring if missing
 * 4. Preserves existing health endpoints by replacing them
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SERVICES_DIR = path.join(ROOT, 'services');

// ═══════════════════════════════════════════════════════════════════
// FIND ALL SERVER.TS FILES
// ═══════════════════════════════════════════════════════════════════

function findServerTsFiles() {
  const files = [];
  try {
    const result = execSync('find services -name "server.ts" -type f', { cwd: ROOT, encoding: 'utf8' });
    files.push(...result.trim().split('\n').filter(Boolean));
  } catch (e) {
    console.error('Failed to find server.ts files:', (e as Error).message);
  }
  return files;
}

// ═══════════════════════════════════════════════════════════════════
// CHECK IF FILE ALREADY HAS HEALTH CHECK ROUTER
// ═══════════════════════════════════════════════════════════════════

function hasHealthCheckRouter(content) {
  return content.includes('createHealthRouter') || 
         content.includes('redisHealthCheck') ||
         content.includes('eventBusHealthCheck');
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACT SERVICE CODE FROM FILE PATH
// ═══════════════════════════════════════════════════════════════════

function extractServiceCode(filePath) {
  const parts = path.basename(path.dirname(filePath));
  return parts.replace(/-service$/, '').replace(/-/g, '_');
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE HEALTH CHECK CODE
// ═══════════════════════════════════════════════════════════════════

function generateHealthCheckCode(serviceCode) {
  return `import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('${serviceCode}', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));`;
}

// ═══════════════════════════════════════════════════════════════════
// REPLACE SIMPLE HEALTH ENDPOINTS WITH HEALTH CHECK ROUTER
// ═══════════════════════════════════════════════════════════════════

function addHealthCheckRouter(content, serviceCode) {
  const healthCheckCode = generateHealthCheckCode(serviceCode);
  
  // Check if imports section exists (look for 'import' or 'require')
  const hasImports = content.includes('import ') || content.includes('require(');
  
  if (!hasImports) {
    // No imports section, add at the beginning
    return healthCheckCode + '\n\n' + content;
  }
  
  // Find the last import statement
  const importLines = [];
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('require(')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex === -1) {
    // No clear import section, add at beginning
    return healthCheckCode + '\n\n' + content;
  }
  
  // Insert after last import
  lines.splice(lastImportIndex + 1, 0, '', healthCheckCode);
  
  // Remove old simple health endpoints
  const newContent = lines
    .map(line => {
      // Remove simple health endpoint definitions
      if (line.includes("app.get('/health'") && line.includes('res.json')) {
        return '// Health check handled by createHealthRouter';
      }
      if (line.includes("app.get('/ready'") && line.includes('res.json')) {
        return '// Ready check handled by createHealthRouter';
      }
      if (line.includes("app.get('/api/health'") && line.includes('res.json')) {
        return '// API health check handled by createHealthRouter';
      }
      return line;
    })
    .join('\n');
  
  return newContent;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN MIGRATION LOGIC
// ═══════════════════════════════════════════════════════════════════

function migrateServerFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  if (hasHealthCheckRouter(content)) {
    console.log(`  → SKIP: ${filePath} (already has health check router)`);
    return { skipped: true, path: filePath };
  }
  
  const serviceCode = extractServiceCode(filePath);
  const newContent = addHealthCheckRouter(content, serviceCode);
  
  fs.writeFileSync(fullPath, newContent, 'utf8');
  console.log(`  → UPDATED: ${filePath}`);
  return { updated: true, path: filePath, serviceCode };
}

// ═══════════════════════════════════════════════════════════════════
// DRY RUN MODE
// ═══════════════════════════════════════════════════════════════════

const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  console.log('═══ Health Check Migration Script ═══');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}\n`);
  
  const serverFiles = findServerTsFiles();
  console.log(`Found ${serverFiles.length} server.ts files\n`);
  
  const results = {
    updated: [],
    skipped: [],
    errors: [],
  };
  
  for (const filePath of serverFiles) {
    try {
      if (DRY_RUN) {
        const fullPath = path.join(ROOT, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        if (hasHealthCheckRouter(content)) {
          console.log(`  → SKIP: ${filePath} (already has health check router)`);
          results.skipped.push(filePath);
        } else {
          const serviceCode = extractServiceCode(filePath);
          console.log(`  → WOULD UPDATE: ${filePath} (service: ${serviceCode})`);
          results.updated.push({ path: filePath, serviceCode });
        }
      } else {
        const result = migrateServerFile(filePath);
        if (result.updated) {
          results.updated.push(result);
        } else if (result.skipped) {
          results.skipped.push(filePath);
        }
      }
    } catch (e) {
      console.error(`  → ERROR: ${filePath} - ${e.message}`);
      results.errors.push({ path: filePath, error: e.message });
    }
  }
  
  console.log('\n═══ Summary ═══');
  console.log(`Updated: ${results.updated.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e.path}: ${e.error}`));
  }
  
  if (DRY_RUN && results.updated.length > 0) {
    console.log('\nTo apply changes, run without --dry-run flag');
  }
}

main();
