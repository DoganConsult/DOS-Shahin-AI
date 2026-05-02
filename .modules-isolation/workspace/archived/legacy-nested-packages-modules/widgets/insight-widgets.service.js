"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSIGHT_WIDGET_KEYS = void 0;
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
async function list(...args) { return []; }
async function getById(...args) { return null; }
async function create(...args) { return {}; }
async function update(...args) { return {}; }
async function remove(...args) { }
exports.INSIGHT_WIDGET_KEYS = new Set([
    'risk_heatmap', 'compliance_trend', 'incident_summary',
    'audit_progress', 'vendor_risk_overview', 'policy_coverage',
]);
//# sourceMappingURL=insight-widgets.service.js.map