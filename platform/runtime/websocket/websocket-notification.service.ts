import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface WSEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const MAX_DELAY = 30_000;
// Cap on reconnect attempts. After this many consecutive failures the
// service stays idle until the next explicit connect() call. Prevents the
// console-spam loop when the gateway has no /ws upgrade handler yet.
const MAX_RECONNECT_ATTEMPTS = 4;

export function computeReconnectDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), MAX_DELAY);
}

export function routeEventToSubject(event: WSEvent | null | undefined): string | null {
  if (!event || typeof event !== 'object' || !event.type) return null;
  const type = String(event.type || '');
  if (!type) return null;
  if (type === 'notification' || type.startsWith('notification.')) return 'notifications';
  if (type === 'data_update' || type.startsWith('data_update.')) return 'dataUpdates';
  if (type.startsWith('ui.') || type.startsWith('admin.') || type.startsWith('ai.')) return 'dataUpdates';
  if (type === 'channel_message' || type === 'direct_message') return 'messages';
  if (type.startsWith('system.')) return null;
  return null;
}

export function buildWsUrl(path: string, params?: Record<string, string>): string {
  const isHttps = globalThis.location?.protocol === 'https:';
  const protocol = isHttps ? 'wss:' : 'ws:';
  const host = globalThis.location?.host ?? 'localhost';
  const rawPath = String(path || '').trim();
  const safePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const url = new URL(`${protocol}//${host}${safePath}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

function normalizeWsInput(path: string, explicitToken?: string): { safePath: string; safeToken?: string } {
  const rawPath = String(path || '').trim();
  const rawToken = (explicitToken || '').trim();

  // Defensive guard: if callers accidentally pass JWT as path,
  // treat it as token and recover to canonical /ws path.
  const looksLikeJwt = (v: string): boolean => v.split('.').length === 3 && v.length > 32;
  if (looksLikeJwt(rawPath) && !rawToken) {
    return { safePath: '/ws', safeToken: rawPath };
  }

  // Defensive guard: malformed absolute websocket URL where token is concatenated to host.
  // Example: wss://shahin-ai.com<jwt>
  const malformedHostToken = rawPath.match(/^(wss?:\/\/[^\/?#]+)(eyJ[A-Za-z0-9._-]+)$/);
  if (malformedHostToken && !rawToken) {
    return { safePath: '/ws', safeToken: malformedHostToken[2] };
  }

  return { safePath: rawPath || '/ws', safeToken: rawToken || undefined };
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  connected = signal(false);
  unreadCount = signal(0);

  reconnected$ = new Subject<void>();
  notifications$ = new Subject<WSEvent>();
  dataUpdates$ = new Subject<WSEvent>();
  messages$ = new Subject<WSEvent>();

  connect(path = '/ws', explicitToken?: string): void {
    this.disconnect();
    const normalized = normalizeWsInput(path, explicitToken);
    // Auth = httpOnly `dos_access_token` cookie sent by the browser on the
    // websocket handshake (same-origin). The browser cannot read the cookie
    // and MUST NOT pass a token from localStorage. If a short-lived
    // websocket ticket is needed, callers must obtain it via a
    // cookie-authenticated /api request and pass it as `explicitToken`.
    const token = normalized.safeToken || '';
    const url = buildWsUrl(normalized.safePath, token ? { token } : undefined);
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.connected.set(true);
      const didReconnect = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      if (didReconnect) this.reconnected$.next();
    };
    this.ws.onmessage = (msg) => {
      let event: WSEvent | null = null;
      try {
        event = JSON.parse(msg.data);
      } catch {
        return;
      }
      if (!event || typeof event !== 'object' || typeof event.type !== 'string') return;
      if (!event.data || typeof event.data !== 'object') (event as any).data = {};
      const d = event.data as Record<string, unknown>;
      if (typeof d['eventType'] !== 'string') d['eventType'] = event.type;
      if (event.type === 'notification.unread_count.updated') {
        const unread = d['unread'];
        if (typeof unread === 'number') this.unreadCount.set(unread);
      }
      const subject = routeEventToSubject(event);
      if (subject === 'notifications') this.notifications$.next(event);
      else if (subject === 'dataUpdates') this.dataUpdates$.next(event);
      else if (subject === 'messages') this.messages$.next(event);
    };
    this.ws.onclose = (evt) => {
      this.connected.set(false);
      if (evt.code === 4001) return;
      this.scheduleReconnect(normalized.safePath, normalized.safeToken);
    };
    this.ws.onerror = () => this.ws?.close();
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected.set(false);
  }

  private scheduleReconnect(path: string, token?: string): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts === MAX_RECONNECT_ATTEMPTS) {
        console.warn(`[WebSocketService] giving up after ${MAX_RECONNECT_ATTEMPTS} reconnect attempts — /ws unavailable`);
        this.reconnectAttempts++;
      }
      return;
    }
    const delay = computeReconnectDelay(this.reconnectAttempts++);
    this.reconnectTimer = setTimeout(() => this.connect(path, token), delay);
  }
}
