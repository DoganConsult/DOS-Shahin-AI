import { logger } from "../../observability/logger.service";

export interface WorkflowEvent {
  workflowCode?: string;
  entityType?: string;
  entityId?: string;
  fromState?: string;
  toState?: string;
  triggeredBy: string;
  timestamp: string;
  tenantId?: string;
  instanceId?: string;
  eventType?: string;
  stepId?: string;
  previousState?: string;
  newState?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

const eventLog: WorkflowEvent[] = [];

export async function emitWorkflowEvent(event: Omit<WorkflowEvent, "timestamp">): Promise<WorkflowEvent> {
  const full: WorkflowEvent = { triggeredBy: 'system', ...event, timestamp: new Date().toISOString() };
  eventLog.push(full);
  if (eventLog.length > 5000) eventLog.splice(0, eventLog.length - 5000);
  logger.debug("[WorkflowEventEmitter] Event emitted", { workflowCode: event.workflowCode, fromState: event.fromState, toState: event.toState, eventType: event.eventType });
  return full;
}

export function getWorkflowEvents(workflowCode?: string, limit = 100): WorkflowEvent[] {
  const filtered = workflowCode ? eventLog.filter((e) => e.workflowCode === workflowCode) : eventLog;
  return filtered.slice(-limit);
}

export const workflowEventEmitterService = { emitWorkflowEvent, getWorkflowEvents };
