// P9.Perf — Foundation F1 read-path p95 baseline.
//
// Usage:
//   BASE_URL=https://shahin-ai.com TOKEN=$(cat ~/.dos/token) \
//     k6 run modules/foundation/tests/perf/foundation-f1-baseline.k6.js
//
// Thresholds: p95 < 300ms for list endpoints, p99 < 600ms, <1% errors.

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
    'http_req_duration{phase:smoke}': ['p(95)<300', 'p(99)<600'],
    'http_req_duration{phase:load}':  ['p(95)<500', 'p(99)<1000'],
    'http_req_failed':                ['rate<0.01'],
    'foundation_list_latency':        ['p(95)<300'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || '';
const errorRate = new Rate('foundation_errors');
const listLatency = new Trend('foundation_list_latency', true);

const AUTH = { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } };

const LIST_ENDPOINTS = [
  '/api/organizations',
  '/api/business-units',
  '/api/positions',
  '/api/locations',
  '/api/committees',
  '/api/roles',
  '/api/teams',
  '/api/departments',
  '/api/invitations',
  '/api/audit-trail?limit=20',
  '/api/profiles/roles',
  '/api/access/my-permissions',
  '/api/access-review',
  '/api/delegations',
  '/api/foundation/dashboard',
];

export default function () {
  for (const path of LIST_ENDPOINTS) {
    group(path, () => {
      const res = http.get(`${BASE}${path}`, AUTH);
      listLatency.add(res.timings.duration);
      const ok = check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
        'has JSON body': (r) => r.body && r.body.length > 0,
      });
      errorRate.add(!ok);
    });
    sleep(0.1);
  }
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(
      {
        endpoints: LIST_ENDPOINTS.length,
        p95_ms: data.metrics.foundation_list_latency?.values?.['p(95)'],
        p99_ms: data.metrics.foundation_list_latency?.values?.['p(99)'],
        error_rate: data.metrics.foundation_errors?.values?.rate,
      },
      null,
      2,
    ),
  };
}
