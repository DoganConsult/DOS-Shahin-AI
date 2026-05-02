import { generateServiceToken } from './inter-service-auth';
import * as crypto from 'crypto';
import { getCorrelationId, requestContext } from './correlation';

export interface ServiceClientOptions {
  sourceService: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
}

export interface ServiceResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
interface CBEntry {
  state: CBState;
  failures: number;
  lastFailure: number;
  threshold: number;
  resetMs: number;
}
const _circuits = new Map<string, CBEntry>();

function getCircuit(target: string, threshold: number, resetMs: number): CBEntry {
  let cb = _circuits.get(target);
  if (!cb) {
    cb = { state: 'CLOSED', failures: 0, lastFailure: 0, threshold, resetMs };
    _circuits.set(target, cb);
  }
  return cb;
}

function checkCircuit(cb: CBEntry): boolean {
  if (cb.state === 'CLOSED') return true;
  if (cb.state === 'OPEN' && Date.now() - cb.lastFailure >= cb.resetMs) {
    cb.state = 'HALF_OPEN';
    return true;
  }
  return cb.state === 'HALF_OPEN';
}

function recordSuccess(cb: CBEntry): void {
  cb.failures = 0;
  cb.state = 'CLOSED';
}

function recordFailure(cb: CBEntry): void {
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.failures >= cb.threshold) cb.state = 'OPEN';
}

const _tokenCache = new Map<string, { token: string; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 240_000;

function getCachedToken(source: string, target: string): string {
  const key = `${source}:${target}`;
  const cached = _tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const token = generateServiceToken(source, target);
  _tokenCache.set(key, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
  return token;
}

function signBody(body: string | undefined, secret: string): string {
  if (!body) return '';
  return crypto.createHmac('sha256', secret).update(body).digest('hex').slice(0, 32);
}

export function getAllCircuitStates(): Array<{ target: string; state: CBState; failures: number }> {
  return [..._circuits.entries()].map(([target, cb]) => ({
    target, state: cb.state, failures: cb.failures,
  }));
}

const SERVICE_PORTS: Record<string, number> = {
  gateway: 4000,
  'auth-service': 4001,
  'tenant-service': 4002,
  'user-service': 4003,
  'workflow-service': 4004,
  'notification-service': 4005,
  'audit-service': 4006,
  'ai-gateway-service': 4007,
  'onboarding-service': 4010,
  'governance-policy-service': 4011,
  'compliance-controls-service': 4012,
  'risk-incident-service': 4013,
  'evidence-audit-reporting-service': 4014,
  'vendor-service': 4015,
  'asset-service': 4016,
  'bcp-service': 4017,
  'training-service': 4018,
  'privacy-service': 4019,
  'dora-service': 4020,
  'remediation-action-service': 4021,
  'qiyas-journey-service': 4022,
  'dashboard-widgets-service': 4023,
  'analytics-service': 4024,
  'executive-intelligence-service': 4025,
  'integrations-service': 4026,
  'notification-inbox-service': 4027,
  'portals-service': 4028,
  'records-service': 4029,
  'platform-product-service': 4030,
  'agrc-os-service': 4031,
};

function resolveBaseUrl(targetService: string): string {
  const envKey = `SERVICE_URL_${targetService.replace(/-/g, '_').toUpperCase()}`;
  const envUrl = process.env[envKey];
  if (envUrl) return envUrl;

  const port = SERVICE_PORTS[targetService];
  if (!port) throw new Error(`Unknown service: ${targetService}`);
  return `http://127.0.0.1:${port}`;
}

export class ServiceClient {
  private sourceService: string;
  private timeoutMs: number;
  private retries: number;
  private retryDelayMs: number;
  private cbThreshold: number;
  private cbResetMs: number;

  constructor(options: ServiceClientOptions) {
    this.sourceService = options.sourceService;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.cbThreshold = options.circuitBreakerThreshold ?? 5;
    this.cbResetMs = options.circuitBreakerResetMs ?? 30_000;
  }

  private buildHeaders(targetService: string, bodyStr?: string, extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-service-token': getCachedToken(this.sourceService, targetService),
      'x-source-service': this.sourceService,
    };
    const correlationId = getCorrelationId();
    if (correlationId) headers['x-correlation-id'] = correlationId;
    const ctx = requestContext.getStore();
    if (ctx?.tenantId) headers['x-tenant-id'] = ctx.tenantId;
    if (ctx?.userId) headers['x-user-id'] = ctx.userId;
    const secret = process.env.INTER_SERVICE_SECRET || process.env.JWT_SECRET || '';
    if (secret && bodyStr) {
      headers['x-body-signature'] = signBody(bodyStr, secret);
    }
    if (extra) Object.assign(headers, extra);
    return headers;
  }

  async request<T = unknown>(
    targetService: string,
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      tenantId?: string;
    } = {},
  ): Promise<ServiceResponse<T>> {
    const cb = getCircuit(targetService, this.cbThreshold, this.cbResetMs);
    if (!checkCircuit(cb)) {
      throw new Error(`Circuit breaker OPEN for ${targetService} — request rejected`);
    }

    const baseUrl = resolveBaseUrl(targetService);
    const url = `${baseUrl}${path}`;
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
    const headers = this.buildHeaders(targetService, bodyStr, options.headers);
    if (options.tenantId) headers['x-tenant-id'] = options.tenantId;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const res = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: bodyStr,
            signal: controller.signal,
          });
          const responseHeaders: Record<string, string> = {};
          res.headers.forEach((v, k) => { responseHeaders[k] = v; });
          const data = await res.json().catch(() => null) as T;
          if (res.status < 500) {
            recordSuccess(cb);
          } else {
            recordFailure(cb);
          }
          return { status: res.status, data, headers: responseHeaders };
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        lastError = err as Error;
        recordFailure(cb);
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, this.retryDelayMs * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError || new Error(`Request to ${targetService}${path} failed`);
  }

  async get<T = unknown>(targetService: string, path: string, opts?: { headers?: Record<string, string>; tenantId?: string }): Promise<ServiceResponse<T>> {
    return this.request<T>(targetService, path, { method: 'GET', ...opts });
  }

  async post<T = unknown>(targetService: string, path: string, body: unknown, opts?: { headers?: Record<string, string>; tenantId?: string }): Promise<ServiceResponse<T>> {
    return this.request<T>(targetService, path, { method: 'POST', body, ...opts });
  }

  async put<T = unknown>(targetService: string, path: string, body: unknown, opts?: { headers?: Record<string, string>; tenantId?: string }): Promise<ServiceResponse<T>> {
    return this.request<T>(targetService, path, { method: 'PUT', body, ...opts });
  }

  async patch<T = unknown>(targetService: string, path: string, body: unknown, opts?: { headers?: Record<string, string>; tenantId?: string }): Promise<ServiceResponse<T>> {
    return this.request<T>(targetService, path, { method: 'PATCH', body, ...opts });
  }

  async delete<T = unknown>(targetService: string, path: string, opts?: { headers?: Record<string, string>; tenantId?: string }): Promise<ServiceResponse<T>> {
    return this.request<T>(targetService, path, { method: 'DELETE', ...opts });
  }
}

export function createServiceClient(sourceService: string, options?: Partial<ServiceClientOptions>): ServiceClient {
  return new ServiceClient({ sourceService, ...options });
}
