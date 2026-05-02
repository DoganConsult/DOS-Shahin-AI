import { logger } from '../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { AGRC_ENGINE_EVENT_CONTRACT } from './agrc-engine.events';

export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;

let _publisher: EventPublisher | null = null;

export function setPublisher(fn: EventPublisher): void {
  _publisher = fn;
}

export async function publish(
  eventName: string,
  payload: Omit<ModuleEventPayload, 'moduleCode'>,
): Promise<void> {
  if (!AGRC_ENGINE_EVENT_CONTRACT.published[eventName]) {
    logger.warn(`[${AGRC_ENGINE_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
    return;
  }
  const fullPayload: ModuleEventPayload = { ...payload, moduleCode: AGRC_ENGINE_EVENT_CONTRACT.moduleCode };
  if (_publisher) {
    await _publisher(fullPayload);
  }
  logger.debug(`[${AGRC_ENGINE_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}

export function getPublishedEventNames(): string[] {
  return Object.keys(AGRC_ENGINE_EVENT_CONTRACT.published);
}
