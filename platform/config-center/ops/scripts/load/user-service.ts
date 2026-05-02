// k6 load test for user-service.
//
// Run: k6 run ops/scripts/load/user-service.ts
//
// SLO targets:
//   GET  /api/users/me           p95 ≤  50 ms
//   GET  /api/users              p95 ≤ 100 ms (read mix)
//   PUT  /api/users/:id          p95 ≤ 250 ms
//   POST /api/teams/:id/members  p95 ≤ 300 ms
//   500 RPS sustained for 5 min on the read mix, error rate < 0.1%
//
// Env vars:
//   USER_SVC_URL        base URL (default http://localhost:3002)
//   TENANT_ID           tenant to exercise (required)
//   AUTH_TOKEN          bearer token with admin-level scope (required)
//   USER_IDS_CSV        comma-separated user IDs within the tenant (required)

// @ts-expect-error - k6 provides these globals
import http from 'k6/http';
// @ts-expect-error - k6 globals
import { check, sleep } from 'k6';
// @ts-expect-error - k6 globals
import { SharedArray } from 'k6/data';
// @ts-expect-error - k6 globals
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.USER_SVC_URL || 'http://localhost:3002';
const TENANT_ID = __ENV.TENANT_ID || '';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const USER_IDS = (__ENV.USER_IDS_CSV || '').split(',').filter(Boolean);

const meLatency   = new Trend('user_service_get_me_ms');
const listLatency = new Trend('user_service_list_users_ms');
const putLatency  = new Trend('user_service_put_user_ms');
const errorRate   = new Rate('user_service_error_rate');

export const options = {
  scenarios: {
    read_mix: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 400,
      exec: 'readMix',
    },
    write_trickle: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 80,
      exec: 'writeMix',
      startTime: '30s',
    },
  },
  thresholds: {
    user_service_get_me_ms:    ['p(95)<50'],
    user_service_list_users_ms:['p(95)<100'],
    user_service_put_user_ms:  ['p(95)<250'],
    user_service_error_rate:   ['rate<0.001'],
  },
};

function headers() {
  return {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'X-Tenant-Id': TENANT_ID,
    'Content-Type': 'application/json',
  };
}

function randomUserId(): string {
  return USER_IDS[Math.floor(Math.random() * USER_IDS.length)] || 'missing';
}

export function readMix() {
  const r1 = http.get(`${BASE_URL}/api/users/me`, { headers: headers() });
  meLatency.add(r1.timings.duration);
  errorRate.add(r1.status >= 400);
  check(r1, { 'me 200': (r: { status: number }) => r.status === 200 });

  const r2 = http.get(`${BASE_URL}/api/users?page=1&pageSize=25`, { headers: headers() });
  listLatency.add(r2.timings.duration);
  errorRate.add(r2.status >= 400);
  check(r2, { 'list 200': (r: { status: number }) => r.status === 200 });

  sleep(0.1);
}

export function writeMix() {
  const id = randomUserId();
  const r = http.put(
    `${BASE_URL}/api/users/${id}`,
    JSON.stringify({ display_name: `Load ${Date.now()}` }),
    { headers: headers() },
  );
  putLatency.add(r.timings.duration);
  errorRate.add(r.status >= 400 && r.status !== 404);
  check(r, { 'put accepted': (res: { status: number }) => res.status === 200 || res.status === 404 });
  sleep(0.5);
}
