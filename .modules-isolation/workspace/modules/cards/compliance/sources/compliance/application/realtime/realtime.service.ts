/**
 * Realtime hub — minimal SSE pub/sub keyed by (tenantId, scopeType).
 *
 * Each subscriber registers a writer (the Express response). The hub keeps a
 * weak-set of writers per channel and broadcasts events. Hosts call
 * `publishEvent()` from their handlers (e.g. when an obligation changes) and
 * the SSE endpoint streams it to the right tenant's connected clients only —
 * no cross-tenant bleed.
 *
 * No external deps; works with the standard http response object.
 */

export interface RealtimeWriter {
  write(chunk: string): void;
  end(): void;
  on(event: 'close', cb: () => void): void;
}

export interface RealtimeEvent {
  tenantId: string;
  scopeType: string;
  type: string;
  payload?: unknown;
  occurredAt?: string;
}

interface Channel {
  writers: Set<RealtimeWriter>;
}

const channels = new Map<string, Channel>();

const channelKey = (tenantId: string, scopeType: string) => `${tenantId}::${scopeType}`;

const ensure = (key: string): Channel => {
  let ch = channels.get(key);
  if (!ch) { ch = { writers: new Set() }; channels.set(key, ch); }
  return ch;
};

export function subscribe(tenantId: string, scopeType: string, writer: RealtimeWriter): () => void {
  const key = channelKey(tenantId, scopeType);
  const ch = ensure(key);
  ch.writers.add(writer);
  writer.on('close', () => {
    ch.writers.delete(writer);
    if (ch.writers.size === 0) channels.delete(key);
  });
  return () => { ch.writers.delete(writer); };
}

export function publishEvent(evt: RealtimeEvent): { delivered: number } {
  const key = channelKey(evt.tenantId, evt.scopeType);
  const ch = channels.get(key);
  if (!ch) return { delivered: 0 };
  const frame = `event: ${evt.type}\ndata: ${JSON.stringify({
    type: evt.type,
    scopeType: evt.scopeType,
    payload: evt.payload ?? null,
    occurredAt: evt.occurredAt ?? new Date().toISOString(),
  })}\n\n`;
  let delivered = 0;
  for (const w of ch.writers) {
    try { w.write(frame); delivered++; } catch { /* dead writer; will be removed on close */ }
  }
  return { delivered };
}

export function activeChannelCount(): number { return channels.size; }
export function activeSubscriberCount(): number {
  let n = 0; for (const ch of channels.values()) n += ch.writers.size; return n;
}

/** Test-only: drop all subscribers (used between tests). */
export function __resetForTest(): void { channels.clear(); }
