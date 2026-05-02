"use strict";
/**
 * @dos/types — incident, alert, and security event types
 * Covers incident response, alerts, SoC, threat management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INCIDENT_SOURCES = exports.INCIDENT_SEVERITIES = exports.INCIDENT_STATUSES = void 0;
exports.INCIDENT_STATUSES = ['reported', 'triaged', 'investigating', 'contained', 'eradicated', 'recovered', 'closed', 'archived'];
exports.INCIDENT_SEVERITIES = ['critical', 'high', 'medium', 'low'];
exports.INCIDENT_SOURCES = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'];
//# sourceMappingURL=incident.js.map