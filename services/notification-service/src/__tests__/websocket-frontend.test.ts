import { describe, it, expect } from 'vitest';

function computeReconnectDelay(attempt: number): number {
  const MAX_DELAY = 30_000;
  const base = Math.min(1000 * Math.pow(2, attempt), MAX_DELAY);
  const jitter = base * (0.5 + Math.random() * 0.5);
  return Math.round(jitter);
}

function isValidWsEvent(event: unknown): boolean {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  return typeof e['type'] === 'string' && (e['type'] as string).length > 0;
}

function routeEventToSubject(event: { type: string } | null | undefined): string | null {
  if (!event || typeof event !== 'object' || !event.type) return null;
  switch (event.type) {
    case 'notification':
    case 'notification.created': return 'notifications';
    case 'data_update':
    case 'notification.unread_count.updated': return 'dataUpdates';
    case 'channel_message':
    case 'direct_message': return 'messages';
    default: return null;
  }
}

function buildWsUrl(path: string, params?: Record<string, string>): string {
  const protocol = 'ws:';
  const host = 'localhost';
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

describe('Frontend WebSocket utilities', () => {
  describe('computeReconnectDelay', () => {
    it('returns delay within expected range for attempt 0', () => {
      const delay = computeReconnectDelay(0);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1000);
    });

    it('increases delay with attempt', () => {
      const delays = Array.from({ length: 100 }, () => computeReconnectDelay(3));
      const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
      expect(avg).toBeGreaterThan(4000);
      expect(avg).toBeLessThan(8000);
    });

    it('caps at MAX_DELAY', () => {
      const delay = computeReconnectDelay(100);
      expect(delay).toBeLessThanOrEqual(30_000);
    });

    it('adds jitter (not always same value)', () => {
      const delays = new Set(Array.from({ length: 20 }, () => computeReconnectDelay(2)));
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('isValidWsEvent', () => {
    it('accepts valid event', () => {
      expect(isValidWsEvent({ type: 'notification.created', data: {}, timestamp: '2025-01-01' })).toBe(true);
    });

    it('rejects null', () => {
      expect(isValidWsEvent(null)).toBe(false);
    });

    it('rejects empty type', () => {
      expect(isValidWsEvent({ type: '' })).toBe(false);
    });

    it('rejects non-string type', () => {
      expect(isValidWsEvent({ type: 42 })).toBe(false);
    });
  });

  describe('routeEventToSubject', () => {
    it('routes notification.created to notifications', () => {
      expect(routeEventToSubject({ type: 'notification.created' })).toBe('notifications');
    });

    it('routes notification.unread_count.updated to dataUpdates', () => {
      expect(routeEventToSubject({ type: 'notification.unread_count.updated' })).toBe('dataUpdates');
    });

    it('routes channel_message to messages', () => {
      expect(routeEventToSubject({ type: 'channel_message' })).toBe('messages');
    });

    it('returns null for unknown type', () => {
      expect(routeEventToSubject({ type: 'system.connected' })).toBeNull();
    });

    it('handles null input', () => {
      expect(routeEventToSubject(null)).toBeNull();
    });

    it('handles undefined input', () => {
      expect(routeEventToSubject(undefined)).toBeNull();
    });
  });

  describe('buildWsUrl', () => {
    it('builds correct URL', () => {
      const url = buildWsUrl('/ws');
      expect(url).toBe('ws://localhost/ws');
    });

    it('adds query params', () => {
      const url = buildWsUrl('/ws', { token: 'abc123' });
      expect(url).toContain('token=abc123');
    });

    it('handles path without leading slash', () => {
      const url = buildWsUrl('ws');
      expect(url).toContain('/ws');
    });

    it('handles empty path', () => {
      const url = buildWsUrl('');
      expect(url).toBe('ws://localhost/');
    });
  });
});
