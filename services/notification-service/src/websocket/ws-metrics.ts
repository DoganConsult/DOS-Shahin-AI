export interface WsMetrics {
  connectSuccess: number;
  connectFailure: number;
  activeConnections: number;
  disconnectNormal: number;
  disconnectError: number;
  disconnectStale: number;
  disconnectAuthFailure: number;
  messageSendFailures: number;
  slowConsumersClosed: number;
  inboundMessages: number;
  inboundRateLimited: number;
}

export const wsMetrics: WsMetrics = {
  connectSuccess: 0,
  connectFailure: 0,
  activeConnections: 0,
  disconnectNormal: 0,
  disconnectError: 0,
  disconnectStale: 0,
  disconnectAuthFailure: 0,
  messageSendFailures: 0,
  slowConsumersClosed: 0,
  inboundMessages: 0,
  inboundRateLimited: 0,
};

export function getWsMetricsSnapshot(): WsMetrics {
  return { ...wsMetrics };
}
