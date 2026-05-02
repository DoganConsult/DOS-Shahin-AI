import { describe, it, expect, beforeEach } from 'vitest';
import { wsMetrics, getWsMetricsSnapshot } from '../websocket/ws-metrics';

describe('WS Metrics', () => {
  beforeEach(() => {
    wsMetrics.connectSuccess = 0;
    wsMetrics.connectFailure = 0;
    wsMetrics.activeConnections = 0;
    wsMetrics.disconnectNormal = 0;
    wsMetrics.disconnectError = 0;
    wsMetrics.disconnectStale = 0;
    wsMetrics.disconnectAuthFailure = 0;
    wsMetrics.messageSendFailures = 0;
    wsMetrics.slowConsumersClosed = 0;
    wsMetrics.inboundMessages = 0;
    wsMetrics.inboundRateLimited = 0;
  });

  it('getWsMetricsSnapshot returns a copy', () => {
    wsMetrics.connectSuccess = 5;
    wsMetrics.activeConnections = 3;
    const snapshot = getWsMetricsSnapshot();
    expect(snapshot.connectSuccess).toBe(5);
    expect(snapshot.activeConnections).toBe(3);

    wsMetrics.connectSuccess = 10;
    expect(snapshot.connectSuccess).toBe(5);
  });

  it('tracks all metric fields', () => {
    wsMetrics.connectSuccess = 1;
    wsMetrics.connectFailure = 2;
    wsMetrics.disconnectNormal = 3;
    wsMetrics.disconnectError = 4;
    wsMetrics.disconnectStale = 5;
    wsMetrics.disconnectAuthFailure = 6;
    wsMetrics.messageSendFailures = 7;
    wsMetrics.slowConsumersClosed = 8;
    wsMetrics.inboundMessages = 9;
    wsMetrics.inboundRateLimited = 10;

    const s = getWsMetricsSnapshot();
    expect(s.connectSuccess).toBe(1);
    expect(s.connectFailure).toBe(2);
    expect(s.disconnectNormal).toBe(3);
    expect(s.disconnectError).toBe(4);
    expect(s.disconnectStale).toBe(5);
    expect(s.disconnectAuthFailure).toBe(6);
    expect(s.messageSendFailures).toBe(7);
    expect(s.slowConsumersClosed).toBe(8);
    expect(s.inboundMessages).toBe(9);
    expect(s.inboundRateLimited).toBe(10);
  });
});
