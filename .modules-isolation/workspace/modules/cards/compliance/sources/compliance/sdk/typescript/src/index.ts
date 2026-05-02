/**
 * @dos/sdk-compliance — TypeScript SDK for the DOS Compliance API.
 *
 * Wave 19 of cryptic-booping-codd.md.
 *
 * This is the hand-curated facade. The full client surface is generated
 * from `modules/compliance/openapi.yaml` (run `npm run codegen` in this
 * package — Wave 20 wires the codegen toolchain).
 *
 * Usage:
 *   import { ComplianceClient } from '@dos/sdk-compliance';
 *   const client = new ComplianceClient({
 *     baseUrl: 'https://shahin-ai.com',
 *     token: process.env.DOS_TOKEN!,
 *   });
 *   const overview = await client.overview();
 *   const controls = await client.controls.list({ frameworkId });
 */

export interface ClientConfig {
  /** Origin (no trailing slash). e.g. https://shahin-ai.com */
  baseUrl: string;
  /** Bearer token (DAuth-issued JWT). */
  token: string;
  /** Optional fetch impl override (defaults to global fetch). */
  fetch?: typeof fetch;
  /** Per-request timeout (ms). Default 30000. */
  timeoutMs?: number;
  /** Optional request-id callback for tracing. */
  onRequestId?: (id: string) => void;
}

export interface PagedList<T> {
  data: T[];
  page: { cursor?: string | null; nextCursor?: string | null; limit: number; total?: number | null };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

export class DosComplianceError extends Error {
  readonly status: number;
  readonly apiError: ApiError;
  constructor(status: number, apiError: ApiError) {
    super(`DOS Compliance API ${status}: ${apiError.code} — ${apiError.message}`);
    this.name = 'DosComplianceError';
    this.status = status;
    this.apiError = apiError;
  }
}

// ---------- Domain types (mirror openapi.yaml `components.schemas`) -----

export type ControlStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type ControlEffectiveness =
  | 'not_tested'
  | 'effective'
  | 'partially_effective'
  | 'ineffective'
  | 'na';

export interface Control {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  frameworkId: string;
  status: ControlStatus;
  owner?: string | null;
  effectiveness?: ControlEffectiveness;
  createdAt: string;
  updatedAt: string;
}

export interface Framework {
  id: string;
  code: string;
  name: string;
  version: string;
  description?: string;
  applicableSectors?: string[];
  controlCount?: number;
}

export type AttestationStatus =
  | 'pending'
  | 'in_progress'
  | 'attested'
  | 'declined'
  | 'escalated'
  | 'expired';

export interface Attestation {
  id: string;
  campaignId: string;
  controlId: string;
  attestorId: string;
  status: AttestationStatus;
  evidence?: Array<Record<string, unknown>>;
  signedAt?: string | null;
  signature?: string | null;
}

export interface OverviewResponse {
  postureScore: number;
  frameworksTracked: number;
  controlsTotal: number;
  controlsEffective: number;
  gapsOpen: number;
  attestationsPending: number;
  recentActivity: Array<Record<string, unknown>>;
}

// ---------- Client -------------------------------------------------------

export class ComplianceClient {
  private readonly cfg: Required<Omit<ClientConfig, 'onRequestId'>> & { onRequestId?: (id: string) => void };
  readonly controls: ControlsResource;
  readonly frameworks: FrameworksResource;
  readonly attestations: AttestationsResource;

  constructor(cfg: ClientConfig) {
    this.cfg = {
      baseUrl: cfg.baseUrl.replace(/\/$/, ''),
      token: cfg.token,
      fetch: cfg.fetch ?? fetch,
      timeoutMs: cfg.timeoutMs ?? 30_000,
      onRequestId: cfg.onRequestId,
    };
    this.controls = new ControlsResource(this);
    this.frameworks = new FrameworksResource(this);
    this.attestations = new AttestationsResource(this);
  }

  /** Compliance posture / overview composite. */
  async overview(): Promise<OverviewResponse> {
    return this.request<OverviewResponse>('GET', '/api/compliance');
  }

  /** Health check (returns 200 OK or 503 when degraded). */
  async health(): Promise<{ ok: boolean; service: string }> {
    return this.request('GET', '/api/compliance/healthz');
  }

  /** Audit-trail hash-chain integrity verification (Wave 10). */
  async verifyAuditChain(): Promise<{
    ok: boolean;
    totalEntries: number;
    verifiedEntries: number;
    firstBreakAt: { id: string; chainSeq: number } | null;
    reason: string | null;
  }> {
    return this.request('GET', '/api/compliance/audit/verify');
  }

  /** Internal — used by resource classes. */
  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
    const url = new URL(this.cfg.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs);
    try {
      const res = await this.cfg.fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.cfg.token}`,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });

      const requestId = res.headers.get('x-request-id') ?? '';
      this.cfg.onRequestId?.(requestId);

      if (!res.ok) {
        let payload: ApiError;
        try {
          const j = await res.json() as { error?: ApiError };
          payload = j.error ?? { code: 'unknown', message: res.statusText };
        } catch {
          payload = { code: 'unknown', message: res.statusText };
        }
        throw new DosComplianceError(res.status, { ...payload, request_id: requestId });
      }
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) return undefined as unknown as T;
      return await res.json() as T;
    } finally {
      clearTimeout(t);
    }
  }
}

class ControlsResource {
  constructor(private readonly client: ComplianceClient) {}

  list(params?: { frameworkId?: string; status?: ControlStatus; cursor?: string; limit?: number }): Promise<PagedList<Control>> {
    return this.client.request('GET', '/api/controls', undefined, params);
  }

  get(id: string): Promise<{ data: Control }> {
    return this.client.request('GET', `/api/controls/${encodeURIComponent(id)}`);
  }

  create(body: Pick<Control, 'code' | 'name' | 'frameworkId'> & Partial<Control>): Promise<{ data: Control }> {
    return this.client.request('POST', '/api/controls', body);
  }

  update(id: string, body: Partial<Control>): Promise<{ data: Control }> {
    return this.client.request('PATCH', `/api/controls/${encodeURIComponent(id)}`, body);
  }

  delete(id: string): Promise<void> {
    return this.client.request('DELETE', `/api/controls/${encodeURIComponent(id)}`);
  }
}

class FrameworksResource {
  constructor(private readonly client: ComplianceClient) {}
  list(params?: { cursor?: string; limit?: number }): Promise<PagedList<Framework>> {
    return this.client.request('GET', '/api/frameworks', undefined, params);
  }
  get(id: string): Promise<{ data: Framework }> {
    return this.client.request('GET', `/api/frameworks/${encodeURIComponent(id)}`);
  }
}

class AttestationsResource {
  constructor(private readonly client: ComplianceClient) {}
  list(params?: { cursor?: string; limit?: number }): Promise<PagedList<Attestation>> {
    return this.client.request('GET', '/api/compliance-attestation', undefined, params);
  }
  get(id: string): Promise<{ data: Attestation }> {
    return this.client.request('GET', `/api/compliance-attestation/${encodeURIComponent(id)}`);
  }
  start(body: Partial<Attestation>): Promise<{ data: Attestation }> {
    return this.client.request('POST', '/api/compliance-attestation', body);
  }
  updateStatus(id: string, status: AttestationStatus): Promise<{ data: Attestation }> {
    return this.client.request('PATCH', `/api/compliance-attestation/${encodeURIComponent(id)}`, { status });
  }
}

export const SDK_VERSION = '0.1.0';
