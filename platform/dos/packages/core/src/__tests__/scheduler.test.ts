import { describe, expect, it, vi } from 'vitest';
import {
  cronMatches,
  runSchedulerTick,
  InMemoryScheduledJobsRepository,
  createDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
  type JobHandler,
  type ScheduledJobRow,
} from '..';

describe('cronMatches — minimal 5-field evaluator', () => {
  it('matches "* * * * *" every minute', () => {
    expect(cronMatches('* * * * *', new Date(Date.UTC(2026, 0, 1, 12, 30)))).toBe(true);
  });

  it('matches "0 * * * *" only on the hour', () => {
    expect(cronMatches('0 * * * *', new Date(Date.UTC(2026, 0, 1, 12, 0)))).toBe(true);
    expect(cronMatches('0 * * * *', new Date(Date.UTC(2026, 0, 1, 12, 1)))).toBe(false);
  });

  it('matches "*/5 * * * *" every 5 minutes', () => {
    expect(cronMatches('*/5 * * * *', new Date(Date.UTC(2026, 0, 1, 0, 0)))).toBe(true);
    expect(cronMatches('*/5 * * * *', new Date(Date.UTC(2026, 0, 1, 0, 5)))).toBe(true);
    expect(cronMatches('*/5 * * * *', new Date(Date.UTC(2026, 0, 1, 0, 7)))).toBe(false);
  });

  it('matches ranges and lists', () => {
    expect(cronMatches('0 9-17 * * 1-5', new Date(Date.UTC(2026, 0, 5, 12, 0)))).toBe(true); // Monday noon
    expect(cronMatches('0 9-17 * * 1-5', new Date(Date.UTC(2026, 0, 3, 12, 0)))).toBe(false); // Saturday noon
    expect(cronMatches('0 0 1,15 * *', new Date(Date.UTC(2026, 0, 1, 0, 0)))).toBe(true);
    expect(cronMatches('0 0 1,15 * *', new Date(Date.UTC(2026, 0, 15, 0, 0)))).toBe(true);
    expect(cronMatches('0 0 1,15 * *', new Date(Date.UTC(2026, 0, 10, 0, 0)))).toBe(false);
  });

  it('rejects malformed expressions', () => {
    expect(cronMatches('not a cron', new Date())).toBe(false);
    expect(cronMatches('* * * *', new Date())).toBe(false);   // 4 fields
    expect(cronMatches('', new Date())).toBe(false);
  });
});

function buildPort() {
  return createDOSPort({
    tenants: new InMemoryTenantsRepository(),
    modules: new InMemoryModulesRepository(),
    products: new InMemoryProductsRepository(),
    events: new InMemoryEventsLogRepository(),
    backbonePublisher: { publish: async () => {} },
    backboneSubscriber: { subscribe: () => {} },
  });
}

describe('runSchedulerTick', () => {
  it('fires a handler for a due row + marks it triggered', async () => {
    const repo = new InMemoryScheduledJobsRepository();
    const port = buildPort();
    await repo.insertForTest({
      jobId: 'j-1', tenantId: 't-1', name: 'nightly',
      cronExpression: '* * * * *', status: 'active', lastTriggeredAt: null,
    });
    const handler: JobHandler = vi.fn(async () => {});
    const handlers = new Map<string, JobHandler>();
    handlers.set('nightly', handler);

    const r = await runSchedulerTick({ repo, port, handlers }, new Date(Date.UTC(2026, 0, 1, 12, 0)));
    expect(r.fired).toBe(1);
    expect(r.failed).toBe(0);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire the same row twice in the same minute (debounce)', async () => {
    const repo = new InMemoryScheduledJobsRepository();
    const port = buildPort();
    const t = new Date(Date.UTC(2026, 0, 1, 12, 0));
    await repo.insertForTest({
      jobId: 'j-1', tenantId: 't-1', name: 'nightly',
      cronExpression: '* * * * *', status: 'active', lastTriggeredAt: null,
    });
    const handler: JobHandler = vi.fn(async () => {});
    const handlers = new Map([['nightly', handler]]);

    await runSchedulerTick({ repo, port, handlers }, t);
    await runSchedulerTick({ repo, port, handlers }, t);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('marks a failing handler as failed + publishes dos.job.failed', async () => {
    const repo = new InMemoryScheduledJobsRepository();
    const port = buildPort();
    const publishSpy = vi.spyOn(port, 'publishEvent');
    await repo.insertForTest({
      jobId: 'j-2', tenantId: 't-1', name: 'broken',
      cronExpression: '* * * * *', status: 'active', lastTriggeredAt: null,
    });
    const handler: JobHandler = vi.fn(async () => { throw new Error('boom'); });
    const handlers = new Map([['broken', handler]]);

    const r = await runSchedulerTick({ repo, port, handlers }, new Date());
    expect(r.failed).toBe(1);
    expect(r.fired).toBe(0);
    expect(publishSpy.mock.calls.some((c) => (c[0] as any).eventType === 'dos.job.failed')).toBe(true);
  });

  it('skips rows whose cron does not match', async () => {
    const repo = new InMemoryScheduledJobsRepository();
    const port = buildPort();
    await repo.insertForTest({
      jobId: 'j-3', tenantId: 't-1', name: 'weekly',
      cronExpression: '0 0 * * 0', status: 'active', lastTriggeredAt: null, // Sundays at 00:00
    });
    const handler: JobHandler = vi.fn(async () => {});
    const handlers = new Map([['weekly', handler]]);

    const r = await runSchedulerTick({ repo, port, handlers }, new Date(Date.UTC(2026, 0, 5, 12, 0))); // Monday noon
    expect(r.fired).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('leaves rows without a registered handler inert (does not fire or fail)', async () => {
    const repo = new InMemoryScheduledJobsRepository();
    const port = buildPort();
    await repo.insertForTest({
      jobId: 'j-4', tenantId: 't-1', name: 'mystery',
      cronExpression: '* * * * *', status: 'active', lastTriggeredAt: null,
    });
    const r = await runSchedulerTick({ repo, port, handlers: new Map() }, new Date());
    expect(r.fired).toBe(0);
    expect(r.failed).toBe(0);
  });
});
