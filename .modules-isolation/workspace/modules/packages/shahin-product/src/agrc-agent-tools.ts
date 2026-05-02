import { z } from 'zod';
import type { AgentToolDef } from '@dos/types';

export const AGRC_AGENT_TOOLS: Record<string, AgentToolDef[]> = {
  // A01: Onboarding Agent
  A01: [
    {
      toolName: 'validate_workspace_profile',
      description: 'Validates a new workspace configuration for regulatory completeness',
      schema: z.object({
        tenantId: z.string(),
        frameworks: z.array(z.string()),
        industryCode: z.string().optional()
      }).describe("Parameters needed to check workspace readiness.")
    }
  ],
  
  // A02: Identity Provisioning
  A02: [
    {
      toolName: 'detect_access_anomalies',
      description: 'Scans the RBAC matrix to detect SOD violations or over-privileged users',
      schema: z.object({
        tenantId: z.string(),
        userIds: z.array(z.string()).optional()
      }).describe("Run identity review against specified or all users.")
    }
  ],

  // A03: Framework Mapping
  A03: [
    {
      toolName: 'map_framework_controls',
      description: 'Discovers cross-framework similarities to map controls between standards',
      schema: z.object({
        sourceFramework: z.string(),
        targetFramework: z.string(),
        confidenceThreshold: z.number().default(0.8)
      }).describe("Map regulatory standards.")
    }
  ],

  // A04: Control Authoring
  A04: [
    {
      toolName: 'draft_control_guidance',
      description: 'Generates control test procedures and implementation guidance',
      schema: z.object({
        controlId: z.string(),
        frameworkId: z.string()
      }).describe("Draft procedural language for a specific control.")
    }
  ],

  // A05: Evidence Collection
  A05: [
    {
      toolName: 'check_evidence_freshness',
      description: 'Scans mapped artifacts to ensure SLA compliance against schedules',
      schema: z.object({
        controlId: z.string().optional(),
        stalenessDays: z.number().default(30)
      }).describe("Find expired evidence.")
    }
  ],

  // A06: Gap Remediation
  A06: [
    {
      toolName: 'generate_remediation_roadmap',
      description: 'Analyzes audit failures and drafts a stepwise remediation project plan',
      schema: z.object({
        assessmentId: z.string(),
        targetDate: z.string().optional()
      }).describe("Creates remediation strategy tasks.")
    }
  ],

  // A07: Risk Register
  A07: [
    {
      toolName: 'score_inherent_risk',
      description: 'Executes risk calculation algorithms across unregistered incident records',
      schema: z.object({
        riskIds: z.array(z.string()),
        matrixType: z.enum(['3x3', '5x5']).default('5x5')
      }).describe("Calculate risk parameters.")
    }
  ],

  // A08: Policy Lifecycle
  A08: [
    {
      toolName: 'check_policy_expiry',
      description: 'Finds policies that have breached review schedules',
      schema: z.object({
        tenantId: z.string()
      }).describe("Policy staleness check.")
    }
  ],

  // A09: Third-Party Risk
  A09: [
    {
      toolName: 'assess_vendor_sla',
      description: 'Analyzes vendor uptime and SLA commitments vs actual performance',
      schema: z.object({
        vendorId: z.string(),
        slaTarget: z.number().default(99.9)
      }).describe("Third-party compliance check.")
    }
  ],

  // A10: Audit Reporting
  A10: [
    {
      toolName: 'generate_readiness_score',
      description: 'Calculates overall audit readiness percentage across modules',
      schema: z.object({
        frameworkId: z.string()
      }).describe("Aggregates completeness metrics.")
    }
  ],

  // A11: BCP Continuity
  A11: [
    {
      toolName: 'detect_rto_drift',
      description: 'Calculates the differential between actual recovery time and stated RTO targets',
      schema: z.object({
        biaId: z.string(),
        exerciseId: z.string()
      }).describe("BCP dependency analysis.")
    }
  ],

  // A12: Security Awareness
  A12: [
    {
      toolName: 'identify_training_gaps',
      description: 'Cross-references role requirements with completed LMS modules',
      schema: z.object({
        targetAudienceRole: z.string()
      }).describe("Training compliance.")
    }
  ]
};
