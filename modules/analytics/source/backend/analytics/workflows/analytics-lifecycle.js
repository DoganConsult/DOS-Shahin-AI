"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_SNAPSHOT_TRANSITIONS = exports.ANALYTICS_SNAPSHOT_STATES = exports.ANALYTICS_PIPELINE_TRANSITIONS = exports.ANALYTICS_PIPELINE_STATES = void 0;
exports.ANALYTICS_PIPELINE_STATES = [
    'draft', 'configured', 'running', 'completed', 'failed', 'stale', 'archived',
];
exports.ANALYTICS_PIPELINE_TRANSITIONS = {
    draft: ['configured'],
    configured: ['running'],
    running: ['completed', 'failed'],
    completed: ['running', 'stale', 'archived'],
    failed: ['configured', 'archived'],
    stale: ['running', 'archived'],
    archived: [],
};
exports.ANALYTICS_SNAPSHOT_STATES = [
    'generating', 'ready', 'certified', 'published', 'expired', 'archived',
];
exports.ANALYTICS_SNAPSHOT_TRANSITIONS = {
    generating: ['ready', 'expired'],
    ready: ['certified', 'expired'],
    certified: ['published', 'expired'],
    published: ['expired', 'archived'],
    expired: ['archived'],
    archived: [],
};
//# sourceMappingURL=analytics-lifecycle.js.map