"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAgent = registerAgent;
exports.registerAgentBatch = registerAgentBatch;
exports.getAgentDefinition = getAgentDefinition;
exports.getAllAgentDefinitions = getAllAgentDefinitions;
exports.persistAgentRegistration = persistAgentRegistration;
const _agents = new Map();
function registerAgent(def) {
    _agents.set(def.agentId, def);
}
function registerAgentBatch(defs) {
    for (const def of defs) {
        registerAgent(def);
    }
}
function getAgentDefinition(agentId) {
    return _agents.get(agentId);
}
function getAllAgentDefinitions() {
    return [..._agents.values()];
}
async function persistAgentRegistration(_tenantId, _agent) { }
//# sourceMappingURL=agent-registry.service.js.map