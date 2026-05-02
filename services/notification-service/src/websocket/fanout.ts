import type { WsEventEnvelope } from './types';
import { createEventEnvelope, WS_EVENT_TYPES } from './types';
import type { ConnectionRegistry, TrackedConnection } from './connection-registry';
import { logger, recordWsSendFailure, recordWsSlowConsumer } from '@dos/platform-core/observability';
import { wsMetrics } from './ws-metrics';

export interface FanoutTarget {
  userId?: string;
  tenantId?: string;
}

export interface FanoutAdapter {
  publish(target: FanoutTarget, envelope: WsEventEnvelope): Promise<void>;
  subscribe(handler: (target: FanoutTarget, envelope: WsEventEnvelope) => void): void;
  shutdown(): Promise<void>;
  healthy(): boolean;
}

const MAX_QUEUED_BYTES = 64 * 1024;
const BACKPRESSURE_WARNING_THRESHOLD = 48 * 1024;

function deliverToRegistry(registry: ConnectionRegistry, target: FanoutTarget, envelope: WsEventEnvelope): void {
  const payload = JSON.stringify(envelope);
  const payloadBytes = Buffer.byteLength(payload);
  let connections: TrackedConnection[];

  if (target.userId) {
    connections = registry.getByUserId(target.userId);
  } else if (target.tenantId) {
    connections = registry.getByTenantId(target.tenantId);
  } else {
    return;
  }

  for (const conn of connections) {
    if (target.tenantId && conn.info.auth.tenantId !== target.tenantId) continue;

    if (conn.info.queuedBytes > MAX_QUEUED_BYTES) {
      logger.warn('[ws] Closing slow consumer', { connectionId: conn.info.connectionId, queuedBytes: conn.info.queuedBytes });
      wsMetrics.slowConsumersClosed++;
      recordWsSlowConsumer();
      try { conn.ws.close(4008, 'Slow consumer'); } catch {}
      continue;
    }

    if (conn.info.queuedBytes > BACKPRESSURE_WARNING_THRESHOLD && conn.info.queuedBytes <= BACKPRESSURE_WARNING_THRESHOLD + payloadBytes) {
      const warning = JSON.stringify(createEventEnvelope(WS_EVENT_TYPES.SYSTEM_BACKPRESSURE_WARNING, {
        queuedBytes: conn.info.queuedBytes,
        maxBytes: MAX_QUEUED_BYTES,
        message: 'Connection approaching send limit. Reduce subscription volume or consume faster.',
      }));
      try { conn.ws.send(warning); } catch {}
    }

    try {
      conn.ws.send(payload, (err) => {
        if (err) {
          wsMetrics.messageSendFailures++;
          recordWsSendFailure();
          logger.debug('[ws] Send failed', { connectionId: conn.info.connectionId, error: err.message });
        } else {
          conn.info.messagesSent++;
          conn.info.queuedBytes = Math.max(0, conn.info.queuedBytes - payloadBytes);
        }
      });
      conn.info.queuedBytes += payloadBytes;
    } catch {
      wsMetrics.messageSendFailures++;
      recordWsSendFailure();
    }
  }
}

export class LocalFanoutAdapter implements FanoutAdapter {
  private registry: ConnectionRegistry;
  private handlers: Array<(target: FanoutTarget, envelope: WsEventEnvelope) => void> = [];

  constructor(registry: ConnectionRegistry) {
    this.registry = registry;
  }

  async publish(target: FanoutTarget, envelope: WsEventEnvelope): Promise<void> {
    deliverToRegistry(this.registry, target, envelope);
    for (const handler of this.handlers) {
      try { handler(target, envelope); } catch {}
    }
  }

  subscribe(handler: (target: FanoutTarget, envelope: WsEventEnvelope) => void): void {
    this.handlers.push(handler);
  }

  healthy(): boolean {
    return true;
  }

  async shutdown(): Promise<void> {
    this.handlers = [];
  }
}

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000;
const CIRCUIT_HALF_OPEN_MAX = 1;

type CircuitState = 'closed' | 'open' | 'half-open';

export class RedisFanoutAdapter implements FanoutAdapter {
  private registry: ConnectionRegistry;
  private handlers: Array<(target: FanoutTarget, envelope: WsEventEnvelope) => void> = [];
  private publisher: any = null;
  private subscriber: any = null;
  private channel = 'ws:fanout';
  private redisReady = false;

