import { Request, Response, NextFunction } from 'express';

type FieldRule = {
  field: string;
  label: string;
};

type StageGateRule = {
  targetStatus: string;
  requiredFields: FieldRule[];
  message: string;
};

type RuleMap<T> = Record<string, T[]>;

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const STAGE_GATE_METHODS = new Set(['PUT', 'PATCH']);

function isMissing(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function collectMissingFields(body: Record<string, any> | undefined, rules: FieldRule[]): string[] {
  return rules.filter(rule => isMissing(body?.[rule.field])).map(rule => rule.label);
}

export const MODULE_RULES: RuleMap<FieldRule> = {
  policy: [
    { field: 'owner', label: 'Policy owner' },
    { field: 'title', label: 'Policy title' },
    { field: 'review_frequency', label: 'Review frequency' },
  ],
  risk: [
    { field: 'owner', label: 'Risk owner' },
    { field: 'treatment_plan', label: 'Treatment plan' },
  ],
  incident: [
    { field: 'title', label: 'Incident title' },
    { field: 'severity', label: 'Severity' },
  ],
  control: [
    { field: 'owner', label: 'Control owner' },
    { field: 'control_type', label: 'Control type' },
  ],
  exception: [
    { field: 'owner', label: 'Exception owner' },
    { field: 'justification', label: 'Justification' },
  ],
  evidence: [
    { field: 'source', label: 'Evidence source' },
    { field: 'owner', label: 'Evidence owner' },
  ],
  finding: [
    { field: 'title', label: 'Finding title' },
    { field: 'severity', label: 'Finding severity' },
  ],
  decision: [
    { field: 'decision_text', label: 'Decision text' },
    { field: 'authority_source', label: 'Authority source' },
    { field: 'rationale', label: 'Decision rationale' },
  ],
  delegation: [
    { field: 'delegatee', label: 'Delegatee' },
    { field: 'expiry_date', label: 'Expiry date' },
  ],
  committee: [
    { field: 'name', label: 'Committee name' },
    { field: 'chair', label: 'Committee chair' },
  ],
  charter: [
    { field: 'name', label: 'Charter name' },
    { field: 'owner', label: 'Charter owner' },
  ],
  audit: [
    { field: 'title', label: 'Audit title' },
    { field: 'owner', label: 'Audit owner' },
  ],
  bcp: [
    { field: 'name', label: 'BCP name' },
    { field: 'owner', label: 'BCP owner' },
  ],
  asset: [
    { field: 'name', label: 'Asset name' },
    { field: 'owner', label: 'Asset owner' },
  ],
  workflow: [
    { field: 'name', label: 'Workflow name' },
    { field: 'owner', label: 'Workflow owner' },
  ],
  remediation: [
    { field: 'title', label: 'Remediation title' },
    { field: 'owner', label: 'Remediation owner' },
  ],
  vendor: [
    { field: 'name', label: 'Vendor name' },
    { field: 'owner', label: 'Vendor owner' },
  ],
  action: [
    { field: 'title', label: 'Action title' },
    { field: 'owner', label: 'Action owner' },
  ],
  governance: [
    { field: 'title', label: 'Governance title' },
    { field: 'owner', label: 'Governance owner' },
  ],
  training: [
    { field: 'title', label: 'Training title' },
    { field: 'owner', label: 'Training owner' },
  ],
};

export const STAGE_GATE_RULES: RuleMap<StageGateRule> = {
  policy: [
    {
      targetStatus: 'active',
      requiredFields: [
        { field: 'approved_by', label: 'Approver' },
        { field: 'owner', label: 'Policy owner' },
        { field: 'review_date', label: 'Review date' },
      ],
      message: 'Policy cannot move to active without approver, owner, and review date.',
    },
  ],
  incident: [
    {
      targetStatus: 'closed',
      requiredFields: [
        { field: 'root_cause', label: 'Root cause' },
        { field: 'resolution', label: 'Resolution' },
      ],
      message: 'Incident closure requires root cause and resolution.',
    },
  ],
  risk: [
    {
      targetStatus: 'closed',
      requiredFields: [{ field: 'disposition_reason', label: 'Disposition reason' }],
      message: 'Risk closure requires a disposition reason.',
    },
  ],
  control: [
    {
      targetStatus: 'effective',
      requiredFields: [
        { field: 'linked_evidence', label: 'Linked evidence' },
        { field: 'last_test_date', label: 'Last test date' },
      ],
      message: 'Control effectiveness requires linked evidence and last test date.',
    },
  ],
};

export function mandatoryFields(moduleCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!WRITE_METHODS.has(req.method)) { next(); return; }

    const rules = MODULE_RULES[moduleCode];
    if (!rules || rules.length === 0) { next(); return; }

    const missing = collectMissingFields(req.body, rules);
    if (missing.length > 0) {
      res.status(422).json({
        error: 'Missing mandatory fields',
        code: 'MANDATORY_FIELDS_MISSING',
        module: moduleCode,
        missingFields: missing,
      });
      return;
    }

    if (STAGE_GATE_METHODS.has(req.method)) {
      const stageRules = STAGE_GATE_RULES[moduleCode];
      const targetStatus = req.body?.status;
      if (stageRules && targetStatus) {
        for (const gate of stageRules) {
          if (gate.targetStatus === targetStatus) {
            const gateMissing = collectMissingFields(req.body, gate.requiredFields);
            if (gateMissing.length > 0) {
              res.status(422).json({
                error: gate.message,
                code: 'STAGE_GATE_VIOLATION',
                module: moduleCode,
                targetStatus,
                missingFields: gateMissing,
              });
              return;
            }
          }
        }
      }
    }

    next();
  };
}
