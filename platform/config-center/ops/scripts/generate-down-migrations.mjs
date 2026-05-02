#!/usr/bin/env node
/**
 * Generates _down.sql rollback files for every up migration that doesn't already have one.
 * Parses CREATE TABLE, CREATE INDEX, CREATE TYPE, CREATE SEQUENCE statements and generates
 * the inverse DROP statements in reverse dependency order.
 *
 * Usage: node ops/scripts/generate-down-migrations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');

function findUpMigrations(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.sql') && !entry.name.endsWith('_down.sql')) {
        results.push(full);
      }
    }
  }
  walk(baseDir);
  return results.sort();
}

function downPath(upPath) {
  return upPath.replace(/\.sql$/, '_down.sql');
}

function extractObjects(sql) {
  const tables = [];
  const indexes = [];
  const types = [];
  const sequences = [];

  // CREATE TABLE [IF NOT EXISTS] <schema.name>
  for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)) {
    tables.push(m[1].replace(/"/g, ''));
  }

  // CREATE [UNIQUE] INDEX [CONCURRENTLY] [IF NOT EXISTS] <name>
  for (const m of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)) {
    indexes.push(m[1].replace(/"/g, ''));
  }

  // CREATE TYPE <name>
  for (const m of sql.matchAll(/CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)) {
    types.push(m[1].replace(/"/g, ''));
  }

  // CREATE SEQUENCE <name>
  for (const m of sql.matchAll(/CREATE\s+SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)) {
    sequences.push(m[1].replace(/"/g, ''));
  }

  return { tables, indexes, types, sequences };
}

function generateDown(upPath) {
  const sql = fs.readFileSync(upPath, 'utf8');
  const { tables, indexes, types, sequences } = extractObjects(sql);
  const relPath = path.relative(ROOT, upPath);

  const lines = [`-- Rollback for ${path.basename(relPath)}`, ''];

  if (indexes.length > 0) {
    lines.push('-- Drop indexes');
    for (const idx of indexes.reverse()) {
      lines.push(`DROP INDEX IF EXISTS ${idx};`);
    }
    lines.push('');
  }

  if (tables.length > 0) {
    lines.push('-- Drop tables in reverse order');
    for (const tbl of [...tables].reverse()) {
      lines.push(`DROP TABLE IF EXISTS ${tbl} CASCADE;`);
    }
    lines.push('');
  }

  if (sequences.length > 0) {
    lines.push('-- Drop sequences');
    for (const seq of sequences.reverse()) {
      lines.push(`DROP SEQUENCE IF EXISTS ${seq};`);
    }
    lines.push('');
  }

  if (types.length > 0) {
    lines.push('-- Drop types');
    for (const t of types.reverse()) {
      lines.push(`DROP TYPE IF EXISTS ${t};`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Collect all up migrations from services/ and modules/
const serviceMigrationDirs = fs.readdirSync(path.join(ROOT, 'services'), { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => path.join(ROOT, 'services', e.name, 'migrations'));

const modulesDir = path.join(ROOT, 'modules');
const moduleMigrationDirs = [];
if (fs.existsSync(modulesDir)) {
  for (const mod of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!mod.isDirectory()) continue;
    const backendDir = path.join(modulesDir, mod.name, 'source', 'backend');
    if (!fs.existsSync(backendDir)) continue;
    for (const svc of fs.readdirSync(backendDir, { withFileTypes: true })) {
      if (!svc.isDirectory()) continue;
      const migDir = path.join(backendDir, svc.name, 'migrations');
      if (fs.existsSync(migDir)) moduleMigrationDirs.push(migDir);
    }
  }
}

const allDirs = [...serviceMigrationDirs, ...moduleMigrationDirs];
let created = 0;
let skipped = 0;

for (const dir of allDirs) {
  const upFiles = findUpMigrations(dir);
  for (const upFile of upFiles) {
    const dp = downPath(upFile);
    if (fs.existsSync(dp)) {
      skipped++;
      continue;
    }
    const content = generateDown(upFile);
    // Only write if we found something to roll back
    const { tables, indexes, types, sequences } = extractObjects(fs.readFileSync(upFile, 'utf8'));
    if (tables.length === 0 && indexes.length === 0 && types.length === 0 && sequences.length === 0) {
      console.log(`  SKIP (no DDL objects): ${path.relative(ROOT, upFile)}`);
      skipped++;
      continue;
    }
    fs.writeFileSync(dp, content, 'utf8');
    console.log(`  CREATE: ${path.relative(ROOT, dp)}`);
    created++;
  }
}

console.log(`\nDone. Created: ${created}, Skipped (already exist or no DDL): ${skipped}`);
