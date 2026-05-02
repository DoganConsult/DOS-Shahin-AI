import envelope from './foundation.event-envelope.schema.json';

export const FOUNDATION_EVENT_ENVELOPE_SCHEMA = envelope;
export const FOUNDATION_EVENT_SCHEMAS = {
  envelope,
} as const;
