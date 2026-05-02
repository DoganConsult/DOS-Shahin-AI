#!/usr/bin/env node
/**
 * extract-events.mjs
 *
 * Extracts the complete event registry from two authoritative sources:
 *   1. Live DB: public.event_type_registry (413 registered events)
 *   2. Code: backend/src/modules/ * /events/ *.events.ts (61 contract files with published + consumed)
 *
 * Merges both into a unified event-publisher-consumer-map.json with:
 *   - Every event type
 *   - Publisher module
 *   - Consumer modules (from consumed contracts)
 *   - Payload type
 *   - Evidence source (db-registered, code-contract, or both)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const MODULES_DIR = join(LEGACY_ROOT, 'backend/src/modules');
const DB_EVENTS_FILE = '/tmp/db_events.json';
const OUTPUT_FILE = join(TARGET_ROOT, 'migration/inventory/event-publisher-consumer-map.json');

// ── Module → Service mapping ──

const MODULE_TO_SERVICE = {
  foundation: 'tenant-service', admin: 'tenant-service', team: 'tenant-service',
  onboarding: 'onboarding-service', workflow: 'workflow-service',
  notification: 'notification-service', ai: 'ai-gateway-service',
  'ai-governance': 'ai-gateway-service', 'agrc-engine': 'ai-gateway-service',
  auth: 'auth-service', dauth: 'auth-service',
  risk: 'risk-incident-service', incident: 'risk-incident-service',
  bcp: 'risk-incident-service', vendor: 'risk-incident-service',
  asset: 'risk-incident-service', action: 'risk-incident-service',
  remediation: 'risk-incident-service', issues: 'risk-incident-service',
  fitch: 'risk-incident-service', playbooks: 'risk-incident-service',
  compliance: 'compliance-controls-service', controls: 'compliance-controls-service',
  control: 'compliance-controls-service',
  exception: 'compliance-controls-service', training: 'compliance-controls-service',
  qiyas: 'compliance-controls-service', dora: 'compliance-controls-service',
  privacy: 'compliance-controls-service', knowledge: 'compliance-controls-service',
  'local-knowledge': 'compliance-controls-service', 'ksa-regulatory': 'compliance-controls-service',
  benchmarks: 'compliance-controls-service', ccm: 'compliance-controls-service',
  pdpl: 'compliance-controls-service', procedure: 'compliance-controls-service',
  policy: 'governance-policy-service', governance: 'governance-policy-service',
  'governance-ai': 'governance-policy-service', 'governance-os': 'governance-policy-service',
  'proactive-leadership': 'governance-policy-service', constitution: 'governance-policy-service',
  stakeholder: 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service', audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service', analytics: 'evidence-audit-reporting-service',
  attestation: 'evidence-audit-reporting-service', report: 'evidence-audit-reporting-service',
  records: 'evidence-audit-reporting-service', dashboard: 'evidence-audit-reporting-service',
  'dashboard-editor': 'evidence-audit-reporting-service', widgets: 'evidence-audit-reporting-service',
  integrations: 'gateway', connectors: 'gateway', connector: 'gateway', portals: 'gateway',
  // Platform namespaces
  subscription: 'tenant-service', navigation: 'tenant-service',
  security: 'auth-service', bootstrap: 'tenant-service',
  'quality-gate': 'tenant-service', provisioning: 'tenant-service',
  workspace: 'tenant-service', 'config-center': 'tenant-service',
  'platform-stats': 'tenant-service', 'operating-cockpit': 'tenant-service',
  platform: 'tenant-service', modules: 'tenant-service', packs: 'tenant-service',
  // Workflow sub-namespaces
  raci: 'workflow-service', process_task: 'workflow-service',
  unified_squad: 'workflow-service', approval: 'workflow-service',
  escalation: 'workflow-service', lifecycle: 'workflow-service',
  gate: 'workflow-service', task: 'workflow-service', automation: 'workflow-service',
  cycle: 'workflow-service', delta: 'workflow-service',
  // AI sub-namespaces
  ai_supply_chain: 'ai-gateway-service', mcp: 'ai-gateway-service',
  cockpit: 'ai-gateway-service', triage: 'ai-gateway-service',
  calibration: 'ai-gateway-service',
  // Onboarding sub-namespaces
  journey: 'onboarding-service', 'module-onboarding': 'onboarding-service',
  'onboarding-os': 'onboarding-service',
  // Auth sub-namespaces
  role: 'auth-service', sod: 'auth-service', delegation: 'auth-service',
  // Evidence sub-namespaces
  evidence_request: 'evidence-audit-reporting-service',
  // Misc
  inbox: 'notification-service', telemetry: 'tenant-service', ops: 'tenant-service',
  executive: 'compliance-controls-service', advanced: 'compliance-controls-service',
  'grc-query': 'evidence-audit-reporting-service',
  crosshub: 'workflow-service', framework: 'compliance-controls-service',
  frameworks: 'compliance-controls-service', regulator: 'compliance-controls-service',
  consultant: 'risk-incident-service', engagement: 'governance-policy-service',
  ownership: 'auth-service', risk_pair: 'risk-incident-service',
};

// ── Parse event contracts from code ──

function parseEventContracts() {
  const contracts = [];
  const eventFiles = [];

  // Find all *.events.ts files
  if (!existsSync(MODULES_DIR)) return { contracts, eventFiles };

  for (const mod of readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (!mod.isDirectory()) continue;
    const eventsDir = join(MODULES_DIR, mod.name, 'events');
    if (!existsSync(eventsDir)) continue;

    for (const f of readdirSync(eventsDir)) {
      if (!f.endsWith('.events.ts')) continue;
      const filePath = join(eventsDir, f);
      eventFiles.push({ module: mod.name, file: f, path: filePath });

      try {
        const content = readFileSync(filePath, 'utf-8');
        const contract = parseContractFile(content, mod.name);
        if (contract) contracts.push(contract);
      } catch (e) {
        // skip unreadable files
      }
    }
  }

  return { contracts, eventFiles };
}

function parseContractFile(content, moduleName) {
  // Extract moduleCode
  const moduleCodeMatch = content.match(/moduleCode:\s*['"]([^'"]+)['"]/);
  const moduleCode = moduleCodeMatch ? moduleCodeMatch[1] : moduleName;

  // Extract published events
  const published = {};
  // Match published block
  const pubMatch = content.match(/published:\s*\{([\s\S]*?)\},?\s*consumed/);
  if (pubMatch) {
    const pubBlock = pubMatch[1];
    const eventRegex = /'([^']+)':\s*\{([^}]+)\}/g;
    let m;
    while ((m = eventRegex.exec(pubBlock)) !== null) {
      const eventType = m[1];
      const props = m[2];
      const descMatch = props.match(/description:\s*'([^']+)'/);
      const versionMatch = props.match(/version:\s*(\d+)/);
      const payloadMatch = props.match(/payloadType:\s*'([^']+)'/);
      published[eventType] = {
        description: descMatch ? descMatch[1] : '',
        version: versionMatch ? parseInt(versionMatch[1]) : 1,
        payloadType: payloadMatch ? payloadMatch[1] : 'unknown',
      };
    }
  }

  // Extract consumed events
  const consumed = {};
  const conMatch = content.match(/consumed:\s*\{([\s\S]*?)\},?\s*\}/);
  if (conMatch) {
    const conBlock = conMatch[1];
    const eventRegex = /'([^']+)':\s*\{([^}]+)\}/g;
    let m;
    while ((m = eventRegex.exec(conBlock)) !== null) {
      const eventType = m[1];
      const props = m[2];
      const sourceMatch = props.match(/source:\s*'([^']+)'/);
      const handlerMatch = props.match(/handler:\s*'([^']+)'/);
      const idempotentMatch = props.match(/idempotent:\s*(true|false)/);
      const retryMatch = props.match(/retryPolicy:\s*'([^']+)'/);
      const dlqMatch = props.match(/deadLetterEnabled:\s*(true|false)/);
      consumed[eventType] = {
        source: sourceMatch ? sourceMatch[1] : 'unknown',
        handler: handlerMatch ? handlerMatch[1] : 'unknown',
        idempotent: idempotentMatch ? idempotentMatch[1] === 'true' : true,
        retryPolicy: retryMatch ? retryMatch[1] : 'exponential',
        deadLetterEnabled: dlqMatch ? dlqMatch[1] === 'true' : true,
      };
    }
  }

  // Extract ordering config
  const orderMatch = content.match(/EVENT_ORDERING\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  let ordering = null;
  if (orderMatch) {
    const block = orderMatch[1];
    const strict = block.match(/strictOrdering:\s*(true|false)/);
    const partition = block.match(/partitionKey:\s*'([^']+)'/);
    const dedup = block.match(/deduplicationWindow:\s*(\d+)/);
    const retries = block.match(/maxRetries:\s*(\d+)/);
    ordering = {
      strictOrdering: strict ? strict[1] === 'true' : true,
      partitionKey: partition ? partition[1] : 'tenantId',
      deduplicationWindow: dedup ? parseInt(dedup[1]) : 300,
      maxRetries: retries ? parseInt(retries[1]) : 3,
    };
  }

  // Extract security config
  const secMatch = content.match(/EVENT_SECURITY\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  let security = null;
  if (secMatch) {
    const block = secMatch[1];
    const crossTenant = block.match(/allowCrossTenant:\s*(true|false)/);
    const auditPub = block.match(/auditAllPublishes:\s*(true|false)/);
    security = {
      allowCrossTenant: crossTenant ? crossTenant[1] === 'true' : false,
      auditAllPublishes: auditPub ? auditPub[1] === 'true' : true,
    };
  }

  return {
    moduleCode,
    publisherService: MODULE_TO_SERVICE[moduleCode] || 'UNKNOWN',
    published,
    consumed,
    ordering,
    security,
    publishedCount: Object.keys(published).length,
    consumedCount: Object.keys(consumed).length,
  };
}

// ── Main ──

function main() {
  console.log('=== extract-events.mjs ===\n');

  // Source 1: Live DB
  let dbEvents = [];
  if (existsSync(DB_EVENTS_FILE)) {
    dbEvents = JSON.parse(readFileSync(DB_EVENTS_FILE, 'utf-8'));
    console.log(`Source 1 (live DB event_type_registry): ${dbEvents.length} events`);
  }

  // Source 2: Code contracts
  const { contracts, eventFiles } = parseEventContracts();
  const totalPublished = contracts.reduce((s, c) => s + c.publishedCount, 0);
  const totalConsumed = contracts.reduce((s, c) => s + c.consumedCount, 0);
  console.log(`Source 2 (code contracts): ${contracts.length} modules, ${totalPublished} published, ${totalConsumed} consumed`);

  // Merge into unified event map
  const eventMap = new Map(); // eventType → entry

  // Add DB events
  for (const e of dbEvents) {
    const namespace = e.namespace;
    const service = MODULE_TO_SERVICE[namespace] || MODULE_TO_SERVICE[namespace.replace(/_/g, '-')] || 'UNKNOWN';
    eventMap.set(e.event_type, {
      event_type: e.event_type,
      namespace: e.namespace,
      publisher_module: namespace,
      publisher_service: service,
      product_key: e.product_key,
      source: 'db-registered',
      description: '',
      version: 1,
      payloadType: '',
      consumers: [],
    });
  }

  // Merge code contracts
  for (const contract of contracts) {
    // Published events
    for (const [eventType, meta] of Object.entries(contract.published)) {
      const existing = eventMap.get(eventType);
      if (existing) {
        // Merge: code adds description, payload, version
        existing.description = meta.description || existing.description;
        existing.version = meta.version || existing.version;
        existing.payloadType = meta.payloadType || existing.payloadType;
        existing.source = 'both'; // in DB AND code
        existing.ordering = contract.ordering;
        existing.security = contract.security;
      } else {
        // Code-only event (not in DB registry)
        eventMap.set(eventType, {
          event_type: eventType,
          namespace: contract.moduleCode,
          publisher_module: contract.moduleCode,
          publisher_service: contract.publisherService,
          product_key: 'shahin-ai',
          source: 'code-contract',
          description: meta.description,
          version: meta.version,
          payloadType: meta.payloadType,
          consumers: [],
          ordering: contract.ordering,
          security: contract.security,
        });
      }
    }

    // Consumed events → add consumer info
    for (const [eventType, meta] of Object.entries(contract.consumed)) {
      const existing = eventMap.get(eventType);
      const consumer = {
        module: contract.moduleCode,
        service: contract.publisherService,
        handler: meta.handler,
        idempotent: meta.idempotent,
        retryPolicy: meta.retryPolicy,
        deadLetterEnabled: meta.deadLetterEnabled,
      };
      if (existing) {
        existing.consumers.push(consumer);
      } else {
        // Event consumed but not in our map yet (published by unknown module)
        eventMap.set(eventType, {
          event_type: eventType,
          namespace: meta.source,
          publisher_module: meta.source,
          publisher_service: MODULE_TO_SERVICE[meta.source] || 'UNKNOWN',
          product_key: 'shahin-ai',
          source: 'consumed-only',
          description: '',
          version: 1,
          payloadType: '',
          consumers: [consumer],
        });
      }
    }
  }

  // Build output
  const events = [...eventMap.values()].sort((a, b) => a.event_type.localeCompare(b.event_type));

  const bySource = { 'both': 0, 'db-registered': 0, 'code-contract': 0, 'consumed-only': 0 };
  events.forEach(e => bySource[e.source] = (bySource[e.source] || 0) + 1);

  const byNamespace = {};
  events.forEach(e => byNamespace[e.namespace] = (byNamespace[e.namespace] || 0) + 1);

  const byService = {};
  events.forEach(e => byService[e.publisher_service] = (byService[e.publisher_service] || 0) + 1);

  const output = {
    $schema: 'dos-event-registry-v1',
    $description: 'Unified event publisher-consumer map extracted from live DB + code contracts.',
    $generated: new Date().toISOString(),
    $sources: [
      'Live DB: public.event_type_registry (413 rows)',
      'Code: backend/src/modules/*/events/*.events.ts (61 contract files)',
    ],
    $stats: {
      total_events: events.length,
      from_db: dbEvents.length,
      from_code_published: totalPublished,
      from_code_consumed: totalConsumed,
      by_evidence: bySource,
      by_namespace: byNamespace,
      by_publisher_service: byService,
      modules_with_contracts: contracts.length,
      total_consumer_bindings: events.reduce((s, e) => s + e.consumers.length, 0),
    },
    events,
    module_contracts: contracts.map(c => ({
      moduleCode: c.moduleCode,
      publisherService: c.publisherService,
      publishedCount: c.publishedCount,
      consumedCount: c.consumedCount,
      ordering: c.ordering,
      security: c.security,
    })),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  // Report
  console.log('\n=== EVENT EXTRACTION REPORT ===\n');
  console.log(`Total unique events: ${events.length}`);
  console.log(`  In DB + code:    ${bySource['both']}`);
  console.log(`  DB only:         ${bySource['db-registered']}`);
  console.log(`  Code only:       ${bySource['code-contract']}`);
  console.log(`  Consumed only:   ${bySource['consumed-only']}`);
  console.log(`Consumer bindings: ${output.$stats.total_consumer_bindings}`);

  console.log('\nTop namespaces:');
  Object.entries(byNamespace).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\nBy publisher service:');
  Object.entries(byService).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

main();
