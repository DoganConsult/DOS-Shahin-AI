/**
 * Phase M0.5 — Agentic UI Interaction Layer runtime spec.
 *
 * Asserts:
 *   ① <dos-agent-status-strip> renders 9 distinct universal AgentStates
 *      (loading/empty/ready/thinking/running/waiting_approval/blocked/
 *      failed/completed) when state input flips.
 *   ② <dos-agent-action-approval-modal> emits `agent.action.requested`
 *      and never executes the action locally (no XHR/fetch from the
 *      component itself — host shell is the executor).
 *   ③ Mobile 390px reflow (Pixel 5 / iPhone 12 emulation) swaps Modal →
 *      BottomSheet behaviour and DataTable → card list, per the
 *      archetype mobile-reflow contract.
 *
 * Currently `describe.skip`d: agent.* component_keys are seeded in
 * dos.dynamic_ui_component_registry and mapped in component-map.ts, but
 * no SPA route mounts them yet — that wiring lands with M2 (unified
 * shell rewrite) + M3 (archetype mobile reflow A→K).
 *
 * Companion contract test (passes today, no DOM):
 *   tests/contract/agentic-ui-contract.test.ts
 */
import { test, expect, type Page } from '@playwright/test';

const STATES = [
  'loading','empty','ready','thinking','running',
  'waiting_approval','blocked','failed','completed',
];

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

// TODO(M2/M3): unskip once a host route mounts the agentic harness page.
test.describe.skip('M0.5 — agentic UI universal-state coverage', () => {
  for (const state of STATES) {
    test(`status-strip renders state="${state}"`, async ({ page }) => {
      await goto(page, `/dev/agentic-harness?state=${state}`);
      const strip = page.locator('dos-agent-status-strip');
      await expect(strip).toBeVisible();
      await expect(strip).toHaveAttribute('data-state', state);
    });
  }
});

// TODO(M2): unskip once approval flow is reachable via the host shell.
test.describe.skip('M0.5 — approval modal does NOT execute locally', () => {
  test('emits agent.action.requested and waits for host-shell decision', async ({ page }) => {
    const writeRequests: string[] = [];
    page.on('request', (r) => {
      if (['POST','PUT','PATCH','DELETE'].includes(r.method())) writeRequests.push(`${r.method()} ${r.url()}`);
    });

    const events: { key: string; payload: unknown }[] = [];
    await page.exposeFunction('__captureAgentEvent', (e: { key: string; payload: unknown }) => {
      events.push(e);
    });

    await goto(page, '/dev/agentic-harness?component=action-approval-modal');
    await page.locator('dos-agent-action-approval-modal button[data-cds-component="button"][data-kind="primary"]').click();

    expect(events.some((e) => e.key === 'agent.action.requested')).toBe(true);
    // No write traffic must originate from the modal itself.
    expect(writeRequests, `unexpected writes from modal: ${writeRequests.join(', ')}`).toEqual([]);
  });
});

test.use({ viewport: { width: 390, height: 844 } });

// TODO(M3): unskip when archetype mobile reflow is delivered.
test.describe.skip('M0.5 — mobile 390px reflow', () => { // -- justified: TODO(M3): archetype mobile reflow pending
  test('Modal → bottom-sheet, DataTable → card list', async ({ page }) => {
    await goto(page, '/dev/agentic-harness?component=task-queue');
    await expect(page.locator('dos-agent-task-queue')).toHaveAttribute('data-mobile', 'card-list');
    await goto(page, '/dev/agentic-harness?component=action-approval-modal&open=1');
    await expect(page.locator('dos-agent-action-approval-modal [data-mobile-mode]'))
      .toHaveAttribute('data-mobile-mode', 'bottom-sheet');
  });
});
