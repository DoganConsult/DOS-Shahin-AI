#!/usr/bin/env node
/**
 * verify-table-ownership.mjs
 *
 * Verifies table ownership by tracing actual SQL references in legacy module code.
 * For each table in table-ownership-map.json, searches which modules actually
 * reference that table in their service/repository code (INSERT, UPDATE, DELETE, FROM, JOIN).
 *
 * Produces:
 *   - Confidence score per table (verified, likely, uncertain, conflicted, unreferenced)
 *   - Mismatch report (heuristic owner != code-traced owner)
 *   - Updated table-ownership-map.json with verified ownership + confidence field
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const MODULES_DIR = join(LEGACY_ROOT, 'backend/src/modules');
const PLATFORM_DIR = join(LEGACY_ROOT, 'backend/src/platform');
const OWNERSHIP_MAP = join(TARGET_ROOT, 'migration/inventory/table-ownership-map.json');
const REPORT_FILE = join(TARGET_ROOT, 'migration/inventory/table-ownership-verification.json');

// ── Module → Service mapping (same as extract-tables.mjs) ──

const MODULE_TO_SERVICE = {
  foundation: 'tenant-service', admin: 'tenant-service', team: 'tenant-service',
  onboarding: 'onboarding-service', 'module-onboarding': 'onboarding-service',
  provisioning: 'tenant-service', bootstrap: 'tenant-service', navigation: 'tenant-service',
  workflow: 'workflow-service', notification: 'notification-service', inbox: 'notification-service',
  ai: 'ai-gateway-service', 'ai-governance': 'ai-gateway-service',
  'agrc-engine': 'ai-gateway-service', mcp: 'ai-gateway-service',
  auth: 'auth-service', dauth: 'auth-service', identity: 'auth-service',
  session: 'auth-service', access: 'auth-service', delegation: 'auth-service',
  sod: 'auth-service',
  user: 'user-service', person: 'user-service', profile: 'user-service',
  risk: 'risk-incident-service', incident: 'risk-incident-service', bcp: 'risk-incident-service',
  vendor: 'risk-incident-service', fitch: 'risk-incident-service', asset: 'risk-incident-service',
  remediation: 'risk-incident-service', action: 'risk-incident-service',
  compliance: 'compliance-controls-service', controls: 'compliance-controls-service',
  exception: 'compliance-controls-service', training: 'compliance-controls-service',
  qiyas: 'compliance-controls-service', dora: 'compliance-controls-service',
  privacy: 'compliance-controls-service', knowledge: 'compliance-controls-service',
  policy: 'governance-policy-service', governance: 'governance-policy-service',
  'governance-ai': 'governance-policy-service', 'governance-os': 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service', audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service', analytics: 'evidence-audit-reporting-service',
  dashboard: 'evidence-audit-reporting-service', records: 'evidence-audit-reporting-service',
  integrations: 'gateway', connectors: 'gateway', portals: 'gateway',
  mobile: 'notification-service', config: 'tenant-service',
  'config-center': 'tenant-service', security: 'auth-service',
  workspace: 'tenant-service', issues: 'risk-incident-service',
};

// ── Scan module directories ──

function getModuleDirs() {
  if (!existsSync(MODULES_DIR)) return [];
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({ name: d.name, path: join(MODULES_DIR, d.name) }));
}

function collectTsFiles(dir, maxDepth = 5) {
  const files = [];
  function walk(d, depth) {
    if (depth > maxDepth || !existsSync(d)) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(full, depth + 1);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        files.push(full);
      }
    }
  }
  walk(dir, 0);
  return files;
}

// ── Build per-module table reference index ──

function buildModuleTableIndex() {
  console.log('Building module ��� table reference index...\n');
  const modules = getModuleDirs();
  // Also scan platform dir
  const allDirs = [
    ...modules,
    { name: 'platform-dauth', path: join(PLATFORM_DIR, 'dos') },
    { name: 'platform-core', path: join(PLATFORM_DIR, 'dos') },
  ];

  // moduleReferences: Map<tableName, Set<moduleName>>
  const writeRefs = new Map();  // INSERT/UPDATE/DELETE
  const readRefs = new Map();   // SELECT/FROM/JOIN

  let totalFiles = 0;
  let totalMatches = 0;

  for (const mod of allDirs) {
    const files = collectTsFiles(mod.path);
    totalFiles += files.length;

    for (const file of files) {
      let content;
      try {
        content = readFileSync(file, 'utf-8');
      } catch { continue; }

      // Find SQL table references in various patterns:
      // 1. "schema".tablename or ${schema}.tablename
      // 2. FROM tablename, JOIN tablename
      // 3. INSERT INTO tablename, UPDATE tablename, DELETE FROM tablename

      // Pattern: references to table names in SQL strings
      const patterns = [
        // Schema-qualified: "schema".table_name or ${schema}.table_name
        /(?:"\$\{schema\}"|"\$\{[^}]+\}")\.(\w+)/g,
        /(?:"\w+"|\$\{\w+\})\.(\w+)/g,
        // Unqualified SQL keywords
        /\bFROM\s+"?(\w+)"?/gi,
        /\bJOIN\s+"?(\w+)"?/gi,
        /\bINTO\s+"?(\w+)"?/gi,
        /\bUPDATE\s+"?(\w+)"?/gi,
        /\bDELETE\s+FROM\s+"?(\w+)"?/gi,
        /\bINSERT\s+INTO\s+"?(\w+)"?/gi,
      ];

      const writePatterns = [
        /\bINSERT\s+INTO\s+"?(\w+)"?/gi,
        /\bUPDATE\s+"?(\w+)"?/gi,
        /\bDELETE\s+FROM\s+"?(\w+)"?/gi,
        /(?:"\$\{schema\}"|"\$\{[^}]+\}"|"\w+")\.(\w+)(?=\s*\n?\s*(?:SET|VALUES|\())/gi,
      ];

      const readPatterns = [
        /\bFROM\s+"?(\w+)"?/gi,
        /\bJOIN\s+"?(\w+)"?/gi,
      ];

      // Extract module name from path
      let moduleName = mod.name;
      if (moduleName.startsWith('platform-')) {
        // For platform dirs, try to infer from file path
        const relPath = file.replace(mod.path, '');
        if (relPath.includes('dauth') || relPath.includes('auth')) moduleName = 'auth';
        else if (relPath.includes('tenancy') || relPath.includes('tenant')) moduleName = 'foundation';
        else moduleName = 'admin';
      }

      // Check write patterns
      for (const pattern of writePatterns) {
        let m;
        while ((m = pattern.exec(content)) !== null) {
          const table = m[1].toLowerCase();
          if (isValidTableName(table)) {
            if (!writeRefs.has(table)) writeRefs.set(table, new Set());
            writeRefs.get(table).add(moduleName);
            totalMatches++;
          }
        }
      }

      // Check read patterns
      for (const readP of readPatterns) {
        let m;
        while ((m = readP.exec(content)) !== null) {
          const table = m[1].toLowerCase();
          if (isValidTableName(table)) {
            if (!readRefs.has(table)) readRefs.set(table, new Set());
            readRefs.get(table).add(moduleName);
            totalMatches++;
          }
        }
      }
    }
  }

  console.log(`  Scanned ${totalFiles} files across ${allDirs.length} module dirs`);
  console.log(`  Found ${totalMatches} table references`);
  console.log(`  Write references: ${writeRefs.size} unique tables`);
  console.log(`  Read references: ${readRefs.size} unique tables\n`);

  return { writeRefs, readRefs };
}

// SQL keywords and common false positives to exclude
const SQL_KEYWORDS = new Set([
  'select', 'where', 'and', 'or', 'not', 'null', 'true', 'false',
  'set', 'values', 'returning', 'as', 'on', 'in', 'is', 'like',
  'order', 'by', 'group', 'having', 'limit', 'offset', 'distinct',
  'case', 'when', 'then', 'else', 'end', 'cast', 'coalesce',
  'count', 'sum', 'avg', 'min', 'max', 'now', 'current_timestamp',
  'exists', 'any', 'all', 'between', 'union', 'intersect', 'except',
  'begin', 'commit', 'rollback', 'with', 'recursive', 'lateral',
  'schema', 'table', 'index', 'constraint', 'foreign', 'primary',
  'key', 'references', 'cascade', 'restrict', 'no', 'action',
  'create', 'alter', 'drop', 'add', 'column', 'type', 'default',
  'boolean', 'integer', 'varchar', 'text', 'uuid', 'jsonb', 'json',
  'timestamptz', 'timestamp', 'numeric', 'int', 'bigint', 'serial',
  'if', 'do', 'declare', 'raise', 'exception', 'notice',
  'function', 'trigger', 'procedure', 'language', 'plpgsql',
  'inner', 'left', 'right', 'outer', 'cross', 'natural', 'full',
]);

function isValidTableName(name) {
  if (name.length < 3) return false;
  if (SQL_KEYWORDS.has(name)) return false;
  if (/^\d/.test(name)) return false;
  if (name.startsWith('$') || name.startsWith('_')) return false;
  return /^[a-z][a-z0-9_]+$/.test(name);
}

// ── Verify ownership ──

function main() {
  console.log('=== verify-table-ownership.mjs ===\n');

  // Load current ownership map
  const ownershipData = JSON.parse(readFileSync(OWNERSHIP_MAP, 'utf-8'));
  const tables = ownershipData.tables;
  console.log(`Loaded ${tables.length} tables from ownership map\n`);

  // Build code reference index
  const { writeRefs, readRefs } = buildModuleTableIndex();

  // Verify each table
  const results = [];
  let verified = 0;
  let likely = 0;
  let uncertain = 0;
  let conflicted = 0;
  let unreferenced = 0;
  let mismatches = [];

  for (const table of tables) {
    const name = table.table_name;
    const assignedService = table.owner_service;
    const assignedModule = table.owner_module;

    const writers = writeRefs.get(name) || new Set();
    const readers = readRefs.get(name) || new Set();
    const allRefs = new Set([...writers, ...readers]);

    let confidence;
    let codeOwner = null;
    let codeOwnerService = null;
    let mismatch = false;

    if (writers.size === 0 && readers.size === 0) {
      // No code references found
      confidence = 'unreferenced';
      unreferenced++;
    } else if (writers.size === 1) {
      // Single writer — strong signal
      codeOwner = [...writers][0];
      codeOwnerService = MODULE_TO_SERVICE[codeOwner] || 'UNKNOWN';
      if (codeOwnerService === assignedService) {
        confidence = 'verified';
        verified++;
      } else {
        confidence = 'conflicted';
        conflicted++;
        mismatch = true;
      }
    } else if (writers.size > 1) {
      // Multiple writers — ownership is ambiguous
      const writerServices = new Set([...writers].map(m => MODULE_TO_SERVICE[m] || 'UNKNOWN'));
      if (writerServices.has(assignedService)) {
        confidence = 'likely';
        likely++;
      } else {
        confidence = 'conflicted';
        conflicted++;
        mismatch = true;
        codeOwner = [...writers][0];
        codeOwnerService = MODULE_TO_SERVICE[codeOwner] || 'UNKNOWN';
      }
    } else if (readers.size > 0) {
      // Only readers, no writers found — weaker signal
      const readerServices = new Set([...readers].map(m => MODULE_TO_SERVICE[m] || 'UNKNOWN'));
      if (readerServices.has(assignedService)) {
        confidence = 'likely';
        likely++;
      } else {
        confidence = 'uncertain';
        uncertain++;
      }
    }

    const entry = {
      table_name: name,
      assigned_service: assignedService,
      assigned_module: assignedModule,
      confidence,
      code_writers: [...writers],
      code_readers: [...readers].slice(0, 10), // limit for output size
      writer_count: writers.size,
      reader_count: readers.size,
    };

    if (mismatch) {
      entry.code_owner_service = codeOwnerService;
      entry.code_owner_module = codeOwner;
      mismatches.push(entry);
    }

    results.push(entry);
  }

  // Update the ownership map with confidence scores
  for (const table of tables) {
    const result = results.find(r => r.table_name === table.table_name);
    if (result) {
      table.ownership_confidence = result.confidence;
      table.code_writer_modules = result.code_writers;
      table.code_writer_count = result.writer_count;
      table.code_reader_count = result.reader_count;
    }
  }

  // Write updated ownership map
  ownershipData.$stats.verified = verified;
  ownershipData.$stats.likely = likely;
  ownershipData.$stats.uncertain = uncertain;
  ownershipData.$stats.conflicted = conflicted;
  ownershipData.$stats.unreferenced = unreferenced;
  ownershipData.$stats.mismatches = mismatches.length;
  ownershipData.$verification = {
    method: 'Code-traced SQL references (INSERT/UPDATE/DELETE/FROM/JOIN) across all module service files',
    timestamp: new Date().toISOString(),
    modules_scanned: readdirSync(MODULES_DIR).length,
  };

  writeFileSync(OWNERSHIP_MAP, JSON.stringify(ownershipData, null, 2) + '\n');

  // Write verification report
  const report = {
    $generated: new Date().toISOString(),
    summary: { verified, likely, uncertain, conflicted, unreferenced, total: tables.length },
    mismatches: mismatches.sort((a, b) => a.table_name.localeCompare(b.table_name)),
    confidence_breakdown: {
      verified_pct: ((verified / tables.length) * 100).toFixed(1) + '%',
      likely_pct: ((likely / tables.length) * 100).toFixed(1) + '%',
      uncertain_pct: ((uncertain / tables.length) * 100).toFixed(1) + '%',
      conflicted_pct: ((conflicted / tables.length) * 100).toFixed(1) + '%',
      unreferenced_pct: ((unreferenced / tables.length) * 100).toFixed(1) + '%',
    },
  };

  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');

  // Console report
  console.log('=== VERIFICATION RESULTS ===\n');
  console.log(`  Verified (single writer matches assignment):  ${verified}`);
  console.log(`  Likely (multi-writer includes assignment):    ${likely}`);
  console.log(`  Uncertain (readers only, no writers):         ${uncertain}`);
  console.log(`  Conflicted (code writer != assignment):       ${conflicted}`);
  console.log(`  Unreferenced (no code references found):      ${unreferenced}`);
  console.log(`  Total: ${tables.length}\n`);

  if (mismatches.length > 0) {
    console.log(`=== MISMATCHES (${mismatches.length}) ===\n`);
    for (const m of mismatches.slice(0, 30)) {
      console.log(`  ${m.table_name}:`);
      console.log(`    Assigned: ${m.assigned_service} (${m.assigned_module})`);
      console.log(`    Code says: ${m.code_owner_service} (${m.code_owner_module})`);
      console.log(`    Writers: [${m.code_writers.join(', ')}]`);
    }
    if (mismatches.length > 30) {
      console.log(`  ... and ${mismatches.length - 30} more`);
    }
  }

  console.log(`\nOwnership map updated: ${OWNERSHIP_MAP}`);
  console.log(`Verification report: ${REPORT_FILE}`);
}

main();
