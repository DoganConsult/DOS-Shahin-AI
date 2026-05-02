import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

const WS_MODULE_FILES = [
  'services/notification-service/src/websocket/ws-server.ts',
  'services/notification-service/src/websocket/types.ts',
  'services/notification-service/src/websocket/connection-registry.ts',
  'services/notification-service/src/websocket/fanout.ts',
  'services/notification-service/src/websocket/ws-metrics.ts',
];

describe('WebSocket Contracts', () => {
  it('all WebSocket module files exist', () => {
    for (const f of WS_MODULE_FILES) {
      expect(fileExists(f), `${f} should exist`).toBe(true);
    }
  });

  it('types.ts exports required event type constants', () => {
    const src = readFile('services/notification-service/src/websocket/types.ts');
    expect(src).toContain('system.connected');
    expect(src).toContain('system.ping');
    expect(src).toContain('notification.created');
    expect(src).toContain('notification.unread_count.updated');
  });

  it('types.ts exports WsEventEnvelope with required shape', () => {
    const src = readFile('services/notification-service/src/websocket/types.ts');
    expect(src).toMatch(/export interface WsEventEnvelope/);
    expect(src).toContain('type: string');
    expect(src).toContain('timestamp: string');
  });

  it('types.ts exports WsAuthContext with tenantId and userId', () => {
    const src = readFile('services/notification-service/src/websocket/types.ts');
    expect(src).toMatch(/export interface WsAuthContext/);
    expect(src).toContain('tenantId: string');
    expect(src).toContain('userId: string');
  });

  it('ws-server.ts authenticates via verifyToken', () => {
    const src = readFile('services/notification-service/src/websocket/ws-server.ts');
    expect(src).toContain("import { verifyToken } from '@dos/dauth-shared'");
    expect(src).toContain('verifyToken(token)');
  });

  it('ws-server.ts checks token blacklist', () => {
    const src = readFile('services/notification-service/src/websocket/ws-server.ts');
    expect(src).toContain('isTokenBlacklisted');
    expect(src).toContain('token_blacklist');
  });

  it('ws-server.ts enforces per-tenant connection limit', () => {
    const src = readFile('services/notification-service/src/websocket/ws-server.ts');
    expect(src).toContain('isTenantAtLimit');
    expect(src).toContain('4003');
  });

  it('ws-server.ts implements heartbeat and stale cleanup', () => {
    const src = readFile('services/notification-service/src/websocket/ws-server.ts');
    expect(src).toContain('HEARTBEAT_INTERVAL_MS');
    expect(src).toContain('STALE_TIMEOUT_MS');
    expect(src).toContain('ws.ping()');
  });

  it('ws-server.ts enforces rate limiting', () => {
    const src = readFile('services/notification-service/src/websocket/ws-server.ts');
    expect(src).toContain('MAX_INBOUND_PER_MINUTE');
    expect(src).toContain('checkRate');
  });

  it('ws-server.ts imports real Prometheus metrics (not noops)', () => {
    const src = readFile('services/notification-service/src/websocket/ws-server.ts');
    expect(src).toMatch(/import\s*\{[^}]*initWsMetrics[^}]*\}\s*from\s*'@dos\/platform-core\/observability'/);
    expect(src).not.toContain('const initWsMetrics = noop');
  });

  it('fanout.ts imports real Prometheus metrics (not noops)', () => {
    const src = readFile('services/notification-service/src/websocket/fanout.ts');
    expect(src).toMatch(/import\s*\{[^}]*recordWsSendFailure[^}]*\}\s*from\s*'@dos\/platform-core\/observability'/);
    expect(src).not.toContain('const recordWsSendFailure = noop');
  });

  it('fanout.ts implements slow consumer close policy', () => {
    const src = readFile('services/notification-service/src/websocket/fanout.ts');
    expect(src).toContain('MAX_QUEUED_BYTES');
    expect(src).toContain('4008');
    expect(src).toContain('Slow consumer');
  });

  it('fanout.ts has both Local and Redis adapters', () => {
    const src = readFile('services/notification-service/src/websocket/fanout.ts');
    expect(src).toContain('class LocalFanoutAdapter');
    expect(src).toContain('class RedisFanoutAdapter');
    expect(src).toMatch(/healthy\(\).*boolean/);
  });

  it('connection-registry.ts has per-tenant limit enforcement', () => {
    const src = readFile('services/notification-service/src/websocket/connection-registry.ts');
    expect(src).toContain('maxPerTenant');
    expect(src).toContain('isTenantAtLimit');
    expect(src).toContain('DEFAULT_MAX_CONNECTIONS_PER_TENANT');
  });

  it('notification-service server.ts wires WS server to HTTP server', () => {
    const src = readFile('services/notification-service/src/server.ts');
    expect(src).toContain('NotificationWsServer');
    expect(src).toContain('wsServer.attach(httpServer)');
  });

  it('notification-service server.ts subscribes to notification.created for WS fanout', () => {
    const src = readFile('services/notification-service/src/server.ts');
    expect(src).toContain("eventBus.subscribe('notification.created'");
    expect(src).toContain('sendToUser');
  });

  it('nginx config has /ws location blocks for all server blocks', () => {
    const nginx = readFile('platform/config-center/ops/nginx/dos-platform.conf');
    const wsBlocks = nginx.match(/location \/ws\s*\{/g);
    expect(wsBlocks, 'should have /ws location blocks').not.toBeNull();
    expect(wsBlocks!.length, 'should have /ws location blocks').toBeGreaterThanOrEqual(1);
    expect(nginx).toContain('proxy_pass http://notification_service');
    expect(nginx).toMatch(/proxy_read_timeout\s+3600s/);
  });

  it('frontend WS service has reconnected$ subject', () => {
    const src = readFile('platform/runtime/websocket/websocket-notification.service.ts');
    expect(src).toContain('reconnected$');
    expect(src).toContain('new Subject<void>()');
  });

  it('frontend WS service validates event shape before routing', () => {
    const src = readFile('platform/runtime/websocket/websocket-notification.service.ts');
    expect(src).toContain('JSON.parse');
    expect(src).toContain('catch');
  });

  it('frontend WS service short-circuits system events', () => {
    const src = readFile('platform/runtime/websocket/websocket-notification.service.ts');
    expect(src).toContain("type.startsWith('system.')");
  });

  it('frontend WS service stops reconnecting on auth failure (4001)', () => {
    const src = readFile('platform/runtime/websocket/websocket-notification.service.ts');
    expect(src).toContain('4001');
  });

  it('frontend WS service routes notification.created and notification.unread_count.updated', () => {
    const src = readFile('platform/runtime/websocket/websocket-notification.service.ts');
    expect(src).toContain("type.startsWith('notification.')");
    expect(src).toContain("'notification.unread_count.updated'");
  });

  it('notification store re-fetches history on reconnect', () => {
    const src = readFile('platform/core/platform/notification/notification.store.ts');
    expect(src).toContain('reconnected$');
    expect(src).toContain('loadHistory');
  });

  it('prometheus.service.ts exports WS metric functions', () => {
    const src = readFile('modules/packages/dos-platform-core/src/observability/prometheus.service.ts');
    const required = ['initWsMetrics', 'recordWsConnect', 'setWsActiveConnections', 'recordWsDisconnect', 'recordWsSendFailure', 'recordWsSlowConsumer', 'recordWsInbound', 'recordWsRateLimited'];
    for (const fn of required) {
      expect(src, `should export ${fn}`).toContain(`export function ${fn}`);
    }
  });

  it('notification-service package.json has ws dependency', () => {
    const pkg = JSON.parse(readFile('services/notification-service/package.json'));
    expect(pkg.dependencies).toHaveProperty('ws');
    expect(pkg.devDependencies).toHaveProperty('@types/ws');
  });
});
