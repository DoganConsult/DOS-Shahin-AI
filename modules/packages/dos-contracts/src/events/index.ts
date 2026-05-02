import type { PlatformEvent, EventRegistration, EventSubscription, RetryPolicy } from '@dos/types';

export interface EventContract {
  moduleCode: string;
  published: EventPublishedContract[];
  consumed: EventConsumedContract[];
}

export interface EventPublishedContract {
  eventType: string;
  description: string;
  version: number;
  payloadType: string;
  category: 'domain' | 'platform' | 'security' | 'lifecycle' | 'integration' | 'ai';
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface EventConsumedContract {
  eventType: string;
  source: string;
  handler: string;
  idempotent: boolean;
  retryPolicy: RetryPolicy;
  deadLetterEnabled: boolean;
}

export type { PlatformEvent, EventRegistration, EventSubscription, RetryPolicy };

/** Zod-typed new-user journey payloads (v1). */
export * from './journey-v1';

/** Zod-typed platform event payloads (risk/compliance/evidence/vendor). */
export * from './platform-event-schemas';
