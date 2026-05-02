import { z } from 'zod';
import { safeQuery } from "@dos/db";

const AgentActionSchema = z.object({
  type: z.enum([
    'create_task', 'send_notification', 'publish_event', 'flag_risk',
    'request_evidence', 'create_control', 'update_risk_score', 'create_finding',
    'close_incident', 'update_control_status', 'create_remediation', 'escalate', 'trigger_sync',
  ]),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(200).optional(),
  assignToRole: z.string().max(100).optional(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const AgentResponseSchema = z.object({
  actions: z.array(AgentActionSchema).max(20),
  summary: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const RiskAssessmentSchema = z.object({
  riskId: z.string(),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  riskScore: z.number().min(0).max(25),
  category: z.string(),
  treatment: z.enum(['accept', 'mitigate', 'transfer', 'avoid']),
  reasoning: z.string(),
});

const PolicyDraftSchema = z.object({
  title: z.string().min(5).max(500),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
  })).min(1),
  framework: z.string().optional(),
  language: z.enum(['en', 'ar', 'both']).optional(),
});

const GapAnalysisSchema = z.object({
  frameworkId: z.string(),
  totalControls: z.number().int().min(0),
  compliantControls: z.number().int().min(0),
  gaps: z.array(z.object({
    controlId: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    recommendation: z.string(),
  })),
  complianceScore: z.number().min(0).max(100),
});

const SCHEMA_MAP: Record<string, z.ZodSchema> = {
  agent_response: AgentResponseSchema,
  agent_action: AgentActionSchema,
  risk_assessment: RiskAssessmentSchema,
  policy_draft: PolicyDraftSchema,
  gap_analysis: GapAnalysisSchema,
};

export interface ValidationResult {
  valid: boolean;
  data?: any;
  errors?: string[];
  schema: string;
}

export function validateAgentOutput(schemaName: string, data: unknown): ValidationResult {
  const schema = SCHEMA_MAP[schemaName];
  if (!schema) {
    return { valid: true, data, schema: schemaName, errors: ['Unknown schema — passed through'] };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data, schema: schemaName };
  }

  const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  return { valid: false, errors, schema: schemaName };
}

export function parseAndValidateJSON(raw: string, schemaName: string): ValidationResult {
  let parsed: unknown;
  try {
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
    parsed = JSON.parse(jsonStr);
  } catch {
    return { valid: false, errors: ['Failed to parse JSON from LLM output'], schema: schemaName };
  }

  return validateAgentOutput(schemaName, parsed);
}

export function sanitizeAgentOutput(data: unknown): unknown {
  if (typeof data === 'string') {
    return data
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  if (Array.isArray(data)) return data.map(sanitizeAgentOutput);
  if (data && typeof data === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      cleaned[key] = sanitizeAgentOutput(val);
    }
    return cleaned;
  }
  return data;
}

export { AgentActionSchema, AgentResponseSchema, RiskAssessmentSchema, PolicyDraftSchema, GapAnalysisSchema };
