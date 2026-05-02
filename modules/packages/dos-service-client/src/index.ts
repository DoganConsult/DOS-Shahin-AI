import { AsyncLocalStorage } from 'node:async_hooks';
import { CircuitBreaker, getOrCreateBreaker, getAllBreakerMetrics } from '@dos/platform-core/resilience';
import type { CircuitState } from '@dos/platform-core/resilience';
import { startSpan, injectTraceHeaders } from '@dos/platform-core/observability';

export { CircuitBreaker, getOrCreateBreaker, getAllBreakerMetrics };
export type { CircuitState };

// Shared request context for distributed tracing.
// Middleware in @dos/service-bootstrap sets this per inbound request.
// ServiceClient reads it to propagate correlation ID, tenant, and auth token.
interface RequestStore {
  correlationId: string;
  tenantId?: string;
  authToken?: string;
}
export const requestContext = new AsyncLocalStorage<RequestStore>();

export interface ServiceClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  circuitBreakerThreshold?: number;
  circuitResetMs?: number;
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

export interface ServiceResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export class ServiceClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private breaker: CircuitBreaker;

  constructor(config: ServiceClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout || 5000;
    this.retries = config.retries || 2;
    this.breaker = getOrCreateBreaker({
      name: `service-client:${this.baseUrl}`,
      failureThreshold: config.circuitBreakerThreshold ?? 5,
      recoveryTimeMs: config.circuitResetMs ?? 30_000,
      onStateChange: config.onStateChange,
    });
  }

  getCircuitState(): CircuitState {
    return this.breaker.getState();
  }

  getCircuitMetrics() {
    return this.breaker.getMetrics();
  }

  private getServiceToken(): string | null {
    try {
      const { generateServiceToken } = require('@dos/platform-core/http');
      const sourceSvc = process.env.SERVICE_CODE || 'unknown';
      return generateServiceToken(sourceSvc, '*');
    } catch { return null; }
  }

  private mergeHeaders(headers?: Record<string, string>): Record<string, string> {
    const merged: Record<string, string> = { ...headers };
    const store = requestContext.getStore();
    if (store?.correlationId) merged['x-correlation-id'] = store.correlationId;
    if (store?.tenantId) merged['x-tenant-id'] = store.tenantId;
    if (store?.authToken && !merged['authorization']) merged['authorization'] = store.authToken;
    const svcToken = this.getServiceToken();
    if (svcToken && !merged['x-service-token']) merged['x-service-token'] = svcToken;
    return merged;
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<ServiceResponse<T>> {
    return this.request<T>('GET', path, undefined, headers);
  }

  async post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ServiceResponse<T>> {
    return this.request<T>('POST', path, body, headers);
  }

  async put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ServiceResponse<T>> {
    return this.request<T>('PUT', path, body, headers);
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<ServiceResponse<T>> {
    return this.request<T>('DELETE', path, undefined, headers);
  }

  private async request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<ServiceResponse<T>> {
    return this.breaker.execute(async () => {
      // Distributed tracing: propagate correlation ID from AsyncLocalStorage
      const traceHeaders: Record<string, string> = {};
      const store = requestContext?.getStore?.();
      if (store?.correlationId) {
        traceHeaders['x-correlation-id'] = store.correlationId;
      }
      if (store?.tenantId) {
        traceHeaders['x-tenant-id'] = store.tenantId;
      }
      if (store?.authToken) {
        traceHeaders['authorization'] = `Bearer ${store.authToken}`;
      }

      // Inject W3C traceparent for distributed tracing
      const outboundSpan = startSpan(`${method} ${this.baseUrl}${path}`);
      Object.assign(traceHeaders, injectTraceHeaders(outboundSpan));

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), this.timeout);

          const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...traceHeaders,
              ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timer);

          const data = response.headers.get('content-type')?.includes('application/json')
            ? await response.json() as T
            : (await response.text()) as unknown as T;

          outboundSpan.setAttribute('http.status_code', response.status);
          outboundSpan.end(response.ok ? 'ok' : 'error');
          return { data, status: response.status, ok: response.ok };
        } catch (err) {
          lastError = err as Error;
          if (attempt < this.retries) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100));
          }
        }
      }
      outboundSpan.end('error');
      throw lastError || new Error('Request failed');
    });
  }

  destroy() {
    this.breaker.reset();
  }
}

export interface ServiceEndpoint {
  serviceCode: string;
  baseUrl: string;
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheckedAt?: string;
  metadata?: Record<string, string>;
}

export interface ServiceDiscoveryProvider {
  resolve(serviceCode: string): Promise<ServiceEndpoint | null>;
  resolveAll(): Promise<ServiceEndpoint[]>;
}

const DEFAULT_SERVICE_URLS: Record<string, string> = {
  auth: 'http://127.0.0.1:4001',
  tenant: 'http://127.0.0.1:4002',
  user: 'http://127.0.0.1:4003',
  workflow: 'http://127.0.0.1:4004',
  notification: 'http://127.0.0.1:4005',
  audit: 'http://127.0.0.1:4006',
  aiGateway: 'http://127.0.0.1:4007',
  onboarding: 'http://127.0.0.1:4010',
  governance: 'http://127.0.0.1:4011',
  grcCore: 'http://127.0.0.1:4012',
  auditReporting: 'http://127.0.0.1:4013',
};

