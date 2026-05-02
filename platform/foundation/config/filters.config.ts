/**
 * Static filter-option catalog for the Foundation module. Reusable across
 * list/form/detail variants. Endpoint-driven options live in the variant
 * configs themselves; this file only holds enumerations stable enough to
 * ship as code.
 */
import { FOUNDATION_PERMISSION_CODES } from '../contracts/foundation.permissions';

export const FOUNDATION_STATUS_FILTER_OPTIONS = [
  { value: 'draft',     labelKey: 'foundation.status.draft' },
  { value: 'in_review', labelKey: 'foundation.status.in_review' },
  { value: 'approved',  labelKey: 'foundation.status.approved' },
  { value: 'published', labelKey: 'foundation.status.published' },
  { value: 'active',    labelKey: 'foundation.status.active' },
  { value: 'suspended', labelKey: 'foundation.status.suspended' },
  { value: 'archived',  labelKey: 'foundation.status.archived' },
] as const;

export const FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS = [
  { value: 'organization',  labelKey: 'foundation.nav.organization' },
  { value: 'business_unit', labelKey: 'foundation.nav.businessUnits' },
  { value: 'department',    labelKey: 'foundation.nav.departments' },
  { value: 'position',      labelKey: 'foundation.nav.positions' },
  { value: 'legal_entity',  labelKey: 'foundation.nav.organization' },
] as const;

export const FOUNDATION_PERMISSION_FILTER_VALUES =
  Object.values(FOUNDATION_PERMISSION_CODES);
