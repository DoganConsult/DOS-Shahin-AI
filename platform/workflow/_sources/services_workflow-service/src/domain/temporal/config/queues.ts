// ============================================
// Temporal Task Queue Constants
// Maps each workflow domain to a dedicated queue
// ============================================

export const TASK_QUEUES = {
  PROVISIONING: 'agrc-provisioning',
  QUALITY_GATE: 'agrc-quality-gate',
  SLA: 'agrc-sla',
  AGENT: 'agrc-agent',
  EVIDENCE: 'agrc-evidence',
  GENERAL: 'agrc-general',
  COMPLIANCE: 'agrc-compliance',
  RISK: 'agrc-risk',
  REPORTS: 'agrc-reports',
} as const;

export type TaskQueueName = (typeof TASK_QUEUES)[keyof typeof TASK_QUEUES];
