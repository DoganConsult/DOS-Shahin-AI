import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('ws', async () => {
  const { EventEmitter } = await import('node:events');
  class MockWebSocketServer extends EventEmitter {
    handleUpgrade = vi.fn((_req: any, _socket: any, _head: any, cb: any) => {
      const ws = new MockWebSocket();
      cb(ws);
    });
    close = vi.fn();
  }
  class MockWebSocket extends EventEmitter {
    static OPEN = 1;
    readyState = 1;
    send = vi.fn((_data: string, cb?: (err?: Error) => void) => { if (cb) cb(); });
    close = vi.fn();
    ping = vi.fn();
  }
  return { WebSocketServer: MockWebSocketServer, WebSocket: MockWebSocket };
});

vi.mock('@dos/dauth-shared', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  initWsMetrics: vi.fn(),
  recordWsConnect: vi.fn(),
  setWsActiveConnections: vi.fn(),
  recordWsDisconnect: vi.fn(),
  recordWsSendFailure: vi.fn(),
  recordWsInbound: vi.fn(),
  recordWsRateLimited: vi.fn(),
}));

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
}));

import { EventEmitter } from 'node:events';
import { NotificationWsServer } from '../websocket/ws-server';
import { wsMetrics } from '../websocket/ws-metrics';

function resetMetrics() {
  for (const k of Object.keys(wsMetrics) as Array<keyof typeof wsMetrics>) {
    wsMetrics[k] = 0;
  }
}

function createMockHttpServer() {
  return new EventEmitter() as any;
}

function createMockSocket() {
  return {
    destroy: vi.fn(),
    write: vi.fn(),
    remoteAddress: '127.0.0.1',
  };
}

function createMockReq(opts: { url?: string; origin?: string; token?: string } = {}) {
  const url = opts.url ?? `/ws${opts.token ? `?token=${opts.token}` : ''}`;
  return {
    url,
    headers: { host: 'localhost', origin: opts.origin },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

describe('NotificationWsServer', () => {
  let wsServer: NotificationWsServer;

  beforeEach(() => {
    vi.useFakeTimers();
    resetMetrics();
    vi.clearAllMocks();
    wsServer = new NotificationWsServer();
  });

  afterEach(async () => {
    const p = wsServer.shutdown();
    await vi.advanceTimersByTimeAsync(15_000);
    await p;
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('creates server without redis', () => {
      expect(wsServer).toBeDefined();
      expect(wsServer.fanoutHealthy()).toBe(true);
    });
  });

  describe('attach', () => {
    it('attaches to HTTP server and listens for upgrade', () => {
      const httpServer = createMockHttpServer();
      wsServer.attach(httpServer);
      expect(httpServer.listenerCount('upgrade')).toBe(1);
    });
  });

  describe('upgrade handling', () => {
    it('destroys socket for non-/ws paths', () => {
      const httpServer = createMockHttpServer();
      wsServer.attach(httpServer);
      const socket = createMockSocket();
      httpServer.emit('upgrade', createMockReq({ url: '/other' }), socket, Buffer.alloc(0));
      expect(socket.destroy).toHaveBeenCalled();
    });

    it('rejects invalid origin', () => {
      const httpServer = createMockHttpServer();
      wsServer.attach(httpServer);
      const socket = createMockSocket();
      httpServer.emit('upgrade', createMockReq({ url: '/ws', origin: 'https://evil.com' }), socket, Buffer.alloc(0));
      expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 403 Forbidden\r\n\r\n');
      expect(socket.destroy).toHaveBeenCalled();
    });

    it('allows request with no origin header', () => {
      const httpServer = createMockHttpServer();
      wsServer.attach(httpServer);
      const socket = createMockSocket();
      httpServer.emit('upgrade', createMockReq({ url: '/ws', token: 'test' }), socket, Buffer.alloc(0));
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it('allows request with valid origin', () => {
      const httpServer = createMockHttpServer();
      wsServer.attach(httpServer);
      const socket = createMockSocket();
      httpServer.emit('upgrade', createMockReq({ url: '/ws', origin: 'https://shahin-ai.com', token: 'test' }), socket, Buffer.alloc(0));
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it('rejects connections when draining', async () => {
      const httpServer = createMockHttpServer();
      wsServer.attach(httpServer);
      const shutdownPromise = wsServer.shutdown();
      expect(wsServer.isDraining()).toBe(true);
      const socket = createMockSocket();
      httpServer.emit('upgrade', createMockReq({ url: '/ws', token: 'test' }), socket, Buffer.alloc(0));
      expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      await vi.advanceTimersByTimeAsync(15_000);
      await shutdownPromise;
    });
  });

  describe('getMetrics', () => {
    it('returns comprehensive metrics snapshot', () => {
      const m = wsServer.getMetrics();
      expect(m).toHaveProperty('users');
      expect(m).toHaveProperty('tenants');
      expect(m).toHaveProperty('draining');
      expect(m).toHaveProperty('fanoutHealthy');
      expect(m).toHaveProperty('staleConnections');
      expect(m.draining).toBe(false);
    });
  });

  describe('sendToUser', () => {
    it('does not throw for unknown user', async () => {
      const envelope = { type: 'test', data: {}, timestamp: new Date().toISOString() };
      await expect(wsServer.sendToUser('unknown', 'unknown', envelope)).resolves.not.toThrow();
    });
  });

  describe('sendToTenant', () => {
    it('does not throw for unknown tenant', async () => {
      const envelope = { type: 'test', data: {}, timestamp: new Date().toISOString() };
      await expect(wsServer.sendToTenant('unknown', envelope)).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('sets draining flag', async () => {
      expect(wsServer.isDraining()).toBe(false);
      const p = wsServer.shutdown();
      expect(wsServer.isDraining()).toBe(true);
      await vi.advanceTimersByTimeAsync(15_000);
      await p;
    });
  });
});