const ENV_VAR_MAP: Record<string, string> = {
  auth: 'AUTH_SERVICE_URL',
  tenant: 'TENANT_SERVICE_URL',
  user: 'USER_SERVICE_URL',
  workflow: 'WORKFLOW_SERVICE_URL',
  notification: 'NOTIFICATION_SERVICE_URL',
  audit: 'AUDIT_SERVICE_URL',
  aiGateway: 'AI_GATEWAY_SERVICE_URL',
  onboarding: 'ONBOARDING_SERVICE_URL',
  governance: 'GOVERNANCE_SERVICE_URL',
  grcCore: 'GRC_CORE_SERVICE_URL',
  auditReporting: 'AUDIT_REPORTING_SERVICE_URL',
};

export class EnvServiceDiscovery implements ServiceDiscoveryProvider {
  async resolve(serviceCode: string): Promise<ServiceEndpoint | null> {
    const envVar = ENV_VAR_MAP[serviceCode];
    const url = envVar ? (process.env[envVar] || DEFAULT_SERVICE_URLS[serviceCode]) : DEFAULT_SERVICE_URLS[serviceCode];
    if (!url) return null;
    return { serviceCode, baseUrl: url, health: 'unknown' };
  }

  async resolveAll(): Promise<ServiceEndpoint[]> {
    const endpoints: ServiceEndpoint[] = [];
    for (const [code, defaultUrl] of Object.entries(DEFAULT_SERVICE_URLS)) {
      const envVar = ENV_VAR_MAP[code];
      const url = envVar ? (process.env[envVar] || defaultUrl) : defaultUrl;
      endpoints.push({ serviceCode: code, baseUrl: url, health: 'unknown' });
    }
    return endpoints;
  }
}

export class RegistryServiceDiscovery implements ServiceDiscoveryProvider {
  private registry = new Map<string, ServiceEndpoint>();
  private healthCheckIntervalMs: number;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(serviceCode: string, endpoint: ServiceEndpoint | null) => void> = [];

  constructor(options?: { healthCheckIntervalMs?: number }) {
    this.healthCheckIntervalMs = options?.healthCheckIntervalMs || 30_000;
  }

  register(endpoint: ServiceEndpoint): void {
    this.registry.set(endpoint.serviceCode, endpoint);
    this.notifyListeners(endpoint.serviceCode, endpoint);
  }

  deregister(serviceCode: string): void {
    this.registry.delete(serviceCode);
    this.notifyListeners(serviceCode, null);
  }

  async resolve(serviceCode: string): Promise<ServiceEndpoint | null> {
    return this.registry.get(serviceCode) || null;
  }

  async resolveAll(): Promise<ServiceEndpoint[]> {
    return [...this.registry.values()];
  }

  onServiceChange(callback: (serviceCode: string, endpoint: ServiceEndpoint | null) => void): void {
    this.listeners.push(callback);
  }

  startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const [code, endpoint] of this.registry.entries()) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(`${endpoint.baseUrl}/health`, { signal: controller.signal });
          clearTimeout(timer);
          endpoint.health = response.ok ? 'healthy' : 'degraded';
        } catch {
          endpoint.health = 'unhealthy';
        }
        endpoint.lastCheckedAt = new Date().toISOString();
        this.registry.set(code, endpoint);
      }
    }, this.healthCheckIntervalMs);
    this.healthCheckTimer.unref();
  }

  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private notifyListeners(serviceCode: string, endpoint: ServiceEndpoint | null): void {
    for (const listener of this.listeners) {
      try { listener(serviceCode, endpoint); } catch { /* ignore listener errors */ }
    }
  }
}

export interface DiscoveryClientFactoryOptions {
  discovery: ServiceDiscoveryProvider;
  clientDefaults?: Partial<ServiceClientConfig>;
}

export class DiscoveryClientFactory {
  private discovery: ServiceDiscoveryProvider;
  private clientDefaults: Partial<ServiceClientConfig>;
  private clients = new Map<string, ServiceClient>();

  constructor(options: DiscoveryClientFactoryOptions) {
    this.discovery = options.discovery;
    this.clientDefaults = options.clientDefaults || {};
  }

  async getClient(serviceCode: string): Promise<ServiceClient> {
    const existing = this.clients.get(serviceCode);
    if (existing) return existing;

    const endpoint = await this.discovery.resolve(serviceCode);
    if (!endpoint) {
      throw new Error(`[service-client] Service '${serviceCode}' not found in discovery`);
    }

    const client = new ServiceClient({
      baseUrl: endpoint.baseUrl,
      ...this.clientDefaults,
    });
    this.clients.set(serviceCode, client);
    return client;
  }

  invalidate(serviceCode: string): void {
    const client = this.clients.get(serviceCode);
    if (client) {
      client.destroy();
      this.clients.delete(serviceCode);
    }
  }

  destroyAll(): void {
    for (const client of this.clients.values()) {
      client.destroy();
    }
    this.clients.clear();
  }
}

export function createServiceClients(): Record<string, ServiceClient> {
  const services: Record<string, string> = {};
  for (const [code, defaultUrl] of Object.entries(DEFAULT_SERVICE_URLS)) {
    const envVar = ENV_VAR_MAP[code];
    services[code] = envVar ? (process.env[envVar] || defaultUrl) : defaultUrl;
  }

  return Object.fromEntries(
    Object.entries(services).map(([name, url]) => [name, new ServiceClient({ baseUrl: url })])
  );
}
