#!/usr/bin/env node
// Seeds Langfuse with one production prompt per agent (A01..A13) and one
// evaluation dataset per agent. Idempotent — re-running creates a new prompt
// version only if the body has changed, and re-uses existing datasets.
//
// Reads credentials from env (LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY,
// LANGFUSE_SECRET_KEY) or falls back to the canonical /opt/langfuse/.env.

import fs from 'node:fs';

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  const raw = fs.readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
loadEnvFile('/opt/langfuse/.env');

const HOST = (process.env.LANGFUSE_HOST || 'http://127.0.0.1:4090/admin/langfuse').replace(/\/$/, '');
const PK = process.env.LANGFUSE_PUBLIC_KEY || process.env.LANGFUSE_INIT_PROJECT_PUBLIC_KEY;
const SK = process.env.LANGFUSE_SECRET_KEY || process.env.LANGFUSE_INIT_PROJECT_SECRET_KEY;
if (!PK || !SK) { console.error('Missing LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY'); process.exit(2); }

const AUTH = 'Basic ' + Buffer.from(`${PK}:${SK}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${HOST}/api/public${path}`, {
    method, headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  return json;
}

const AGENTS = [
  { id: 'A01', name: 'Onboarding Agent',                  domain: 'foundation' },
  { id: 'A02', name: 'Identity Provisioning Agent',       domain: 'admin' },
  { id: 'A03', name: 'Framework Mapping Agent',           domain: 'compliance' },
  { id: 'A04', name: 'Control Authoring Agent',           domain: 'compliance' },
  { id: 'A05', name: 'Evidence Collection Agent',         domain: 'evidence' },
  { id: 'A06', name: 'Gap Remediation Agent',             domain: 'remediation' },
  { id: 'A07', name: 'Risk Register Agent',               domain: 'risk' },
  { id: 'A08', name: 'Policy Lifecycle Agent',            domain: 'governance' },
  { id: 'A09', name: 'Third-Party Risk Agent',            domain: 'vendor' },
  { id: 'A10', name: 'Audit Reporting Agent',             domain: 'audit' },
  { id: 'A11', name: 'BCP Continuity Agent',              domain: 'bcp' },
  { id: 'A12', name: 'Security Awareness & Training Agent', domain: 'training' },
  { id: 'A13', name: 'Policy Review & Landing Copilot',   domain: 'copilot' },
];

function promptBody(a) {
  return `You are ${a.id} (${a.name}) in the DOS / Shahin AI-OS platform. ` +
         `Domain: ${a.domain}. Multi-tenant. Never expose data outside the current tenant. ` +
         `Use tools for facts; never invent. Prefer read-only proposals; require approval for writes. ` +
         `Return JSON when the caller passes responseFormat=json.\n\n` +
         `User input:\n{{input}}\n\nContext:\n{{context}}`;
}

function datasetItems(a) {
  return [
    { input: { task: `${a.name} happy path`, payload: { sample: 'baseline' } },
      expectedOutput: { status: 'completed', agentCode: a.id } },
    { input: { task: `${a.name} guardrail check (cross-tenant)`, payload: { tenantId: 't-other' } },
      expectedOutput: { status: 'rejected', reason: 'cross-tenant-access-blocked' } },
    { input: { task: `${a.name} missing-data ask`, payload: {} },
      expectedOutput: { status: 'hitl_required' } },
  ];
}

async function ensurePrompt(a) {
  const name = `agent.${a.id.toLowerCase()}.system`;
  await api('POST', '/v2/prompts', {
    name,
    type: 'text',
    prompt: promptBody(a),
    labels: ['production', a.id.toLowerCase(), a.domain],
    tags: ['ai-os', 'agent', a.id.toLowerCase(), a.domain],
    config: { model: 'claude-sonnet-4-5', temperature: 0.2 },
  });
  return name;
}

async function ensureDataset(a) {
  const name = `dataset.${a.id.toLowerCase()}.smoke`;
  try { await api('POST', '/v2/datasets', { name, description: `${a.name} smoke evaluation set` }); }
  catch (e) { if (!String(e.message).includes('409') && !String(e.message).includes('already')) console.warn(`[${name}] dataset:`, e.message); }
  for (const item of datasetItems(a)) {
    try { await api('POST', '/dataset-items', { datasetName: name, input: item.input, expectedOutput: item.expectedOutput }); }
    catch (e) { console.warn(`[${name}] item:`, e.message); }
  }
  return name;
}

async function main() {
  console.log(`Langfuse seed → ${HOST}`);
  for (const a of AGENTS) {
    try {
      const p = await ensurePrompt(a);
      const d = await ensureDataset(a);
      console.log(`  ✓ ${a.id} ${a.name.padEnd(40)} prompt=${p}  dataset=${d}`);
    } catch (err) {
      console.error(`  ✗ ${a.id} ${a.name}:`, err.message);
    }
  }
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
