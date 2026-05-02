import { defineConfig } from 'k6/execution';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 150 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '60m',
      tags: { test_type: 'soak' },
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 0 },
        { duration: '1m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
    http_req_connecting: ['p(99)<200'],
    http_req_tls_handshaking: ['p(99)<200'],
  },
};

export const testScenarios = {
  foundation: {
    endpoints: [
      '/api/users',
      '/api/organizations',
      '/api/business-units',
      '/api/teams',
      '/api/roles',
      '/api/permissions',
      '/api/workspaces',
    ],
  },
  governance: {
    endpoints: [
      '/api/policies',
      '/api/governance/structures',
      '/api/governance/raci',
      '/api/committees',
      '/api/decisions',
    ],
  },
  risk: {
    endpoints: [
      '/api/risks',
      '/api/risk-assessments',
      '/api/risk-scoring',
      '/api/risk-metrics',
    ],
  },
  compliance: {
    endpoints: [
      '/api/compliance/controls',
      '/api/compliance/frameworks',
      '/api/compliance/assessments',
      '/api/compliance/exceptions',
    ],
  },
  audit: {
    endpoints: [
      '/api/audits',
      '/api/audit-findings',
      '/api/audit-evidence',
      '/api/audit-reports',
    ],
  },
};

export const performanceBenchmarks = {
  responseTime: {
    p50: 100,
    p95: 500,
    p99: 1000,
  },
  throughput: {
    requestsPerSecond: 100,
    concurrentUsers: 200,
  },
  resourceUtilization: {
    cpuPercent: 70,
    memoryMB: 512,
  },
};
