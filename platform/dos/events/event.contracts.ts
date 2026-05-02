export interface PlatformEventContract {
  eventId: string;
  eventType: string;
  namespace: string;
  payload: Record<string, unknown>;
  actorId: string;
  tenantId: string;
  moduleCode: string;
  correlationId: string;
  timestamp: string;
}

export type EventCategory = 'domain' | 'platform' | 'control' | 'lifecycle' | 'operational' | 'integration';
