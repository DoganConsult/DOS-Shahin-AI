export async function evaluateGate(_tenantId, _gateType, _context) { return { passed: true }; }
export async function getGateStatus(_tenantId, _gateType) { return { status: 'open' }; }
export async function overrideGate(_tenantId, _gateId, _override) { return { overridden: true }; }
export async function listGates(_tenantId) { return []; }
export async function getGateHistory(_tenantId, _gateId) { return []; }
export async function approveGateOverride(_tenantId, _gateId) { return { approved: true }; }
//# sourceMappingURL=enforcement-gate.service.js.map