  private circuitState: CircuitState = 'closed';
  private circuitFailures = 0;
  private circuitOpenedAt = 0;
  private circuitHalfOpenAttempts = 0;

  constructor(registry: ConnectionRegistry) {
    this.registry = registry;
  }

  async init(redisUrl: string): Promise<void> {
    const ioredis = await import('ioredis');
    const Redis = ioredis.default || ioredis;
    this.publisher = new (Redis as any)(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true, enableOfflineQueue: false });
    this.subscriber = new (Redis as any)(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true, enableOfflineQueue: false });

    this.publisher.on('error', (err: Error) => {
      logger.warn('[ws] Redis publisher error', { error: err.message });
      this.redisReady = false;
    });
    this.subscriber.on('error', (err: Error) => {
      logger.warn('[ws] Redis subscriber error', { error: err.message });
      this.redisReady = false;
    });
    this.publisher.on('ready', () => {
      this.redisReady = true;
      if (this.circuitState === 'open' || this.circuitState === 'half-open') {
        this.circuitState = 'closed';
        this.circuitFailures = 0;
        logger.info('[ws] Redis circuit breaker closed (reconnected)');
      }
    });
    this.subscriber.on('ready', () => { this.redisReady = true; });

    await this.publisher.connect();
    await this.subscriber.connect();

    this.subscriber.subscribe(this.channel).catch((err: Error) => {
      logger.error('[ws] Redis fanout subscribe failed', { error: err.message });
    });

    this.subscriber.on('message', (_ch: string, message: string) => {
      try {
        const { target, envelope } = JSON.parse(message);
        deliverToRegistry(this.registry, target, envelope);
        for (const handler of this.handlers) {
          try { handler(target, envelope); } catch {}
        }
      } catch {}
    });

    this.redisReady = true;
    logger.info('[ws] Redis fanout adapter initialized');
  }

  healthy(): boolean {
    return this.redisReady && this.circuitState !== 'open';
  }

  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  private shouldAttemptRedis(): boolean {
    if (this.circuitState === 'closed') return true;
    if (this.circuitState === 'open') {
      if (Date.now() - this.circuitOpenedAt >= CIRCUIT_RESET_MS) {
        this.circuitState = 'half-open';
        this.circuitHalfOpenAttempts = 0;
        logger.info('[ws] Redis circuit breaker half-open, probing');
        return true;
      }
      return false;
    }
    return this.circuitHalfOpenAttempts < CIRCUIT_HALF_OPEN_MAX;
  }

  private recordSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
      this.circuitFailures = 0;
      logger.info('[ws] Redis circuit breaker closed (probe succeeded)');
    }
    this.circuitFailures = 0;
  }

  private recordFailure(): void {
    this.circuitFailures++;
    if (this.circuitState === 'half-open') {
      this.circuitState = 'open';
      this.circuitOpenedAt = Date.now();
      logger.warn('[ws] Redis circuit breaker re-opened (half-open probe failed)', { failures: this.circuitFailures });
      return;
    }
    if (this.circuitFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitState = 'open';
      this.circuitOpenedAt = Date.now();
      logger.warn('[ws] Redis circuit breaker opened', { failures: this.circuitFailures });
    }
  }

  async publish(target: FanoutTarget, envelope: WsEventEnvelope): Promise<void> {
    if (this.publisher && this.redisReady && this.shouldAttemptRedis()) {
      try {
        if (this.circuitState === 'half-open') this.circuitHalfOpenAttempts++;
        await this.publisher.publish(this.channel, JSON.stringify({ target, envelope }));
        this.recordSuccess();
        return;
      } catch {
        this.recordFailure();
      }
    }
    deliverToRegistry(this.registry, target, envelope);
  }

  subscribe(handler: (target: FanoutTarget, envelope: WsEventEnvelope) => void): void {
    this.handlers.push(handler);
  }

  async shutdown(): Promise<void> {
    this.handlers = [];
    this.redisReady = false;
    if (this.subscriber) { try { this.subscriber.disconnect(); } catch {} this.subscriber = null; }
    if (this.publisher) { try { this.publisher.disconnect(); } catch {} this.publisher = null; }
  }
}
