import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeFile = resolve(process.cwd(), '../../../products/shahin-ai/app/src/app/app.routes.ts');

const publicRoutes = ['/', '/login'] as const;
const protectedRoutes = [
  '/workspace-home',
  '/foundation/delegations',
  '/compliance/overview',
  '/risk/register',
] as const;

test('product route table uses one clean workspace wildcard path', async () => {
  const source = readFileSync(routeFile, 'utf8');

  expect(source).toContain("path: 'platform-admin'");
  expect(source).toContain("path: 'login'");
  expect(source).toContain("path: 'register'");
  expect(source).toContain('MARKETING_PUBLIC_ROUTES');
  expect(source).toContain('workspaceShellGuard');
  expect(source).toContain("path: '**'");

  expect(source).not.toContain('complianceRouteChildren');
  expect(source).not.toContain('buildChildRoutes');
  expect(source).not.toContain('dnaModuleRoutes');
  expect(source).not.toContain('foundationGuard');
  expect(source).not.toContain("path: 'foundation'");
  expect(source).not.toContain("path: 'compliance'");
  expect(source).not.toContain("path: 'risk'");
  expect(source).not.toContain('@compliance-module');
  expect(source).not.toContain('@shahin-ai/shared-risk-types');
});

for (const route of publicRoutes) {
  test(`public route remains reachable: ${route}`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/text\/html/i);
  });
}

for (const route of protectedRoutes) {
  test(`protected dynamic route is served by the SPA shell path: ${route}`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/text\/html/i);
  });
}
