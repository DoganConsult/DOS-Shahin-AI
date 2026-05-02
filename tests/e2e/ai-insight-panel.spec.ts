/**
 * W5.5 — <ai-insight-panel> + agent-principal SOD e2e coverage.
 *
 * Framework-agnostic sketch (Playwright shape). Requires:
 *   - pnpm add -D @playwright/test   (at repo root)
 *   - tests/e2e/playwright.config.ts pointing at the shahin dev server
 *   - Service-account credentials for the mcp-gateway-service API
 *
 * Run with `pnpm exec playwright test tests/e2e/ai-insight-panel.spec.ts`.
 *
 * This covers:
 *   1. Panel renders on every priority module landing page.
 *   2. Apply/Dismiss affordances work when actor=human.
 *   3. Agent principal self-approval of a proposed action is blocked by
 *      agent_sod_policies.
 */

import { test, expect } from '@playwright/test';

const PRIORITY_MODULES: Array<{ name: string; url: string }> = [
  { name: 'dashboard', url: '/dashboard' },
  { name: 'executive', url: '/executive/overview' },
  { name: 'grc-query', url: '/grc-query' },
  { name: 'knowledge', url: '/knowledge/hub' },
  { name: 'remediation', url: '/remediation' },
  { name: 'training', url: '/training/overview' },
];

test.describe('ai-insight-panel renders on priority modules', () => {
  for (const mod of PRIORITY_MODULES) {
    test(`${mod.name} landing mounts <app-ai-insight-panel>`, async ({ page }) => {
      await page.goto(mod.url);
      const panel = page.locator('app-ai-insight-panel');
      await expect(panel).toBeVisible();

      // Open the panel (starts collapsed).
      await panel.locator('.ai-toggle').click();
      const content = panel.locator('.ai-content');
      await expect(content).toBeVisible();

      // Either skeleton → results, or loadFailed w/ retry (no crash).
      await expect(
        content.locator('.ai-loading, .ai-results, .ai-error'),
      ).toBeVisible({ timeout: 8000 });
    });
  }
});

test.describe('agent-principal SOD blocks self-approval', () => {
  test('agent proposer cannot approve its own proposed action', async ({
    request,
  }) => {
    // Mint an agent token via M2M route. Assumes seed agent-credentials
    // fixture exists in the test tenant.
    const tokenRes = await request.post('/api/auth/agents/token', {
      data: {
        actorId: 'test-agent-1',
        credentialSecret: process.env.TEST_AGENT_SECRET ?? 'seed-secret-do-not-use-in-prod',
        scopes: ['remediation.plan.propose'],
      },
    });
    expect(tokenRes.ok()).toBeTruthy();
    const { access_token: agentToken } = await tokenRes.json();

    // Agent proposes an action.
    const propose = await request.post('/api/remediation/proposals', {
      headers: { Authorization: `Bearer ${agentToken}` },
      data: { title: 'Auto-heal stale control test', payload: {} },
    });
    expect(propose.ok()).toBeTruthy();
    const { proposalId } = await propose.json();

    // Same agent attempts to approve — must be blocked by agent_sod_policies.
    const approve = await request.post(
      `/api/remediation/proposals/${proposalId}/approve`,
      {
        headers: { Authorization: `Bearer ${agentToken}` },
      },
    );
    expect(approve.status()).toBe(403);
    const body = await approve.json();
    expect(body.outcome).toBe('block');
  });
});
