"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAPH_BACKEND_CONFIG = exports.GRAPH_BACKEND = void 0;
exports.registerGraphBackend = registerGraphBackend;
exports.getGraphBackend = getGraphBackend;
exports.graphBackendAvailable = graphBackendAvailable;
const observability_1 = require("@dos/platform-core/observability");
exports.GRAPH_BACKEND = 'apache-age';
let _backend = null;
function registerGraphBackend(backend) {
    _backend = backend;
    observability_1.logger.info(`[GraphBackend] Registered: ${backend.type}`);
}
function getGraphBackend() {
    return _backend;
}
function graphBackendAvailable() {
    return _backend !== null;
}
exports.GRAPH_BACKEND_CONFIG = {
    type: 'apache-age',
    description: 'Apache AGE — PostgreSQL graph extension for entity relationships',
    envVars: {
        AGE_ENABLED: 'Enable/disable Apache AGE graph backend',
        AGE_GRAPH_NAME: 'Graph name within PostgreSQL (default: dogan_ai_os_graph)',
    },
    capabilities: [
        'entity-relationship-mapping',
        'ownership-graph',
        'dependency-tracking',
        'risk-propagation',
        'control-mapping',
        'compliance-lineage',
    ],
    alternativesConsidered: [
        { name: 'Neo4j', reason: 'Separate infrastructure, license cost, operational overhead' },
        { name: 'In-memory graph', reason: 'Not durable, limited scalability' },
    ],
    decision: 'Apache AGE chosen: runs inside PostgreSQL (shared infra), SQL-compatible, zero additional ops cost, sufficient for GRC relationship patterns.',
};
//# sourceMappingURL=graph-backend.js.map