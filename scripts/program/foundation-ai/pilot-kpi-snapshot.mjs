#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const OUT = resolve(ROOT, 'proofs', 'foundation-ai', 'post-launch', 'pilot-kpi-snapshot.json');
mkdirSync(resolve(ROOT, 'proofs', 'foundation-ai', 'post-launch'), { recursive: true });

const BASE = process.env.UI_OS_BASE_URL ?? 'http://localhost:4115';
const headers = {
  'x-user-sub': process.env.PILOT_USER_SUB ?? 'foundation-probe-001',
  'x-tenant-id': process.env.PILOT_TENANT_ID ?? '65f10f855eab8b30',
};

async function readBinding(route, locale = 'en') {
  const u = new URL('/api/ui-os/template-binding', BASE);
  u.searchParams.set('route', route);
  u.searchParams.set('locale', locale);
  const res = await fetch(u, { headers });
  if (!res.ok) throw new Error(`binding ${route} failed: ${res.status}`);
  return res.json();
}

function sql(query) {
  const cmd =
    `PGPASSWORD='${process.env.PILOT_DB_PASSWORD ?? 'shahin_grc_2024'}' ` +
    `psql -h ${process.env.PILOT_DB_HOST ?? 'localhost'} ` +
    `-U ${process.env.PILOT_DB_USER ?? 'shahin'} ` +
    `-d ${process.env.PILOT_DB_NAME ?? 'shahin_grc'} ` +
    `-At -F '|' -c "${query.replace(/"/g, '\\"')}"`;
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const en = await readBinding('/foundation/ownership-mapping', 'en');
const ar = await readBinding('/foundation/ownership-mapping', 'ar');
const delegations = await readBinding('/foundation/delegations', 'en');
const workflows = await readBinding('/foundation/workflows', 'en');

const exportCount = Number(
  sql(`SELECT COUNT(*) FROM dos.ui_route_export_artifact WHERE route='/foundation/reports' AND artifact_id LIKE 'foundation-%'`) || '0',
);

const payload = {
  generatedAt: new Date().toISOString(),
  tenantId: headers['x-tenant-id'],
  userSub: headers['x-user-sub'],
  kpis: {
    delegationsRuleCount: delegations?.props?.delegationRules?.length ?? 0,
    delegationsEscalationCount:
      (delegations?.props?.delegationRules ?? []).filter((r) => r?.escalationRequired === true).length,
    workflowsStepCount: workflows?.props?.workflowTimelineSteps?.length ?? 0,
    ownershipGraphNodeCount: en?.props?.identityGraphNodes?.length ?? 0,
    ownershipGraphEdgeCount: en?.props?.identityGraphEdges?.length ?? 0,
    policySimulationScenarioCount: en?.props?.policySimulationScenarios?.length ?? 0,
    aiExplainabilityBlockCount: en?.props?.aiExplainabilityBlocks?.length ?? 0,
    bilingualComplianceExportCount: exportCount,
  },
  localizationChecks: {
    ownershipNodeArabicLabel: ar?.props?.identityGraphNodes?.[0]?.label?.label ?? null,
    workflowsArabicMastheadTitle: (await readBinding('/foundation/workflows', 'ar'))?.props?.masthead?.title ?? null,
  },
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[pilot-kpi-snapshot] wrote ${OUT}`);
