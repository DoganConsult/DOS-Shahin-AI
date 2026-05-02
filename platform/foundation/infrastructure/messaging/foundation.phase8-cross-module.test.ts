/**
 * Phase 8 — foundation subscribers for team.member_{added,removed} (F-070/F-071)
 * and onboarding.completed (F-072).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getSubscriptionHandlers } from './foundation.subscribers';

describe('Phase 8 foundation cross-module subscribers', () => {
  it('registers team.member_added handler (F-070)', () => {
    expect(getSubscriptionHandlers().has('team.member_added')).toBe(true);
  });

  it('registers team.member_removed handler (F-071)', () => {
    expect(getSubscriptionHandlers().has('team.member_removed')).toBe(true);
  });

  it('registers onboarding.completed handler (F-072)', () => {
    expect(getSubscriptionHandlers().has('onboarding.completed')).toBe(true);
  });

  it('team.member_added handler is no-op without required fields', async () => {
    const h = getSubscriptionHandlers().get('team.member_added')!;
    await expect(h({})).resolves.toBeUndefined();
    await expect(h({ tenantId: 't_1' })).resolves.toBeUndefined();
  });

  it('team.member_added handler succeeds with tenant + team + user', async () => {
    const h = getSubscriptionHandlers().get('team.member_added')!;
    await expect(
      h({ tenantId: 't_1', teamId: 'tm_1', userId: 'u_1' }),
    ).resolves.toBeUndefined();
  });

  it('team.member_removed handler is no-op without required fields', async () => {
    const h = getSubscriptionHandlers().get('team.member_removed')!;
    await expect(h({ tenantId: 't_1' })).resolves.toBeUndefined();
  });

  it('onboarding.completed handler is no-op without tenantId', async () => {
    const h = getSubscriptionHandlers().get('onboarding.completed')!;
    await expect(h({})).resolves.toBeUndefined();
  });

  it('onboarding.completed handler succeeds with tenantId', async () => {
    const h = getSubscriptionHandlers().get('onboarding.completed')!;
    await expect(h({ tenantId: 't_1' })).resolves.toBeUndefined();
  });
});
