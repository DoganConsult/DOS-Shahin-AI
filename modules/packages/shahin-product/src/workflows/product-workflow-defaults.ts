/**
 * Shahin-AI Product Workflow Defaults — Patch 4 §2.5
 *
 * Product-level workflow bundles, defaults, and mode overrides.
 * Defines how Shahin-AI GRC modules consume the DOS 3-level
 * workflow engine and which operating mode each module defaults to.
 *
 * @owner product/shahin-ai
 * @since 2026-03-31
 */

import type { WorkflowMode } from '@dos/platform-core/workflows/modes';
import type { RiskClassification, WorkflowLevel } from '@dos/platform-core/workflows/integration';

export interface ProductModuleWorkflowDefault {
  moduleCode: string;
  defaultMode: WorkflowMode;
  protectedTransitions: string[];
  riskOverrides: Record<string, RiskClassification>;
  requiredWorkflowLevel: WorkflowLevel;
}

export const SHAHIN_AI_WORKFLOW_DEFAULTS: ProductModuleWorkflowDefault[] = [
  {
    moduleCode: 'risk',
    defaultMode: 'enterprise',
    protectedTransitions: ['assessed→active', 'active→accepted', 'accepted→closed'],
    riskOverrides: { risk_register: 'high', risk_treatment: 'medium', risk_assessment: 'high' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'compliance',
    defaultMode: 'enterprise',
    protectedTransitions: ['in_review→approved', 'approved→active'],
    riskOverrides: { compliance_framework: 'high', compliance_assessment: 'high', compliance_obligation: 'medium' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'audit',
    defaultMode: 'enterprise',
    protectedTransitions: ['review→issued', 'issued→closed'],
    riskOverrides: { audit: 'critical', audit_finding: 'high', audit_schedule: 'medium' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'policy',
    defaultMode: 'standard',
    protectedTransitions: ['review→approved', 'approved→published'],
    riskOverrides: { policy: 'high', policy_exception: 'medium' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'incident',
    defaultMode: 'enterprise',
    protectedTransitions: ['investigating→resolved', 'resolved→closed'],
    riskOverrides: { incident: 'critical', incident_response: 'high' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'controls',
    defaultMode: 'standard',
    protectedTransitions: ['in_review→approved', 'active→retired'],
    riskOverrides: { control: 'medium', control_testing: 'medium' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'evidence',
    defaultMode: 'standard',
    protectedTransitions: ['under_review→approved'],
    riskOverrides: { evidence_item: 'medium', evidence_collection: 'low' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'vendor',
    defaultMode: 'enterprise',
    protectedTransitions: ['in_review→approved', 'active→terminated'],
    riskOverrides: { vendor: 'high', vendor_engagement: 'medium', vendor_risk_assessment: 'high' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'exception',
    defaultMode: 'enterprise',
    protectedTransitions: ['under_review→approved', 'approved→revoked'],
    riskOverrides: { exception: 'high', exception_renewal: 'medium' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'remediation',
    defaultMode: 'standard',
    protectedTransitions: ['pending_verification→closed'],
    riskOverrides: { remediation_plan: 'medium', remediation_action: 'medium' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'governance',
    defaultMode: 'enterprise',
    protectedTransitions: ['under_review→approved'],
    riskOverrides: { governance_body: 'high', governance_decision: 'critical' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'ai-governance',
    defaultMode: 'enterprise',
    protectedTransitions: ['in_review→approved', 'approved→deployed'],
    riskOverrides: { ai_model: 'critical', ai_risk_assessment: 'high' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'reporting',
    defaultMode: 'standard',
    protectedTransitions: ['in_review→approved'],
    riskOverrides: { report_definition: 'medium', report_template: 'low' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'analytics',
    defaultMode: 'standard',
    protectedTransitions: ['in_review→approved'],
    riskOverrides: { metric_definition: 'medium', analytics_snapshot: 'low' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'training',
    defaultMode: 'express',
    protectedTransitions: ['in_review→approved'],
    riskOverrides: { training_program: 'low', training_assignment: 'low' },
    requiredWorkflowLevel: 'operational',
  },
  {
    moduleCode: 'privacy',
    defaultMode: 'enterprise',
    protectedTransitions: ['in_review→approved', 'active→archived'],
    riskOverrides: { dpia: 'critical', privacy_record: 'high' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'bcp',
    defaultMode: 'enterprise',
    protectedTransitions: ['in_review→approved', 'active→invoked'],
    riskOverrides: { bcp_plan: 'critical', bia: 'high' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'asset',
    defaultMode: 'standard',
    protectedTransitions: ['in_review→approved', 'active→decommissioned'],
    riskOverrides: { asset: 'medium', asset_classification: 'medium' },
    requiredWorkflowLevel: 'managerial',
  },
  {
    moduleCode: 'dora',
    defaultMode: 'enterprise',
    protectedTransitions: ['in_review→approved'],
    riskOverrides: { dora_assessment: 'high', dora_ict_risk: 'critical' },
    requiredWorkflowLevel: 'executive',
  },
  {
    moduleCode: 'issues',
    defaultMode: 'standard',
    protectedTransitions: ['investigating→resolved', 'resolved→closed'],
    riskOverrides: { issue: 'medium' },
    requiredWorkflowLevel: 'managerial',
  },
];

const defaultsMap = new Map<string, ProductModuleWorkflowDefault>();
SHAHIN_AI_WORKFLOW_DEFAULTS.forEach(d => defaultsMap.set(d.moduleCode, d));

export function getProductWorkflowDefault(moduleCode: string): ProductModuleWorkflowDefault | null {
  return defaultsMap.get(moduleCode) ?? null;
}

export function getProductWorkflowMode(moduleCode: string): WorkflowMode {
  return defaultsMap.get(moduleCode)?.defaultMode ?? 'standard';
}

export function isProtectedTransition(moduleCode: string, transition: string): boolean {
  const defaults = defaultsMap.get(moduleCode);
  if (!defaults) return false;
  return defaults.protectedTransitions.includes(transition);
}

export function getEntityRiskClassification(moduleCode: string, entityType: string): RiskClassification {
  const defaults = defaultsMap.get(moduleCode);
  if (!defaults) return 'medium';
  return defaults.riskOverrides[entityType] ?? 'medium';
}
