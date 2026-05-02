import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionRegistry } from '../websocket/connection-registry';
import { LocalFanoutAdapter } from '../websocket/fanout';
import { createEventEnvelope } from '../websocket/types';

vi.mock('@dos/platform-core/observability', () => ({
  logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
  recordWsSendFailure: vi.fn(),
  recordWsSlowConsumer: vi.fn(),
}));

function mockWs(): any {
  const sent: string[] = [];
  return {
    readyState: 1,
    send: vi.fn((data: string, cb?: (err?: Error) => void) => {
      sent.push(data);
      if (cb) cb();
    }),
    close: vi.fn(),
    ping: vi.fn(),
    _sent: sent,
  };
}

describe('LocalFanoutAdapter', () => {
  let registry: ConnectionRegistry;
  let fanout: LocalFanoutAdapter;

  beforeEach(() => {
    registry = new ConnectionRegistry();
    fanout = new LocalFanoutAdapter(registry);
  });

  it('delivers to user connections', async () => {
    const ws = mockWs();
    registry.add('c1', ws, { tenantId: 't1', userId: 'u1' });

    const envelope = createEventEnvelope('test', { msg: 'hello' });
    await fanout.publish({ userId: 'u1', tenantId: 't1' }, envelope);

    expect(ws.send).toHaveBeenCalled();
  });

  it('delivers to tenant connections', async () => {
    const ws1 = mockWs();
    const ws2 = mockWs();
    registry.add('c1', ws1, { tenantId: 't1', userId: 'u1' });
    registry.add('c2', ws2, { tenantId: 't1', userId: 'u2' });

    const envelope = createEventEnvelope('test', { msg: 'broadcast' });
    await fanout.publish({ tenantId: 't1' }, envelope);

    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  it('does not deliver across tenants', async () => {
    const ws1 = mockWs();
    const ws2 = mockWs();
    registry.add('c1', ws1, { tenantId: 't1', userId: 'u1' });
    registry.add('c2', ws2, { tenantId: 't2', userId: 'u2' });

    const envelope = createEventEnvelope('test', { msg: 'isolated' });
    await fanout.publish({ userId: 'u1', tenantId: 't1' }, envelope);

    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).not.toHaveBeenCalled();
  });

  it('closes slow consumer when queue exceeds limit', async () => {
    const ws = mockWs();
    registry.add('c1', ws, { tenantId: 't1', userId: 'u1' });
    const conn = registry.get('c1')!;
    conn.info.queuedBytes = 65 * 1024;

    const envelope = createEventEnvelope('test', { msg: 'x' });
    await fanout.publish({ userId: 'u1', tenantId: 't1' }, envelope);

    expect(ws.close).toHaveBeenCalledWith(4008, 'Slow consumer');
  });

  it('does nothing for empty target', async () => {
    const envelope = createEventEnvelope('test', { msg: 'nowhere' });
    await fanout.publish({}, envelope);
  });

  it('reports healthy', () => {
    expect(fanout.healthy()).toBe(true);
  });

  it('calls subscribed handlers', async () => {
    const handler = vi.fn();
    fanout.subscribe(handler);

    const envelope = createEventEnvelope('test', {});
    await fanout.publish({ userId: 'u1' }, envelope);

    expect(handler).toHaveBeenCalledWith({ userId: 'u1' }, envelope);
  });

  it('shutdown clears handlers', async () => {
    const handler = vi.fn();
    fanout.subscribe(handler);
    await fanout.shutdown();

    const envelope = createEventEnvelope('test', {});
    await fanout.publish({ userId: 'u1' }, envelope);

    expect(handler).not.toHaveBeenCalled();
  });
});
