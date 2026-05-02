/**
 * DNOC agent tools.
 *
 * AI agents use these typed tools to query the observability surface.
 * Built with concrete repo references at the dnoc-service bootstrap.
 */

import type { AgentToolDefinition } from '@dos/module-sdk';
import type { DNOCPort } from '@dos/ports/dnoc';
import type { MetricsRepository, LogsRepository, TracesRepository, RoutesRepository } from './repositories';

export interface DNOCAgentToolsDeps {
  readonly port: DNOCPort;
  readonly metrics: MetricsRepository;
  readonly logs: LogsRepository;
  readonly traces: TracesRepository;
  readonly routes: RoutesRepository;
}

export function buildDNOCAgentTools(deps: DNOCAgentToolsDeps): AgentToolDefinition[] {
  return [
    {
      name: 'dnoc.get_health',
      description:
        'Return the most recent health status (healthy / degraded / unhealthy / unknown) for a named service.',
      input_schema: {
        type: 'object',
        properties: {
          serviceCode: {
            type: 'string',
            description: 'The service code (e.g. "auth-service", "dsoc-service").',
          },
        },
        required: ['serviceCode'],
      },
      handler: async (_tenantId: string, input: Record<string, unknown>) => {
        const serviceCode = String(input.serviceCode ?? '');
        if (!serviceCode) throw new Error('serviceCode is required');
        const status = await deps.port.getHealth(serviceCode);
        return { serviceCode, status };
      },
    },

    {
      name: 'dnoc.recent_metrics',
      description:
        'Retrieve recent values of a named metric. Useful for observing rates, errors, or resource utilization.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Metric name (e.g. "http.requests", "auth.login.failures").' },
          limit: { type: 'integer', minimum: 1, maximum: 500 },
        },
        required: ['name'],
      },
      handler: async (_tenantId: string, input: Record<string, unknown>) => {
        const name = String(input.name ?? '');
        if (!name) throw new Error('name is required');
        const limit = Math.min(500, Math.max(1, Number(input.limit ?? 50)));
        const samples = await deps.metrics.recent(name, limit);
        return { name, count: samples.length, samples };
      },
    },

    {
      name: 'dnoc.trace_by_id',
      description:
        'Retrieve all spans of a distributed trace by its trace id, ordered by start time. Useful for correlating cross-service activity.',
      input_schema: {
        type: 'object',
        properties: {
          traceId: { type: 'string' },
        },
        required: ['traceId'],
      },
      handler: async (_tenantId: string, input: Record<string, unknown>) => {
        const traceId = String(input.traceId ?? '');
        if (!traceId) throw new Error('traceId is required');
        const spans = await deps.traces.byTraceId(traceId);
        return { traceId, spanCount: spans.length, spans };
      },
    },

    {
      name: 'dnoc.list_service_routes',
      description:
        'List the routes (method + path + authRequired) a given service has currently registered.',
      input_schema: {
        type: 'object',
        properties: {
          serviceCode: { type: 'string' },
        },
        required: ['serviceCode'],
      },
      handler: async (_tenantId: string, input: Record<string, unknown>) => {
        const serviceCode = String(input.serviceCode ?? '');
        if (!serviceCode) throw new Error('serviceCode is required');
        const routes = await deps.routes.listActive(serviceCode);
        return { serviceCode, count: routes.length, routes };
      },
    },
  ];
}
