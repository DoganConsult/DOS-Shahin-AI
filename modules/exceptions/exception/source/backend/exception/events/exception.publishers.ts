import { logger } from '../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { EXCEPTION_EVENT_CONTRACT } from './exception.events';

export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;

let _publisher: EventPublisher | null = null;

export function setPublisher(fn: EventPublisher): void {
  _publisher = fn;
}

export async function publish(
  eventName: string,
  payload: Omit<ModuleEventPayload, 'moduleCode'>,
): Promise<void> {
  if (!EXCEPTION_EVENT_CONTRACT.published[eventName]) {
    logger.warn(`[${EXCEPTION_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
    return;
  }
  const fullPayload: ModuleEventPayload = { ...payload, moduleCode: EXCEPTION_EVENT_CONTRACT.moduleCode };
  if (_publisher) {
    await _publisher(fullPayload);
  }
  logger.debug(`[${EXCEPTION_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}

export function getPublishedEventNames(): string[] {
  return Object.keys(EXCEPTION_EVENT_CONTRACT.published);
}
