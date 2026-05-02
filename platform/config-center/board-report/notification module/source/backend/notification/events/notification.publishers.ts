import { logger } from '../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { NOTIFICATION_EVENT_CONTRACT } from './notification.events';

export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;

let _publisher: EventPublisher | null = null;

export function setPublisher(fn: EventPublisher): void {
  _publisher = fn;
}

export async function publish(
  eventName: string,
  payload: Omit<ModuleEventPayload, 'moduleCode'>,
): Promise<void> {
  if (!NOTIFICATION_EVENT_CONTRACT.published[eventName]) {
    logger.warn(`[${NOTIFICATION_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
    return;
  }
  const fullPayload: ModuleEventPayload = { ...payload, moduleCode: NOTIFICATION_EVENT_CONTRACT.moduleCode };
  if (_publisher) {
    await _publisher(fullPayload);
  }
  logger.debug(`[${NOTIFICATION_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}

export function getPublishedEventNames(): string[] {
  return Object.keys(NOTIFICATION_EVENT_CONTRACT.published);
}
