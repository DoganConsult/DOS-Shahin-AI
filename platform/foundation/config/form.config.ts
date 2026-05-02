/**
 * Runtime form config for the Foundation module.
 *   GET /api/module-config/foundation/form/:variant
 */
export interface FormFieldConfig {
  key: string;
  labelKey: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'boolean' | 'number' | 'reference';
  required?: boolean;
  pattern?: string;
  optionsEndpoint?: string;
  validatorRefs?: string[];
  permission?: string;
}

export interface FormVariantConfig {
  variant: string;
  submitEndpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  fields: FormFieldConfig[];
  approvalRequired?: boolean;
  schemaRef: string;
}

const baseEntityFields: FormFieldConfig[] = [
  { key: 'code',     labelKey: 'foundation.fields.code',   type: 'text',     required: true,  pattern: '^[A-Z0-9_-]{2,32}$' },
  { key: 'nameEn',   labelKey: 'foundation.fields.nameEn', type: 'text',     required: true },
  { key: 'nameAr',   labelKey: 'foundation.fields.nameAr', type: 'text' },
  { key: 'parentId', labelKey: 'foundation.fields.parent', type: 'reference', optionsEndpoint: '/api/foundation/organizations?status=active&limit=200' },
  { key: 'ownerId',  labelKey: 'foundation.fields.owner',  type: 'reference', optionsEndpoint: '/api/users?status=active&limit=200' },
];

export const FOUNDATION_FORM_CONFIGS: Record<string, FormVariantConfig> = {
  'organization-create': {
    variant: 'organization-create',
    submitEndpoint: '/api/foundation/organizations',
    method: 'POST',
    schemaRef: 'foundationNodeCreateBody',
    approvalRequired: false,
    fields: baseEntityFields,
  },
  'business-unit-create': {
    variant: 'business-unit-create',
    submitEndpoint: '/api/foundation/business-units',
    method: 'POST',
    schemaRef: 'foundationNodeCreateBody',
    approvalRequired: false,
    fields: baseEntityFields,
  },
  'department-create': {
    variant: 'department-create',
    submitEndpoint: '/api/foundation/departments',
    method: 'POST',
    schemaRef: 'foundationNodeCreateBody',
    approvalRequired: false,
    fields: baseEntityFields,
  },
};
