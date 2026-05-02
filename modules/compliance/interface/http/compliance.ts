export const COMPLIANCE_CONTROL_STATUSES = [
  'not_started',
  'in_progress',
  'implemented',
  'effective',
  'ineffective',
  'not_applicable',
] as const;

export type ControlStatus = typeof COMPLIANCE_CONTROL_STATUSES[number];

export function isControlStatus(value: unknown): value is ControlStatus {
  return typeof value === 'string' && (COMPLIANCE_CONTROL_STATUSES as readonly string[]).includes(value);
}

export interface ComplianceFramework {
  id: string;
  code: string;
  name: string;
  version: string;
  status: 'active' | 'draft' | 'deprecated';
}

export interface ComplianceObligation {
  id: string;
  frameworkId: string;
  code: string;
  title: string;
  description?: string;
  status: ControlStatus;
}
