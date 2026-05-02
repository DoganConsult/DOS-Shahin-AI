// Wave 6 — Compliance read-path p95 baseline (k6 load test).
//
// Usage:
//   BASE_URL=https://shahin-ai.com TOKEN=$(cat ~/.dos/token) \
//     k6 run modules/compliance/tests/perf/compliance-baseline.k6.js
//
// SLO targets (per modules/compliance/SLO.md §1.2):
//   read p95 < 300ms, p99 < 600ms, error rate < 0.1% on smoke phase
//   load phase tolerates p95 < 500ms, p99 < 1s, error rate < 1%

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { phase: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m',  target: 50 },
        { duration: '30s', target: 0  },
      ],
      startTime: '35s',
      tags: { phase: 'load' },
    },
  },
  thresholds: {
    'http_req_duration{phase:smoke}':  ['p(95)<300', 'p(99)<600'],
    'http_req_duration{phase:load}':   ['p(95)<500', 'p(99)<1000'],
    'http_req_failed':                 ['rate<0.01'],
    'compliance_list_latency':         ['p(95)<300'],
    'compliance_overview_latency':     ['p(95)<250'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.TOKEN || '';
const errorRate = new Rate('compliance_errors');
const listLatency = new Trend('compliance_list_latency', true);
const overviewLatency = new Trend('compliance_overview_latency', true);

const AUTH = { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } };

// 10 representative read endpoints across the 23 declared route bases.
// Selection criteria: listed in module.manifest.json routeBases AND
// expected to be high-traffic (per SLO.md §4 per-route targets).
const LIST_ENDPOINTS = [
  '/api/compliance',
  '/api/controls',
  '/api/frameworks',
  '/api/compliance-attestation',
  '/api/compliance-assertions',
  '/api/assessments',
  '/api/scoring-policies',
  '/api/compliance-obligations',
  '/api/ksa-regulatory-changes',
  '/api/ucf',
];

const OVERVIEW_ENDPOINT = '/api/compliance';
const HEALTH_ENDPOINT = '/api/compliance/healthz';

export default function () {
  // 1. Health probe (always must work)
  group('health', () => {
    const res = http.get(`${BASE}${HEALTH_ENDPOINT}`, AUTH);
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  // 2. Overview composite (most-trafficked endpoint)
  group('overview', () => {
    const res = http.get(`${BASE}${OVERVIEW_ENDPOINT}`, AUTH);
    overviewLatency.add(res.timings.duration);
    check(res, {
      'overview status 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    if (!(res.status >= 200 && res.status < 300)) errorRate.add(1);
  });

  // 3. List endpoints sweep
  for (const path of LIST_ENDPOINTS) {
    group(path, () => {
      const res = http.get(`${BASE}${path}`, AUTH);
      listLatency.add(res.timings.duration);
      const ok = check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
      });
      if (!ok) errorRate.add(1);
    });
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const m = data.metrics;
  const summary = {
    timestamp: new Date().toISOString(),
    base_url: BASE,
    p95_overall_ms: m['http_req_duration']?.values?.['p(95)'] ?? null,
    p99_overall_ms: m['http_req_duration']?.values?.['p(99)'] ?? null,
    p95_overview_ms: m['compliance_overview_latency']?.values?.['p(95)'] ?? null,
    p95_list_ms: m['compliance_list_latency']?.values?.['p(95)'] ?? null,
    error_rate: m['http_req_failed']?.values?.rate ?? null,
    iterations: m['iterations']?.values?.count ?? null,
    vus_max: m['vus_max']?.values?.value ?? null,
  };
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'modules/compliance/docs/load-baseline-latest.json': JSON.stringify(summary, null, 2),
  };
}
