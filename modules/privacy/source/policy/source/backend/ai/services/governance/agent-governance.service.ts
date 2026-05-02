// Cross-module proxy placeholder: canonical agent-governance.service lives in
// services/ai-engine-service/src/runtime/ai/services/governance/. Modules
// cannot import from service paths cleanly within tsconfig.modules.json, so
// this file is a minimum-shape stub that matches the canonical signature.
// Runtime: consumers should route through an explicit DI adapter or the
// ai-engine-service HTTP endpoints when the full extraction lands.

export type PermissionAction = 'execute' | 'read' | 'write' | 'delete' | 'admin';
export type PermissionLevel = 'allow' | 'deny' | 'approval_required';
export type GateStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type GateDecision = 'approved' | 'rejected';

export interface ToolPermission {
  agentCode: string;
  toolCode: string;
  action: PermissionAction;
  level: PermissionLevel;
}
export interface ToolPermissionCheck {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}
export interface HITLGate {
  gateId: string;
  tenantId: string;
  agentCode: string;
  toolCode: string;
  status: GateStatus;
  decision?: GateDecision;
}
export interface HITLGateInput {
  agentCode: string;
  toolCode: string;
  action: PermissionAction;
  payload?: Record<string, unknown>;
}
export interface AgentAuditEntry {
  entryId: string;
  agentCode: string;
  toolCode: string;
  action: PermissionAction;
  timestamp: string;
}

export async function checkToolPermission(_tenantId: string, _agent: string, _tool: string, _action: PermissionAction): Promise<ToolPermissionCheck> {
  return { allowed: false, requiresApproval: true, reason: 'cross-module stub — ai-engine-service not reachable from policy module' };
}
export async function getAgentPermissions(_tenantId: string, _agent: string): Promise<ToolPermission[]> {
  return [];
}
export async function updateToolPermission(_tenantId: string, _perm: ToolPermission): Promise<void> {
  return;
}
export async function createHITLGate(_tenantId: string, _input: HITLGateInput): Promise<HITLGate> {
  return { gateId: '', tenantId: _tenantId, agentCode: _input.agentCode, toolCode: _input.toolCode, status: 'pending' };
}
export async function resolveHITLGate(_tenantId: string, _gateId: string, _decision: GateDecision): Promise<HITLGate | null> {
  return null;
}
export async function getActiveGates(_tenantId: string): Promise<HITLGate[]> {
  return [];
}
export async function expireOverdueGates(_tenantId: string): Promise<number> {
  return 0;
}
export async function getAgentAuditTrail(_tenantId: string, _agent: string): Promise<AgentAuditEntry[]> {
  return [];
}
