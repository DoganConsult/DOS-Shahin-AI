"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYBOOKS_EVENT_CONTRACT = void 0;
exports.PLAYBOOKS_EVENT_CONTRACT = {
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
//# sourceMappingURL=playbooks.events.js.map