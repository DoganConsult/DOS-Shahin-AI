export const INTEGRATION_STATES = [
  'draft', 'configured', 'testing', 'active', 'degraded',
  'suspended', 'decommissioned', 'archived',
] as const;

export type IntegrationState = (typeof INTEGRATION_STATES)[number];

export const INTEGRATION_TRANSITIONS: Record<IntegrationState, IntegrationState[]> = {
  draft: ['configured'],
  configured: ['testing'],
  testing: ['active', 'configured'],
  active: ['degraded', 'suspended', 'decommissioned'],
  degraded: ['active', 'suspended'],
  suspended: ['active', 'decommissioned'],
  decommissioned: ['archived'],
  archived: [],
};
