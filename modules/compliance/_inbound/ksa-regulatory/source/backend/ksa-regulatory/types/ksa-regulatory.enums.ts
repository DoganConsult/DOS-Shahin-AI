export const KSA_AUTHORITIES = [
  'SAMA', 'NCA', 'CMA', 'NDMO', 'CITC', 'SDAIA', 'ZATCA', 'MOH', 'MISA',
] as const;

export type KsaAuthority = typeof KSA_AUTHORITIES[number];

export const KSA_FRAMEWORK_CODES = [
  'SAMA-CSF', 'NCA-ECC', 'NCA-DCC', 'NCA-CCC', 'NCA-OTCC', 'PDPL', 'CST',
] as const;

export const REGULATORY_CHANGE_TYPES = [
  'new_regulation', 'amendment', 'guidance', 'circular', 'enforcement',
] as const;

export const MATURITY_LEVELS = {
  INITIAL: 1,
  MANAGED: 2,
  DEFINED: 3,
  QUANTITATIVELY_MANAGED: 4,
  OPTIMIZING: 5,
} as const;

export const OBLIGATION_STATUS_ENUM = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLIANT: 'compliant',
  NON_COMPLIANT: 'non_compliant',
  WAIVED: 'waived',
  ARCHIVED: 'archived',
} as const;
