import { describe, it, expect } from 'vitest';
import { isValidInboundMessage, createEventEnvelope, WS_EVENT_TYPES, VALID_INBOUND_TYPES } from '../websocket/types';

describe('WS types', () => {
  describe('isValidInboundMessage', () => {
    it('accepts valid pong', () => {
      expect(isValidInboundMessage({ type: 'pong' })).toBe(true);
    });

    it('accepts valid ping', () => {
      expect(isValidInboundMessage({ type: 'ping' })).toBe(true);
    });

    it('accepts valid subscribe', () => {
      expect(isValidInboundMessage({ type: 'subscribe', data: { channel: 'test' } })).toBe(true);
    });

    it('rejects unknown type', () => {
      expect(isValidInboundMessage({ type: 'evil_command' })).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidInboundMessage(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidInboundMessage(undefined)).toBe(false);
    });

    it('rejects non-object', () => {
      expect(isValidInboundMessage('string')).toBe(false);
    });

    it('rejects missing type', () => {
      expect(isValidInboundMessage({ data: {} })).toBe(false);
    });

    it('rejects non-string type', () => {
      expect(isValidInboundMessage({ type: 123 })).toBe(false);
    });

    it('rejects invalid data type', () => {
      expect(isValidInboundMessage({ type: 'pong', data: 'not-object' })).toBe(false);
    });

    it('rejects null data', () => {
      expect(isValidInboundMessage({ type: 'pong', data: null })).toBe(false);
    });

    it('accepts message without data', () => {
      expect(isValidInboundMessage({ type: 'pong' })).toBe(true);
    });
  });

  describe('createEventEnvelope', () => {
    it('creates valid envelope', () => {
      const env = createEventEnvelope('test.event', { key: 'value' });
      expect(env.type).toBe('test.event');
      expect(env.data).toEqual({ key: 'value' });
      expect(typeof env.timestamp).toBe('string');
      expect(new Date(env.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('WS_EVENT_TYPES', () => {
    it('has all required event types', () => {
      expect(WS_EVENT_TYPES.SYSTEM_CONNECTED).toBe('system.connected');
      expect(WS_EVENT_TYPES.SYSTEM_PING).toBe('system.ping');
      expect(WS_EVENT_TYPES.SYSTEM_TOKEN_EXPIRING).toBe('system.token_expiring');
      expect(WS_EVENT_TYPES.SYSTEM_BACKPRESSURE_WARNING).toBe('system.backpressure_warning');
      expect(WS_EVENT_TYPES.SYSTEM_DRAINING).toBe('system.draining');
      expect(WS_EVENT_TYPES.NOTIFICATION_CREATED).toBe('notification.created');
      expect(WS_EVENT_TYPES.NOTIFICATION_UNREAD_COUNT_UPDATED).toBe('notification.unread_count.updated');
    });
  });

  describe('VALID_INBOUND_TYPES', () => {
    it('contains expected types', () => {
      expect(VALID_INBOUND_TYPES.has('pong')).toBe(true);
      expect(VALID_INBOUND_TYPES.has('ping')).toBe(true);
      expect(VALID_INBOUND_TYPES.has('subscribe')).toBe(true);
      expect(VALID_INBOUND_TYPES.has('unsubscribe')).toBe(true);
    });

    it('does not contain arbitrary types', () => {
      expect(VALID_INBOUND_TYPES.has('admin')).toBe(false);
      expect(VALID_INBOUND_TYPES.has('execute')).toBe(false);
    });
  });
});
