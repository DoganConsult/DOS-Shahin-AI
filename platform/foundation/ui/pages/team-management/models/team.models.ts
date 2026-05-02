/**
 * Shared interfaces and constants for the Team Management module.
 */

export interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  task_count?: number;
  avatar?: string;
}

export interface Team {
  team_id: string;
  name: string;
  name_en: string;
  name_ar: string;
  description?: string;
  team_lead?: string;
  members: TeamMember[];
  member_count: number;
  linked_control_groups: string[];
  linked_workflows: string[];
}

export interface RoleProfile {
  role: string;
  label_en: string;
  label_ar: string;
  permissions: string[];
  description_en?: string;
  description_ar?: string;
}

export const RACI_ROLES = ['responsible', 'accountable', 'consulted', 'informed'] as const;
export const SCOPE_TYPES = ['policy', 'workflow', 'process', 'control_group'] as const;

/** Dropdown option for invite role picker */
export const INVITE_ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'User', value: 'user' },
  { label: 'CISO', value: 'ciso' },
  { label: 'Compliance Officer', value: 'compliance_officer' },
  { label: 'Risk Manager', value: 'risk_manager' },
  { label: 'Auditor', value: 'auditor' },
  { label: 'Internal Auditor', value: 'internal_auditor' },
  { label: 'Data Protection Officer', value: 'dpo' },
  { label: 'ERM Lead', value: 'erm_lead' },
  { label: 'IT Security', value: 'it_security' },
  { label: 'Business Continuity Lead', value: 'bc_lead' },
  { label: 'Legal Counsel', value: 'legal_counsel' },
  { label: 'HR Lead', value: 'hr_lead' },
  { label: 'Viewer', value: 'viewer' },
  { label: 'Vendor Contact', value: 'vendor_contact' },
  { label: 'External Auditor', value: 'external_auditor' },
  { label: 'Regulator Inspector', value: 'regulator_inspector' },
  { label: 'Consultant Administrator', value: 'consultant_admin' },
];

/** Dropdown option for team member role picker */
export const TEAM_ROLE_OPTIONS = [
  { label: 'Lead', value: 'lead' },
  { label: 'Member', value: 'member' },
  { label: 'Reviewer', value: 'reviewer' },
  { label: 'Approver', value: 'approver' },
  { label: 'Observer', value: 'observer' },
];

/** Staffing employee band options */
export const STAFFING_RANGE_OPTIONS = [
  { label: 'All Sizes', value: '*' },
  { label: 'Micro (1-10)', value: 'micro' },
  { label: 'Small (11-50)', value: 'small' },
  { label: 'Medium (51-250)', value: 'medium' },
  { label: 'Large (251-1000)', value: 'large' },
  { label: 'Enterprise (1000+)', value: 'enterprise' },
];

/** Staffing sector options */
export const STAFFING_SECTOR_OPTIONS = [
  { label: 'All Sectors', value: '*' },
  { label: 'Banking & Finance', value: 'banking' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Telecom', value: 'telecom' },
  { label: 'Energy & Utilities', value: 'energy' },
  { label: 'Government', value: 'government' },
  { label: 'Education', value: 'education' },
  { label: 'Retail & E-Commerce', value: 'retail' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Technology', value: 'technology' },
  { label: 'Insurance', value: 'insurance' },
];
