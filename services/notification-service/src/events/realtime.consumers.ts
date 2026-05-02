// @ts-nocheck
import { RedisStreamEventBus } from '@dos/event-backbone';
import { broadcastToTenant } from '../routes/events.routes';
import { logger } from '@dos/platform-core/observability';

export function registerRealtimeConsumers(bus: RedisStreamEventBus): void {
  bus.subscribe('onboarding.provisioning.progress', async (event) => {
    try {
      if (!event.tenantId) return;
      
      broadcastToTenant(event.tenantId, {
        event: 'onboarding.provisioning.progress',
        data: event.payload,
        module: 'onboarding',
      });
    } catch (err: any) {
      logger.error('[RealtimeConsumer] Failed to bridge onboarding.provisioning.progress', { error: err?.message });
    }
  });

  bus.subscribe('workflow.task.updated', async (event) => {
    try {
      if (!event.tenantId) return;
      
      broadcastToTenant(event.tenantId, {
        event: 'workflow.task.updated',
        data: event.payload,
        module: 'workflow',
      });
    } catch (err: any) {
      logger.error('[RealtimeConsumer] Failed to bridge workflow.task.updated', { error: err?.message });
    }
  });

  const realtimeEvents = [
    'notification.created',
    'audit.log.created',
    'incident.updated',
  ];

  realtimeEvents.forEach(eventName => {
    bus.subscribe(eventName, async (event) => {
      try {
        if (!event.tenantId) return;
        
        broadcastToTenant(event.tenantId, {
          event: eventName,
          data: event.payload,
        });
      } catch (err: any) {
        logger.error(`[RealtimeConsumer] Failed to bridge ${eventName}`, { error: err?.message });
      }
    });
  });

  const moduleRecordEvents = [
    'module.record.created',
    'module.record.updated',
    'module.record.deleted',
    'module.record.bulk_updated',
    'module.record.bulk_deleted',
  ];

  moduleRecordEvents.forEach(eventName => {
    bus.subscribe(eventName, async (event) => {
      try {
        if (!event.tenantId) return;

        const payload = event.payload as Record<string, any>;
        const moduleCode = payload?.moduleCode || payload?.module || '';
        const action = eventName.split('.').pop() || 'refresh';
        const type = action === 'bulk_updated' ? 'bulk'
          : action === 'bulk_deleted' ? 'bulk'
          : action as string;

        broadcastToTenant(event.tenantId, {
          event: eventName,
          data: {
            type,
            moduleCode,
            itemId: payload?.itemId || payload?.entityId,
            data: payload,
            timestamp: new Date().toISOString(),
            userId: event.userId,
          },
          module: moduleCode,
          itemId: payload?.itemId || payload?.entityId,
        });
      } catch (err: any) {
        logger.error(`[RealtimeConsumer] Failed to bridge ${eventName}`, { error: err?.message });
      }
    });
  });

  const workflowEvents = [
    'workflow.created', 'workflow.advanced', 'workflow.completed',
    'task.assigned', 'task.completed',
    'approval.requested', 'approval.decided',
  ];

  workflowEvents.forEach(eventName => {
    bus.subscribe(eventName, async (event) => {
      try {
        if (!event.tenantId) return;

        const payload = event.payload as Record<string, any>;
        broadcastToTenant(event.tenantId, {
          event: eventName,
          data: {
            type: eventName.split('.').pop(),
            moduleCode: 'workflow',
            itemId: payload?.instanceId || payload?.taskId || payload?.approvalId || event.entityId,
            data: payload,
            timestamp: new Date().toISOString(),
            userId: event.userId,
          },
          module: 'workflow',
          itemId: payload?.instanceId || payload?.taskId || payload?.approvalId || event.entityId,
        });
      } catch (err: any) {
        logger.error(`[RealtimeConsumer] Failed to bridge ${eventName}`, { error: err?.message });
      }
    });
  });

  // ── Compliance vertical (Phase 2 / Module #1) Step 6 bridge ───────────
  // Compliance-controls service publishes domain events via custom names
  // (`compliance.assessed`, `compliance.gap.identified`, `control.tested`,
  // `control.effectiveness.changed`) — see services/compliance-controls-
  // service/src/events/publisher.ts. The generic `domainCrudPatterns`
  // loop below only covers `<module>.created|updated|deleted` shapes, so
  // these custom event names would never reach SSE clients without an
  // explicit bridge. Re-emit each as a `module.record.updated` envelope
  // tagged with the correct moduleCode so the existing FE realtime
  // subscriber path (subscribeToModule + buffered apply in
  // enterprise-module-list.component.ts) can react.
  const complianceBridge: Array<{ event: string; module: string }> = [
    { event: 'compliance.assessed',              module: 'compliance' },
    { event: 'compliance.gap.identified',        module: 'compliance' },
    { event: 'control.tested',                   module: 'controls'   },
    { event: 'control.effectiveness.changed',    module: 'controls'   },
  ];

  complianceBridge.forEach(({ event, module }) => {
    bus.subscribe(event, async (busEvent) => {
      try {
        if (!busEvent.tenantId) return;
        const payload = busEvent.payload as Record<string, any>;
        const itemId = payload?.entityId || payload?.id || payload?.itemId;
        broadcastToTenant(busEvent.tenantId, {
          event: 'module.record.updated',
          data: {
            type: 'update',
            moduleCode: module,
            itemId,
            data: { ...payload, sourceEvent: event },
            timestamp: new Date().toISOString(),
            userId: busEvent.userId,
          },
          module,
          itemId,
        });
      } catch (err: any) {
        logger.error(`[RealtimeConsumer] Failed to bridge ${event}`, { error: err?.message });
      }
    });
  });

  // ── Foundation & User vertical bridge ────────────────────────────────
  // Bridges specific Foundation and User events that don't match the
  // generic <module>.created|updated|deleted patterns.
  const foundationUserBridge: Array<{ event: string; module: string }> = [
    { event: 'foundation.org_created',           module: 'foundation' },
    { event: 'foundation.org_updated',           module: 'foundation' },
    { event: 'foundation.dept_created',          module: 'foundation' },
    { event: 'foundation.dept_updated',          module: 'foundation' },
    { event: 'foundation.role.assigned',         module: 'foundation' },
    { event: 'foundation.role.unassigned',       module: 'foundation' },
    { event: 'foundation.scope_changed',         module: 'foundation' },
    { event: 'foundation.position.holder.assigned',   module: 'foundation' },
    { event: 'foundation.position.holder.unassigned', module: 'foundation' },
    { event: 'foundation.org.manager.changed',   module: 'foundation' },
    { event: 'user.created',                     module: 'foundation' },
    { event: 'user.updated',                     module: 'foundation' },
    { event: 'user.deactivated',                 module: 'foundation' },
    { event: 'user.role_assigned',               module: 'foundation' },
    { event: 'user.role_revoked',                module: 'foundation' },
    { event: 'team.member_added',                module: 'foundation' },
    { event: 'team.member_removed',              module: 'foundation' },
  ];

  foundationUserBridge.forEach(({ event, module }) => {
    bus.subscribe(event, async (busEvent) => {
      try {
        if (!busEvent.tenantId) return;
        const payload = busEvent.payload as Record<string, any>;
        const itemId = payload?.id || payload?.userId || payload?.entityId || payload?.itemId;
        
        // Map event sub-type for the frontend
        let type = 'update';
        if (event.endsWith('_created') || event.endsWith('.created')) type = 'create';
        else if (event.endsWith('_deleted') || event.endsWith('.deleted')) type = 'delete';

        broadcastToTenant(busEvent.tenantId, {
          event: 'module.record.updated', // standard envelope for FE list refresh
          data: {
            type,
            moduleCode: module,
            itemId,
            data: { ...payload, sourceEvent: event },
            timestamp: new Date().toISOString(),
            userId: busEvent.userId,
          },
          module,
          itemId,
        });
      } catch (err: any) {
        logger.error(`[RealtimeConsumer] Failed to bridge ${event}`, { error: err?.message });
      }
    });
  });

  const domainCrudPatterns = [
    { pattern: 'action', module: 'action' },
    { pattern: 'admin', module: 'admin' },
    { pattern: 'agrc-engine', module: 'agrc-engine' },
    { pattern: 'ai', module: 'ai' },
    { pattern: 'ai-governance', module: 'ai-governance' },
    { pattern: 'analytics', module: 'analytics' },
    { pattern: 'asset', module: 'asset' },
    { pattern: 'attestation', module: 'attestation' },
    { pattern: 'audit', module: 'audit' },
    { pattern: 'bcp', module: 'bcp' },
    { pattern: 'benchmarks', module: 'benchmarks' },
    { pattern: 'bootstrap', module: 'bootstrap' },
    { pattern: 'compliance', module: 'compliance' },
    { pattern: 'controls', module: 'controls' },
    { pattern: 'dashboard', module: 'dashboard' },
    { pattern: 'dashboard-editor', module: 'dashboard-editor' },
    { pattern: 'dora', module: 'dora' },
    { pattern: 'evidence', module: 'evidence' },
    { pattern: 'exception', module: 'exception' },
    { pattern: 'executive', module: 'executive' },
    { pattern: 'fitch', module: 'fitch' },
    { pattern: 'foundation', module: 'foundation' },
    { pattern: 'governance', module: 'governance' },
    { pattern: 'governance-ai', module: 'governance-ai' },
    { pattern: 'governance-os', module: 'governance-os' },
    { pattern: 'grc-query', module: 'grc-query' },
    { pattern: 'inbox', module: 'inbox' },
    { pattern: 'incident', module: 'incident' },
    { pattern: 'integrations', module: 'integrations' },
    { pattern: 'issues', module: 'issues' },
    { pattern: 'journey', module: 'journey' },
    { pattern: 'knowledge', module: 'knowledge' },
    { pattern: 'ksa-regulatory', module: 'ksa-regulatory' },
    { pattern: 'local-knowledge', module: 'local-knowledge' },
    { pattern: 'mcp', module: 'mcp' },
    { pattern: 'mobile', module: 'mobile' },
    { pattern: 'module-onboarding', module: 'module-onboarding' },
    { pattern: 'navigation', module: 'navigation' },
    { pattern: 'notification', module: 'notification' },
    { pattern: 'onboarding', module: 'onboarding' },
    { pattern: 'onboarding-os', module: 'onboarding-os' },
    { pattern: 'operating-cockpit', module: 'operating-cockpit' },
    { pattern: 'packs', module: 'packs' },
    { pattern: 'platform-settings', module: 'platform-settings' },
    { pattern: 'playbooks', module: 'playbooks' },
    { pattern: 'policy', module: 'policy' },
    { pattern: 'portal-config', module: 'portal-config' },
    { pattern: 'portals', module: 'portals' },
    { pattern: 'privacy', module: 'privacy' },
    { pattern: 'proactive-leadership', module: 'proactive-leadership' },
    { pattern: 'qiyas', module: 'qiyas' },
    { pattern: 'records', module: 'records' },
    { pattern: 'reporting', module: 'reporting' },
    { pattern: 'risk', module: 'risk' },
    { pattern: 'risk-ai', module: 'risk-ai' },
    { pattern: 'risk-engine', module: 'risk-engine' },
    { pattern: 'risk-os', module: 'risk-os' },
    { pattern: 'risk-quantification', module: 'risk-quantification' },
    { pattern: 'risk-register', module: 'risk-register' },
    { pattern: 'role', module: 'role' },
    { pattern: 'settings', module: 'settings' },
    { pattern: 'task-engine', module: 'task-engine' },
    { pattern: 'team', module: 'team' },
    { pattern: 'vendor-os', module: 'vendor-os' },
    { pattern: 'widgets', module: 'widgets' }
  ];

  const crudActions = ['created', 'updated', 'deleted'];

  domainCrudPatterns.forEach(({ pattern, module }) => {
    crudActions.forEach(action => {
      const eventName = `${pattern}.${action}`;
      bus.subscribe(eventName, async (event) => {
        try {
          if (!event.tenantId) return;

          const payload = event.payload as Record<string, any>;
          const type = action === 'created' ? 'create'
            : action === 'updated' ? 'update'
            : 'delete';

          broadcastToTenant(event.tenantId, {
            event: `module.record.${action}`,
            data: {
              type,
              moduleCode: module,
              itemId: payload?.id || payload?.itemId || payload?.entityId,
              data: payload,
              timestamp: new Date().toISOString(),
              userId: event.userId,
            },
            module,
            itemId: payload?.id || payload?.itemId || payload?.entityId,
          });
        } catch (err: any) {
          logger.error(`[RealtimeConsumer] Failed to bridge ${eventName}`, { error: err?.message });
        }
      });
    });
  });
}
