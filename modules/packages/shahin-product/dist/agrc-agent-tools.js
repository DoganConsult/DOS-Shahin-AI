"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGRC_AGENT_TOOLS = void 0;
const zod_1 = require("zod");
exports.AGRC_AGENT_TOOLS = {
    // A01: Onboarding Agent
    A01: [
        {
            toolName: 'validate_workspace_profile',
            description: 'Validates a new workspace configuration for regulatory completeness',
            schema: zod_1.z.object({
                tenantId: zod_1.z.string(),
                frameworks: zod_1.z.array(zod_1.z.string()),
                industryCode: zod_1.z.string().optional()
            }).describe("Parameters needed to check workspace readiness.")
        }
    ],
    // A02: Identity Provisioning
    A02: [
        {
            toolName: 'detect_access_anomalies',
            description: 'Scans the RBAC matrix to detect SOD violations or over-privileged users',
            schema: zod_1.z.object({
                tenantId: zod_1.z.string(),
                userIds: zod_1.z.array(zod_1.z.string()).optional()
            }).describe("Run identity review against specified or all users.")
        }
    ],
    // A03: Framework Mapping
    A03: [
        {
            toolName: 'map_framework_controls',
            description: 'Discovers cross-framework similarities to map controls between standards',
            schema: zod_1.z.object({
                sourceFramework: zod_1.z.string(),
                targetFramework: zod_1.z.string(),
                confidenceThreshold: zod_1.z.number().default(0.8)
            }).describe("Map regulatory standards.")
        }
    ],
    // A04: Control Authoring
    A04: [
        {
            toolName: 'draft_control_guidance',
            description: 'Generates control test procedures and implementation guidance',
            schema: zod_1.z.object({
                controlId: zod_1.z.string(),
                frameworkId: zod_1.z.string()
            }).describe("Draft procedural language for a specific control.")
        }
    ],
    // A05: Evidence Collection
    A05: [
        {
            toolName: 'check_evidence_freshness',
            description: 'Scans mapped artifacts to ensure SLA compliance against schedules',
            schema: zod_1.z.object({
                controlId: zod_1.z.string().optional(),
                stalenessDays: zod_1.z.number().default(30)
            }).describe("Find expired evidence.")
        }
    ],
    // A06: Gap Remediation
    A06: [
        {
            toolName: 'generate_remediation_roadmap',
            description: 'Analyzes audit failures and drafts a stepwise remediation project plan',
            schema: zod_1.z.object({
                assessmentId: zod_1.z.string(),
                targetDate: zod_1.z.string().optional()
            }).describe("Creates remediation strategy tasks.")
        }
    ],
    // A07: Risk Register
    A07: [
        {
            toolName: 'score_inherent_risk',
            description: 'Executes risk calculation algorithms across unregistered incident records',
            schema: zod_1.z.object({
                riskIds: zod_1.z.array(zod_1.z.string()),
                matrixType: zod_1.z.enum(['3x3', '5x5']).default('5x5')
            }).describe("Calculate risk parameters.")
        }
    ],
    // A08: Policy Lifecycle
    A08: [
        {
            toolName: 'check_policy_expiry',
            description: 'Finds policies that have breached review schedules',
            schema: zod_1.z.object({
                tenantId: zod_1.z.string()
            }).describe("Policy staleness check.")
        }
    ],
    // A09: Third-Party Risk
    A09: [
        {
            toolName: 'assess_vendor_sla',
            description: 'Analyzes vendor uptime and SLA commitments vs actual performance',
            schema: zod_1.z.object({
                vendorId: zod_1.z.string(),
                slaTarget: zod_1.z.number().default(99.9)
            }).describe("Third-party compliance check.")
        }
    ],
    // A10: Audit Reporting
    A10: [
        {
            toolName: 'generate_readiness_score',
            description: 'Calculates overall audit readiness percentage across modules',
            schema: zod_1.z.object({
                frameworkId: zod_1.z.string()
            }).describe("Aggregates completeness metrics.")
        }
    ],
    // A11: BCP Continuity
    A11: [
        {
            toolName: 'detect_rto_drift',
            description: 'Calculates the differential between actual recovery time and stated RTO targets',
            schema: zod_1.z.object({
                biaId: zod_1.z.string(),
                exerciseId: zod_1.z.string()
            }).describe("BCP dependency analysis.")
        }
    ],
    // A12: Security Awareness
    A12: [
        {
            toolName: 'identify_training_gaps',
            description: 'Cross-references role requirements with completed LMS modules',
            schema: zod_1.z.object({
                targetAudienceRole: zod_1.z.string()
            }).describe("Training compliance.")
        }
    ]
};
//# sourceMappingURL=agrc-agent-tools.js.map