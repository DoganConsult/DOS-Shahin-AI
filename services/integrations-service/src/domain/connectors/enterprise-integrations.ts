import { logger } from '@dos/platform-core/observability';

// ════════════════════════════════════════════════════════════��══════
// Enterprise Integration Connectors — Real HTTP clients
// CISO Assistant, OpenProject, GovReady
// ═══════════════════════════════════════════════════════════════════

const REQUEST_TIMEOUT_MS = 15_000;

interface ConnectorResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function httpRequest<T = unknown>(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string },
): Promise<ConnectorResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    let data: T | undefined;
    try { data = JSON.parse(text) as T; } catch { /* non-JSON response */ }
    if (!res.ok) {
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || 'Request failed' };
  }
}

// ── CISO Assistant ──────────────────────────────────────────────────

export class CisoAssistantConnector {
  private isEnabled: boolean;
  private url: string;
  private apiKey: string;

  constructor() {
    this.isEnabled = process.env.CISO_ASSISTANT_ENABLED === 'true';
    this.url = process.env.CISO_ASSISTANT_URL || 'http://localhost:8600';
    this.apiKey = process.env.CISO_ASSISTANT_API_KEY || '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.apiKey}`,
    };
  }

  public async syncRiskEvent(eventId: string, severity: string): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    const result = await httpRequest(`${this.url}/api/risk-scenarios/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: `DOS Risk Event ${eventId}`,
        description: `Auto-synced risk event from DOS Platform`,
        risk_level: severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1,
        external_reference: eventId,
      }),
    });
    if (result.ok) {
      logger.info('[CISO Assistant] Risk event synced', { eventId, severity });
    } else {
      logger.error('[CISO Assistant] Sync failed', { eventId, error: result.error });
    }
    return result;
  }

  public async listRiskScenarios(page = 1): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/risk-scenarios/?page=${page}`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async listFrameworks(): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/frameworks/`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async listComplianceAssessments(): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/compliance-assessments/`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async healthCheck(): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { enabled: false } };
    return httpRequest(`${this.url}/api/iam/current-user/`, {
      method: 'GET',
      headers: this.headers(),
    });
  }
}

// ── OpenProject ─────────────────────────────────────────────────────

export class OpenProjectConnector {
  private isEnabled: boolean;
  private url: string;
  private apiKey: string;

  constructor() {
    this.isEnabled = process.env.OPENPROJECT_ENABLED === 'true';
    this.url = process.env.OPENPROJECT_URL || 'http://localhost:8602';
    this.apiKey = process.env.OPENPROJECT_API_KEY || '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`apikey:${this.apiKey}`).toString('base64')}`,
    };
  }

  public async createRemediationTask(taskId: string, description: string, projectId = 1): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    const result = await httpRequest(`${this.url}/api/v3/projects/${projectId}/work_packages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        subject: `[DOS Remediation] ${taskId}`,
        description: { format: 'markdown', raw: description },
        type: { href: '/api/v3/types/1' },
        status: { href: '/api/v3/statuses/1' },
        _meta: { externalReference: taskId },
      }),
    });
    if (result.ok) {
      logger.info('[OpenProject] Remediation task created', { taskId });
    } else {
      logger.error('[OpenProject] Task creation failed', { taskId, error: result.error });
    }
    return result;
  }

  public async getWorkPackage(wpId: number): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/v3/work_packages/${wpId}`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async listWorkPackages(projectId = 1, filters?: string): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    const qs = filters ? `?filters=${encodeURIComponent(filters)}` : '';
    return httpRequest(`${this.url}/api/v3/projects/${projectId}/work_packages${qs}`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async updateWorkPackageStatus(wpId: number, statusHref: string): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/v3/work_packages/${wpId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status: { href: statusHref } }),
    });
  }

  public async healthCheck(): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { enabled: false } };
    return httpRequest(`${this.url}/api/v3`, {
      method: 'GET',
      headers: this.headers(),
    });
  }
}

// ── GovReady ────────────────────────────────────────────────────────

export class GovReadyConnector {
  private isEnabled: boolean;
  private url: string;
  private apiKey: string;

  constructor() {
    this.isEnabled = process.env.GOVREADY_ENABLED === 'true';
    this.url = process.env.GOVREADY_URL || 'http://localhost:8601';
    this.apiKey = process.env.GOVREADY_API_KEY || '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  public async auditComplianceBaseline(tenantId: string): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    const result = await httpRequest(`${this.url}/api/v1/systems`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (result.ok) {
      logger.info('[GovReady] Compliance baseline fetched', { tenantId });
    } else {
      logger.error('[GovReady] Baseline audit failed', { tenantId, error: result.error });
    }
    return result;
  }

  public async getSystem(systemId: number): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/v1/systems/${systemId}`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async listControls(systemId: number): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/v1/systems/${systemId}/controls`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async getComplianceStatus(systemId: number): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.url}/api/v1/systems/${systemId}/assessment/status`, {
      method: 'GET',
      headers: this.headers(),
    });
  }

  public async healthCheck(): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { enabled: false } };
    return httpRequest(`${this.url}/api/v1/`, {
      method: 'GET',
      headers: this.headers(),
    });
  }
}

// ── PagerDuty ───────────────────────────────────────────────────────

export class PagerDutyConnector {
  private isEnabled: boolean;
  private routingKey: string;

  constructor() {
    this.isEnabled = !!process.env.PAGERDUTY_ROUTING_KEY;
    this.routingKey = process.env.PAGERDUTY_ROUTING_KEY || '';
  }

  public async triggerIncident(
    summary: string,
    severity: 'critical' | 'error' | 'warning' | 'info',
    source: string,
    deduplicationKey?: string,
  ): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: this.routingKey,
        event_action: 'trigger',
        dedup_key: deduplicationKey,
        payload: {
          summary,
          severity,
          source,
          component: 'dos-platform',
          group: 'grc',
        },
      }),
    });
  }

  public async resolveIncident(deduplicationKey: string): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: this.routingKey,
        event_action: 'resolve',
        dedup_key: deduplicationKey,
      }),
    });
  }
}

// ── OpsGenie ────────────────────────────────────────────────────────

export class OpsGenieConnector {
  private isEnabled: boolean;
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.isEnabled = !!process.env.OPSGENIE_API_KEY;
    this.apiKey = process.env.OPSGENIE_API_KEY || '';
    this.apiUrl = process.env.OPSGENIE_API_URL || 'https://api.opsgenie.com';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `GenieKey ${this.apiKey}`,
    };
  }

  public async createAlert(
    message: string,
    priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5',
    details: Record<string, string>,
    alias?: string,
  ): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.apiUrl}/v2/alerts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        message,
        priority,
        alias,
        source: 'dos-platform',
        tags: ['dos', 'grc'],
        details,
      }),
    });
  }

  public async closeAlert(alias: string): Promise<ConnectorResponse> {
    if (!this.isEnabled) return { ok: true, status: 0, data: { skipped: true } };
    return httpRequest(`${this.apiUrl}/v2/alerts/${alias}/close?identifierType=alias`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ source: 'dos-platform' }),
    });
  }
}

// ── Singleton exports ───────────────────────────────────────────────

export const cisoAssistant = new CisoAssistantConnector();
export const openProject = new OpenProjectConnector();
export const govReady = new GovReadyConnector();
export const pagerDuty = new PagerDutyConnector();
export const opsGenie = new OpsGenieConnector();
