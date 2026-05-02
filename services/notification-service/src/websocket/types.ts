export interface WsEventEnvelope {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WsAuthContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  email?: string;
  role?: string;
  tokenExpiresAt?: number;
}

export interface WsConnectionInfo {
  connectionId: string;
  auth: WsAuthContext;
  connectedAt: string;
  lastPongAt: number;
  messagesSent: number;
  queuedBytes: number;
  tokenExpiresAt?: number;
}

export const WS_EVENT_TYPES = {
  SYSTEM_CONNECTED: 'system.connected',
  SYSTEM_PING: 'system.ping',
  SYSTEM_PONG: 'system.pong',
  SYSTEM_TOKEN_EXPIRING: 'system.token_expiring',
  SYSTEM_BACKPRESSURE_WARNING: 'system.backpressure_warning',
  SYSTEM_DRAINING: 'system.draining',
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_UNREAD_COUNT_UPDATED: 'notification.unread_count.updated',
} as const;

export const VALID_INBOUND_TYPES = new Set(['pong', 'ping', 'subscribe', 'unsubscribe']);

export function isValidInboundMessage(msg: unknown): msg is { type: string; data?: Record<string, unknown> } {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  if (typeof m.type !== 'string' || !VALID_INBOUND_TYPES.has(m.type)) return false;
  if (m.data !== undefined && (typeof m.data !== 'object' || m.data === null)) return false;
  return true;
}

export function createEventEnvelope(type: string, data: Record<string, unknown>): WsEventEnvelope {
  return { type, data, timestamp: new Date().toISOString() };
}
