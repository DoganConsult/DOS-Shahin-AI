export interface SodRule {
  ruleCode: string;
  description: string;
  conflictingRoles: [string, string];
  severity: 'critical' | 'high' | 'medium';
  mitigatingControl?: string;
}

export const FOUNDATION_SOD_RULES: SodRule[] = [
  {
    ruleCode: 'SOD-001',
    description: 'A user who can create purchase orders cannot also approve them',
    conflictingRoles: ['purchase_order_creator', 'purchase_order_approver'],
    severity: 'critical',
    mitigatingControl: 'Dual-control approval workflow required',
  },
  {
    ruleCode: 'SOD-002',
    description: 'A user who can initiate payments cannot also authorize payments',
    conflictingRoles: ['payment_initiator', 'payment_authorizer'],
    severity: 'critical',
    mitigatingControl: 'Four-eyes principle enforced at payment gateway',
  },
  {
    ruleCode: 'SOD-003',
    description: 'A user who manages vendor master data cannot also process vendor payments',
    conflictingRoles: ['vendor_master_admin', 'payment_initiator'],
    severity: 'critical',
  },
  {
    ruleCode: 'SOD-004',
    description: 'A user who can create users cannot also assign admin-level permissions',
    conflictingRoles: ['user_creator', 'permission_admin'],
    severity: 'high',
    mitigatingControl: 'Privilege access management (PAM) controls apply',
  },
  {
    ruleCode: 'SOD-005',
    description: 'A user who performs financial reconciliation cannot also post journal entries',
    conflictingRoles: ['reconciliation_manager', 'journal_entry_poster'],
    severity: 'critical',
  },
  {
    ruleCode: 'SOD-006',
    description: 'A risk owner cannot also be the control tester for their own risks',
    conflictingRoles: ['risk_owner', 'control_tester'],
    severity: 'high',
    mitigatingControl: 'Independent testing program required',
  },
  {
    ruleCode: 'SOD-007',
    description: 'A policy author cannot also approve their own policies',
    conflictingRoles: ['policy_author', 'policy_approver'],
    severity: 'high',
  },
  {
    ruleCode: 'SOD-008',
    description: 'A user who manages system configurations cannot also perform compliance audits',
    conflictingRoles: ['system_config_admin', 'compliance_auditor'],
    severity: 'medium',
    mitigatingControl: 'Periodic independent audit by external party recommended',
  },
  {
    ruleCode: 'SOD-009',
    description: 'An incident responder cannot also close incidents without peer review',
    conflictingRoles: ['incident_responder', 'incident_closer'],
    severity: 'medium',
    mitigatingControl: 'Peer review workflow enforced for incident closure',
  },
  {
    ruleCode: 'SOD-010',
    description: 'A user who creates exceptions cannot also approve them',
    conflictingRoles: ['exception_creator', 'exception_approver'],
    severity: 'high',
  },
];
