import { logger } from '../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { WORKFLOW_EVENT_CONTRACT } from './workflow.events';

export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;

let _publisher: EventPublisher | null = null;

export function setPublisher(fn: EventPublisher): void {
  _publisher = fn;
}

export async function publish(
  eventName: string,
  payload: Omit<ModuleEventPayload, 'moduleCode'>,
): Promise<void> {
  if (!WORKFLOW_EVENT_CONTRACT.published[eventName]) {
    logger.warn(`[${WORKFLOW_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
    return;
  }
  const fullPayload: ModuleEventPayload = { ...payload, moduleCode: WORKFLOW_EVENT_CONTRACT.moduleCode };
  if (_publisher) {
    await _publisher(fullPayload);
  }
  logger.debug(`[${WORKFLOW_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}

export function getPublishedEventNames(): string[] {
  return Object.keys(WORKFLOW_EVENT_CONTRACT.published);
}
