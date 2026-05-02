#!/usr/bin/env node
/**
 * Extract COMPLIANCE_PERMISSIONS / COMPLIANCE_ROLES / COMPLIANCE_SOD_RULES
 * from the TS source files into static JSON. Run on every catalog change.
 *
 * Usage: node ops/scripts/extract-security-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const securityDir = path.join(root, 'interface', 'security');
const outDir = securityDir;

function evalArrayLiteral(literal) {
  // Wrap in a function to use JSON-friendly eval. Tolerant of trailing commas.
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict"; return ${literal};`)();
}

function extractArray(source, exportName) {
  const re = new RegExp(`export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`);
  const m = source.match(re);
  if (!m) throw new Error(`Could not locate ${exportName}`);
  return evalArrayLiteral(m[1]);
}

const security = fs.readFileSync(path.join(securityDir, 'compliance.security.ts'), 'utf8');
const sodSrc = fs.readFileSync(path.join(securityDir, 'compliance.sod.ts'), 'utf8');

const permissions = extractArray(security, 'COMPLIANCE_PERMISSIONS');
const roles = extractArray(security, 'COMPLIANCE_ROLES');
const sodRules = extractArray(sodSrc, 'COMPLIANCE_SOD_RULES');

fs.writeFileSync(
  path.join(outDir, 'compliance.permissions.json'),
  JSON.stringify({ moduleCode: 'compliance', permissions }, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(outDir, 'compliance.roles.json'),
  JSON.stringify({ moduleCode: 'compliance', roles }, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(outDir, 'compliance.sod.json'),
  JSON.stringify({ moduleCode: 'compliance', rules: sodRules }, null, 2) + '\n',
);

console.log(`extracted ${permissions.length} permissions, ${roles.length} roles, ${sodRules.length} sod rules`);
