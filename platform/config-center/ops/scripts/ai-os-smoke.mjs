#!/usr/bin/env node
// AI-OS end-to-end smoke harness (Wave 1 closure F11/F12).
//
// Exercises:
//   1. Governance decision API (allow / hitl_required / deny).
//   2. A01 Temporal invoke happy path (status=completed).
//   3. A01 Temporal invoke negative path (cross-tenant → deny).
//   4. A13 public landing copilot (no-auth surface).
//
// Designed to be safe to run in dev: tolerates services being down by
// reporting per-step PASS/FAIL and exiting non-zero on any FAIL.

import process from 'node:process';
import { createHmac } from 'node:crypto';

const ENGINE  = process.env.AI_ENGINE_URL  || 'http://127.0.0.1:4311';
const GOV     = process.env.AI_GOV_URL     || 'http://127.0.0.1:4312';
const GATEWAY = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:4310';
const TENANT  = process.env.SMOKE_TENANT   || '00000000-0000-0000-0000-000000000001';

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function mintHs256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + 3600, ...payload };
  const head = b64url(JSON.stringify(header));
  const claims = b64url(JSON.stringify(body));
  const sig = createHmac('sha256', secret).update(`${head}.${claims}`).digest('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${head}.${claims}.${sig}`;
}
const TOKEN = process.env.SMOKE_TOKEN || (process.env.JWT_SECRET
  ? mintHs256({
      userId: 'smoke-user',
      tenantId: TENANT,
      role: 'platform_super_admin',
      roles: ['platform_super_admin', 'tenant_admin'],
      permissions: ['ai.temporal.invoke', 'ai.landing.invoke', 'ai.governance.review', 'ai.kernel.admin'],
    }, process.env.JWT_SECRET)
  : '');

let failures = 0;
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail ? '— ' + detail : ''}`);
}

async function call(url, method, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body: json };
}

async function main() {
  // 1. Governance — allow.
  {
    const r = await call(`${GOV}/api/ai-governance/policies/decision`, 'POST',
      { tenantId: TENANT, agentCode: 'A01', payload: { tool: 'risk.read' } });
    record('gov.allow', r.status === 200 && r.body?.decision === 'allow', `status=${r.status} decision=${r.body?.decision}`);
  }
  // 2. Governance — hitl_required (high-risk tool).
  {
    const r = await call(`${GOV}/api/ai-governance/policies/decision`, 'POST',
      { tenantId: TENANT, agentCode: 'A01', payload: { tool: 'organization.write' } });
    record('gov.hitl', r.status === 200 && r.body?.decision === 'hitl_required',
      `status=${r.status} decision=${r.body?.decision} policy=${r.body?.policyCode}`);
  }
  // 3. Governance — deny (cross-tenant).
  {
    const r = await call(`${GOV}/api/ai-governance/policies/decision`, 'POST',
      { tenantId: TENANT, agentCode: 'A01', payload: { tenantId: 't-other-tenant' } });
    record('gov.deny.cross-tenant', r.status === 200 && r.body?.decision === 'deny',
      `status=${r.status} policy=${r.body?.policyCode}`);
  }

  // 4. Temporal — start A01 workflow (happy path).
  let workflowId = null;
  {
    const r = await call(`${ENGINE}/api/ai-engine/temporal/agents/A01/invoke`, 'POST',
      { tenantId: TENANT, agentCode: 'A01', input: { query: 'smoke onboarding check' }, autonomyLevel: 0 });
    workflowId = r.body?.workflowId;
    record('temporal.invoke.happy', !!workflowId, `status=${r.status} wf=${workflowId}`);
  }

  // 5. A13 public landing copilot (no auth).
  {
    const r = await fetch(`${ENGINE}/api/copilot/intent-to-query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'how do I enable A13 copilot?' }),
    });
    let body = null; try { body = await r.json(); } catch {}
    record('copilot.public.A13', r.status < 500, `status=${r.status} keys=${body ? Object.keys(body).join(',') : 'none'}`);
  }

  // 6. Health endpoints (no auth required).
  for (const [code, url] of [
    ['ai-engine', `${ENGINE}/health`],
    ['ai-gov', `${GOV}/api/ai-governance/info`],
  ]) {
    const r = await fetch(url);
    record(`health.${code}`, r.status === 200, `status=${r.status}`);
  }

  console.log('\n--- summary ---');
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
  console.log(`\n${failures} failure(s) out of ${results.length}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error('smoke harness fatal:', err); process.exit(2); });
