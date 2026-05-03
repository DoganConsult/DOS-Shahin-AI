import { getAllManifests } from '@dos/module-sdk';
const AGENT_DEFINITIONS = [
    { agentCode: 'A01', name: 'Onboarding Agent', boundModules: ['risk', 'foundation'] },
    { agentCode: 'A02', name: 'Identity Provisioning Agent', boundModules: ['compliance'] },
    { agentCode: 'A03', name: 'Framework Mapping Agent', boundModules: ['compliance', 'qiyas'] },
    { agentCode: 'A04', name: 'Control Authoring Agent', boundModules: ['policy', 'governance', 'exception'] },
    { agentCode: 'A05', name: 'Evidence Collection Agent', boundModules: ['evidence'] },
    { agentCode: 'A06', name: 'Gap Remediation Agent', boundModules: ['remediation', 'audit', 'ai-governance'] },
    { agentCode: 'A07', name: 'Risk Register Agent', boundModules: ['incident'] },
    { agentCode: 'A08', name: 'Policy Lifecycle Agent', boundModules: ['vendor'] },
    { agentCode: 'A09', name: 'Third-Party Risk Agent', boundModules: ['bcp'] },
    { agentCode: 'A10', name: 'Audit Reporting Agent', boundModules: ['qiyas', 'reporting'] },
    { agentCode: 'A11', name: 'Business Continuity Agent', boundModules: ['bcp'] },
    { agentCode: 'A12', name: 'Security Awareness & Training Agent', boundModules: ['training'] },
    { agentCode: 'A13', name: 'Policy Review & Landing Copilot', boundModules: ['policy', 'copilot', 'landing'] },
];
const _agentByCode = new Map();
const _agentsByModule = new Map();
function _ensureInitialized() {
    if (_agentByCode.size > 0)
        return;
    for (const def of AGENT_DEFINITIONS) {
        _agentByCode.set(def.agentCode, def);
        for (const mod of def.boundModules) {
            const existing = _agentsByModule.get(mod) || [];
            existing.push(def.agentCode);
            _agentsByModule.set(mod, existing);
        }
    }
}
export function resolveAgentForModule(moduleCode) {
    const manifests = getAllManifests();
    const manifest = manifests.find((m) => m.code === moduleCode);
    const boundAgent = manifest?.agentBinding;
    if (typeof boundAgent === 'string' && boundAgent.length > 0) {
        _ensureInitialized();
        return _agentByCode.get(boundAgent) || { agentCode: boundAgent, name: boundAgent, boundModules: [moduleCode] };
    }
    _ensureInitialized();
    const agents = _agentsByModule.get(moduleCode);
    if (!agents || agents.length === 0)
        return null;
    return _agentByCode.get(agents[0]) || null;
}
export function getAgentsForModule(moduleCode) {
    _ensureInitialized();
    const codes = _agentsByModule.get(moduleCode) || [];
    return codes.map(c => _agentByCode.get(c)).filter(Boolean);
}
export function getModulesForAgent(agentCode) {
    _ensureInitialized();
    const def = _agentByCode.get(agentCode);
    return def ? [...def.boundModules] : [];
}
export function getAgentDefinition(agentCode) {
    _ensureInitialized();
    return _agentByCode.get(agentCode) || null;
}
export function getAllAgentDefinitions() {
    _ensureInitialized();
    return [..._agentByCode.values()];
}
export function getAgentBindingMap() {
    const manifests = getAllManifests();
    const map = {};
    for (const manifest of manifests) {
        map[manifest.code] = manifest.agentBinding ?? null;
    }
    return map;
}
export function getUnboundModules() {
    const manifests = getAllManifests();
    const unbound = [];
    for (const manifest of manifests) {
        if (!manifest.agentBinding) {
            unbound.push(manifest.code);
        }
    }
    return unbound;
}
export function getAgentCapabilities(agentCode) {
    _ensureInitialized();
    const modules = getModulesForAgent(agentCode);
    const manifests = getAllManifests();
    const capabilities = new Set();
    for (const mod of modules) {
        const manifest = manifests.find((m) => m.code === mod);
        if (manifest && manifest.aiCapabilities) {
            for (const cap of manifest.aiCapabilities) {
                capabilities.add(cap);
            }
        }
    }
    return [...capabilities];
}
export function routeModuleToAgent(moduleCode) {
    _ensureInitialized();
    const agent = resolveAgentForModule(moduleCode);
    if (!agent)
        return null;
    const manifests = getAllManifests();
    const manifest = manifests.find((m) => m.code === moduleCode);
    return {
        agentCode: agent.agentCode,
        agentName: agent.name,
        moduleCode,
        capabilities: manifest?.aiCapabilities || [],
        automationLevel: manifest?.automationLevel || null,
    };
}
//# sourceMappingURL=agent-module-routing.service.js.map