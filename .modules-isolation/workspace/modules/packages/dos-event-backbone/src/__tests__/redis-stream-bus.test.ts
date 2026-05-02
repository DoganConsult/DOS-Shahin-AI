import { describe, it, expect, vi, beforeEach } from 'vitest';

const xgroupMock = vi.fn();
const xreadgroupMock = vi.fn().mockResolvedValue(null);
const xaddMock = vi.fn().mockResolvedValue('1-0');

vi.mock('ioredis', () => {
  class MockRedis {
    connect = vi.fn();
    xadd = xaddMock;
    xgroup = xgroupMock;
    xreadgroup = xreadgroupMock;
    exists = vi.fn().mockResolvedValue(0);
    set = vi.fn();
    disconnect = vi.fn();
    quit = vi.fn();
  }
  return { default: MockRedis };
});

import { RedisStreamEventBus } from '../redis-stream-bus';
import type { BackboneLogger } from '../types';

beforeEach(() => {
  xgroupMock.mockReset();
  xreadgroupMock.mockReset().mockResolvedValue(null);
  xaddMock.mockReset().mockResolvedValue('1-0');
});

describe('RedisStreamEventBus', () => {
  it('constructs without error', () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    expect(bus).toBeDefined();
  });

  it('subscribe registers handler', () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    bus.subscribe('test.event', vi.fn());
    expect(bus).toBeDefined();
  });

  it('getMetrics returns counters', () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    const metrics = bus.getMetrics();
    expect(metrics).toHaveProperty('published');
    expect(metrics).toHaveProperty('consumed');
    expect(metrics).toHaveProperty('failed');
  });

  it('uses injected BackboneLogger when provided', () => {
    const captured: Array<{ level: string; msg: string; ctx?: unknown }> = [];
    const fakeLogger: BackboneLogger = {
      info: (msg, ctx) => captured.push({ level: 'info', msg, ctx }),
      warn: (msg, ctx) => captured.push({ level: 'warn', msg, ctx }),
      error: (msg, ctx) => captured.push({ level: 'error', msg, ctx }),
    };
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
      logger: fakeLogger,
    });
    expect(bus.getLogger()).toBe(fakeLogger);
  });

  it('publish reports non-BUSYGROUP xgroup CREATE failures via logger', async () => {
    const captured: Array<{ msg: string; ctx?: unknown }> = [];
    const fakeLogger: BackboneLogger = {
      info: () => {},
      warn: (msg, ctx) => captured.push({ msg, ctx }),
      error: () => {},
    };
    xgroupMock.mockRejectedValueOnce(new Error('NOAUTH Authentication required'));
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
      logger: fakeLogger,
    });
    await bus.publish('test.event', { foo: 'bar' });
    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(captured[0].msg).toMatch(/xgroup CREATE failed/);
    expect(xaddMock).toHaveBeenCalled();
  });

  it('publish stays silent on BUSYGROUP (group already exists)', async () => {
    const captured: Array<{ level: string }> = [];
    const fakeLogger: BackboneLogger = {
      info: () => captured.push({ level: 'info' }),
      warn: () => captured.push({ level: 'warn' }),
      error: () => captured.push({ level: 'error' }),
    };
    xgroupMock.mockRejectedValueOnce(new Error("BUSYGROUP Consumer Group name already exists"));
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
      logger: fakeLogger,
    });
    await bus.publish('test.event', { foo: 'bar' });
    expect(captured.length).toBe(0);
    expect(xaddMock).toHaveBeenCalled();
  });

  it('startConsuming creates a group for every registered subscription', async () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    bus.subscribe('a.evt', vi.fn());
    bus.subscribe('b.evt', vi.fn());
    bus.subscribe('c.evt', vi.fn());
    xgroupMock.mockResolvedValue('OK');
    // Stop the consume loop right after the initial ensureConsumerGroups pass
    xreadgroupMock.mockImplementation(async () => {
      await bus.stopConsuming();
      return null;
    });
    await bus.startConsuming();
    const createdStreams = xgroupMock.mock.calls.map(c => c[1]);
    expect(createdStreams).toEqual(
      expect.arrayContaining(['events:a.evt', 'events:b.evt', 'events:c.evt']),
    );
  });

  it('on NOGROUP it re-runs ensureConsumerGroups before retrying', async () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
      retryDelayMs: 1,
    });
    bus.subscribe('repair.evt', vi.fn());
    xgroupMock.mockResolvedValue('OK');
    let nogroupSeen = false;
    xreadgroupMock.mockImplementation(async () => {
      if (!nogroupSeen) {
        nogroupSeen = true;
        throw new Error("NOGROUP No such key 'events:repair.evt' or consumer group 'test-svc'");
      }
      await bus.stopConsuming();
      return null;
    });
    await bus.startConsuming();
    // Initial pass + post-NOGROUP self-heal => xgroup CREATE called at least twice for the stream.
    const callsForStream = xgroupMock.mock.calls.filter(c => c[1] === 'events:repair.evt');
    expect(callsForStream.length).toBeGreaterThanOrEqual(2);
  });
});
