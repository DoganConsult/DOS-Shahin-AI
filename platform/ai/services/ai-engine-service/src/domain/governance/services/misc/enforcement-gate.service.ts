
export async function evaluateGate(_tenantId: string, _gateType: string, _context: any): Promise<{ passed: boolean; reason?: string }> { return { passed: true }; }
export async function getGateStatus(_tenantId: string, _gateType: string): Promise<any> { return { status: 'open' }; }
export async function overrideGate(_tenantId: string, _gateId: string, _override: any): Promise<any> { return { overridden: true }; }
export async function listGates(_tenantId: string): Promise<any[]> { return []; }
export async function getGateHistory(_tenantId: string, _gateId: string): Promise<any[]> { return []; }
export async function approveGateOverride(_tenantId: string, _gateId: string): Promise<any> { return { approved: true }; }
