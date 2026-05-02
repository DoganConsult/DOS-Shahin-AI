/**
 * DSOC agent tools.
 *
 * AI agents use these typed tools to query the security-ops surface.
 * Tools are built via `buildDSOCAgentTools(deps)` at the dsoc-service
 * bootstrap — the AI engine or any consumer passes the real repos +
 * port, and receives a fully-wired set of tool definitions.
 */

import type { AgentToolDefinition } from '@dos/module-sdk';
import type { DSOCPort } from '@dos/ports/dsoc';
import type { AuditLogRepository } from './audit-log.repository';
import type { AlertsRepository } from './alerts.repository';

export interface DSOCAgentToolsDeps {
  readonly port: DSOCPort;
  readonly auditLog: AuditLogRepository;
  readonly alerts: AlertsRepository;
}

export function buildDSOCAgentTools(deps: DSOCAgentToolsDeps): AgentToolDefinition[] {
  return [
    {
      name: 'dsoc.recent_audit_events',
      description:
        'Retrieve the most recent DSOC audit events for the current tenant. Use for questions about recent security activity, failed logins, SoD violations, or access-review outcomes.',
      input_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Maximum events to return (default 50, max 500).',
            minimum: 1,
            maximum: 500,
          },
        },
      },
      handler: async (tenantId: string, input: Record<string, unknown>) => {
        const limit = Math.min(500, Math.max(1, Number(input.limit ?? 50)));
        const events = await deps.auditLog.recentByTenant(tenantId, limit);
        return { tenantId, count: events.length, events };
      },
    },

    {
      name: 'dsoc.list_open_alerts',
      description:
        'List open DSOC alerts for the current tenant. Returns id, severity, category, action, createdAt.',
      input_schema: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['info', 'low', 'medium', 'high', 'critical'],
            description: 'Optional: return only alerts at or above this severity.',
          },
        },
      },
      handler: async (tenantId: string, input: Record<string, unknown>) => {
        const all = await deps.alerts.listOpen(tenantId);
        const ranks: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
        const threshold = typeof input.severity === 'string' ? ranks[input.severity] ?? 0 : 0;
        const filtered = all.filter((a) => (ranks[a.severity] ?? 0) >= threshold);
        return { tenantId, count: filtered.length, alerts: filtered };
      },
    },

    {
      name: 'dsoc.get_posture',
      description:
        'Get the most recently computed security-posture snapshot (score 0-100 + findings) for the current tenant.',
      input_schema: {
        type: 'object',
        properties: {},
      },
      handler: async (tenantId: string) => {
        const snapshot = await deps.port.getLatestPosture(tenantId);
        return snapshot ?? { tenantId, score: null, findings: [], note: 'no posture snapshot recorded yet' };
      },
    },
  ];
}
