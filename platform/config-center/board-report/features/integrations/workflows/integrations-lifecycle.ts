import type { ConnectorStatus } from '../contracts/integrations.contracts';
export const CONNECTOR_STATES: readonly ConnectorStatus[] = ['draft', 'configured', 'active', 'paused', 'error', 'disabled', 'archived'] as const;
export const CONNECTOR_TRANSITIONS: Record<ConnectorStatus, ConnectorStatus[]> = {
  draft: ['configured', 'archived'], configured: ['active', 'archived'], active: ['paused', 'error', 'disabled'],
  paused: ['active', 'disabled'], error: ['active', 'paused', 'disabled'], disabled: ['active', 'archived'], archived: [],
};
export const CONNECTOR_TERMINAL_STATES: readonly ConnectorStatus[] = ['archived'];
export function isValidConnectorTransition(from: ConnectorStatus, to: ConnectorStatus): boolean { return CONNECTOR_TRANSITIONS[from]?.includes(to) ?? false; }
export function isConnectorTerminal(state: ConnectorStatus): boolean { return CONNECTOR_TERMINAL_STATES.includes(state); }
