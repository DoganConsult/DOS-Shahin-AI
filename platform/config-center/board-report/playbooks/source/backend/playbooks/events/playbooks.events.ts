import type { ModuleEventContract } from '@dos/types';
export const PLAYBOOKS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'playbooks',
  published: {
    'playbooks.playbook_activated': { description: 'Playbook activated', version: 1, payloadType: 'any' },
    'playbooks.playbook_executed': { description: 'Playbook execution started', version: 1, payloadType: 'any' },
    'playbooks.playbook_completed': { description: 'Playbook execution completed', version: 1, payloadType: 'any' },
    'playbooks.step_completed': { description: 'Playbook step completed', version: 1, payloadType: 'any' },
  },
  consumed: {
    'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};
