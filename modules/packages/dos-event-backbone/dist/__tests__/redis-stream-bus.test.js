"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const xgroupMock = vitest_1.vi.fn();
const xreadgroupMock = vitest_1.vi.fn().mockResolvedValue(null);
const xaddMock = vitest_1.vi.fn().mockResolvedValue('1-0');
vitest_1.vi.mock('ioredis', () => {
    class MockRedis {
        connect = vitest_1.vi.fn();
        xadd = xaddMock;
        xgroup = xgroupMock;
        xreadgroup = xreadgroupMock;
        exists = vitest_1.vi.fn().mockResolvedValue(0);
        set = vitest_1.vi.fn();
        disconnect = vitest_1.vi.fn();
        quit = vitest_1.vi.fn();
    }
    return { default: MockRedis };
});
const redis_stream_bus_1 = require("../redis-stream-bus");
(0, vitest_1.beforeEach)(() => {
    xgroupMock.mockReset();
    xreadgroupMock.mockReset().mockResolvedValue(null);
    xaddMock.mockReset().mockResolvedValue('1-0');
});
(0, vitest_1.describe)('RedisStreamEventBus', () => {
    (0, vitest_1.it)('constructs without error', () => {
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
        });
        (0, vitest_1.expect)(bus).toBeDefined();
    });
    (0, vitest_1.it)('subscribe registers handler', () => {
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
        });
        bus.subscribe('test.event', vitest_1.vi.fn());
        (0, vitest_1.expect)(bus).toBeDefined();
    });
    (0, vitest_1.it)('getMetrics returns counters', () => {
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
        });
        const metrics = bus.getMetrics();
        (0, vitest_1.expect)(metrics).toHaveProperty('published');
        (0, vitest_1.expect)(metrics).toHaveProperty('consumed');
        (0, vitest_1.expect)(metrics).toHaveProperty('failed');
    });
    (0, vitest_1.it)('uses injected BackboneLogger when provided', () => {
        const captured = [];
        const fakeLogger = {
            info: (msg, ctx) => captured.push({ level: 'info', msg, ctx }),
            warn: (msg, ctx) => captured.push({ level: 'warn', msg, ctx }),
            error: (msg, ctx) => captured.push({ level: 'error', msg, ctx }),
        };
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
            logger: fakeLogger,
        });
        (0, vitest_1.expect)(bus.getLogger()).toBe(fakeLogger);
    });
    (0, vitest_1.it)('publish reports non-BUSYGROUP xgroup CREATE failures via logger', async () => {
        const captured = [];
        const fakeLogger = {
            info: () => { },
            warn: (msg, ctx) => captured.push({ msg, ctx }),
            error: () => { },
        };
        xgroupMock.mockRejectedValueOnce(new Error('NOAUTH Authentication required'));
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
            logger: fakeLogger,
        });
        await bus.publish('test.event', { foo: 'bar' });
        (0, vitest_1.expect)(captured.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(captured[0].msg).toMatch(/xgroup CREATE failed/);
        (0, vitest_1.expect)(xaddMock).toHaveBeenCalled();
    });
    (0, vitest_1.it)('publish stays silent on BUSYGROUP (group already exists)', async () => {
        const captured = [];
        const fakeLogger = {
            info: () => captured.push({ level: 'info' }),
            warn: () => captured.push({ level: 'warn' }),
            error: () => captured.push({ level: 'error' }),
        };
        xgroupMock.mockRejectedValueOnce(new Error("BUSYGROUP Consumer Group name already exists"));
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
            logger: fakeLogger,
        });
        await bus.publish('test.event', { foo: 'bar' });
        (0, vitest_1.expect)(captured.length).toBe(0);
        (0, vitest_1.expect)(xaddMock).toHaveBeenCalled();
    });
    (0, vitest_1.it)('startConsuming creates a group for every registered subscription', async () => {
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
        });
        bus.subscribe('a.evt', vitest_1.vi.fn());
        bus.subscribe('b.evt', vitest_1.vi.fn());
        bus.subscribe('c.evt', vitest_1.vi.fn());
        xgroupMock.mockResolvedValue('OK');
        // Stop the consume loop right after the initial ensureConsumerGroups pass
        xreadgroupMock.mockImplementation(async () => {
            await bus.stopConsuming();
            return null;
        });
        await bus.startConsuming();
        const createdStreams = xgroupMock.mock.calls.map(c => c[1]);
        (0, vitest_1.expect)(createdStreams).toEqual(vitest_1.expect.arrayContaining(['events:a.evt', 'events:b.evt', 'events:c.evt']));
    });
    (0, vitest_1.it)('on NOGROUP it re-runs ensureConsumerGroups before retrying', async () => {
        const bus = new redis_stream_bus_1.RedisStreamEventBus({
            redisUrl: 'redis://localhost:6379',
            serviceCode: 'test-svc',
            retryDelayMs: 1,
        });
        bus.subscribe('repair.evt', vitest_1.vi.fn());
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
        (0, vitest_1.expect)(callsForStream.length).toBeGreaterThanOrEqual(2);
    });
});
//# sourceMappingURL=redis-stream-bus.test.js.map