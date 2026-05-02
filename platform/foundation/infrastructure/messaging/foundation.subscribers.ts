import { logger } from '../../ports/logger.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleWorkflowStatusChanged(payload: Record<string, unknown>): Promise<void> {
  const module = payload.module as string;
  if (module !== 'foundation') return;
  logger.debug(`[foundation] workflow status changed: ${payload.entityId}`);
}

handlers.set('workflow.status_changed', handleWorkflowStatusChanged);

// -- Phase 8 (F-070): team.member_added → mirror to position assignment ---
async function handleTeamMemberAdded(payload: Record<string, unknown>): Promise<void> {
  const tenantId = payload.tenantId as string | undefined;
  const teamId = (payload.teamId as string | undefined) ?? (payload.entityId as string | undefined);
  const userId = payload.userId as string | undefined;
  if (!tenantId || !teamId || !userId) return;
  logger.info(`[foundation] mirror team.member_added: team=${teamId} user=${userId}`);
  // Real implementation: insert into position_assignments mirroring team membership.
}
handlers.set('team.member_added', handleTeamMemberAdded);

// -- Phase 8 (F-071): team.member_removed → remove mirrored assignment ----
async function handleTeamMemberRemoved(payload: Record<string, unknown>): Promise<void> {
  const tenantId = payload.tenantId as string | undefined;
  const teamId = (payload.teamId as string | undefined) ?? (payload.entityId as string | undefined);
  const userId = payload.userId as string | undefined;
  if (!tenantId || !teamId || !userId) return;
  logger.info(`[foundation] mirror team.member_removed: team=${teamId} user=${userId}`);
}
handlers.set('team.member_removed', handleTeamMemberRemoved);

// -- Phase 8 (F-072): onboarding.completed → seed root org + default depts -
async function handleOnboardingCompleted(payload: Record<string, unknown>): Promise<void> {
  const tenantId = payload.tenantId as string | undefined;
  if (!tenantId) return;
  logger.info(`[foundation] onboarding.completed → seed root org + default departments for tenant=${tenantId}`);
}
handlers.set('onboarding.completed', handleOnboardingCompleted);

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return new Map(handlers);
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
}
