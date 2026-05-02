/**
 * DOS agent tools.
 * AI agents query the orchestrator through these typed tools.
 */

import type { AgentToolDefinition } from '@dos/module-sdk';
import type { DOSPort } from '@dos/ports/dos';
import type { TenantsRepository, ModulesRepository, EventsLogRepository } from './repositories';

export interface DOSAgentToolsDeps {
  readonly port: DOSPort;
  readonly tenants: TenantsRepository;
  readonly modules: ModulesRepository;
  readonly events: EventsLogRepository;
}

export function buildDOSAgentTools(deps: DOSAgentToolsDeps): AgentToolDefinition[] {
  return [
    {
      name: 'dos.get_tenant',
      description: 'Look up a tenant by tenantId. Returns productCode + lifecycle status or null.',
      input_schema: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
        },
        required: ['tenantId'],
      },
      handler: async (_tenantId: string, input: Record<string, unknown>) => {
        const id = String(input.tenantId ?? '');
        if (!id) throw new Error('tenantId is required');
        return deps.port.getTenant(id);
      },
    },

    {
      name: 'dos.list_products',
      description: 'List every registered product with its version + enabled flag.',
      input_schema: { type: 'object', properties: {} },
      handler: async () => {
        const list = await deps.port.listProducts();
        return { count: list.length, products: list };
      },
    },

    {
      name: 'dos.list_modules',
      description:
        'List every registered platform / product module. Filter by layer (platform | product) if passed.',
      input_schema: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: ['platform', 'product'] },
        },
      },
      handler: async (_tenantId: string, input: Record<string, unknown>) => {
        const all = await deps.modules.list();
        const filtered = input.layer ? all.filter((m) => m.layer === input.layer) : all;
        return { count: filtered.length, modules: filtered };
      },
    },

    {
      name: 'dos.recent_events',
      description:
        'Retrieve recent platform events for a tenant. Useful for answering "what happened recently?" questions.',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 500 },
        },
      },
      handler: async (tenantId: string, input: Record<string, unknown>) => {
        const limit = Math.min(500, Math.max(1, Number(input.limit ?? 50)));
        const events = await deps.events.recent(tenantId, limit);
        return { tenantId, count: events.length, events };
      },
    },
  ];
}
