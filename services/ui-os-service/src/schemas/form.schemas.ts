import { z } from 'zod';

const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);

export const FormDefinitionCreateSchema = z.object({
  form_key: z.string().min(1).max(150),
  version: z.number().int().positive().optional(),
  module_code: z.string().max(100).nullable().optional(),
  product_code: z.string().max(100).nullable().optional(),
  entity_kind: z.string().max(100).nullable().optional(),
  submit_workflow_code: z.string().max(150).nullable().optional(),
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
});

export const FormDefinitionPatchSchema = z.object({
  module_code: z.string().max(100).nullable().optional(),
  product_code: z.string().max(100).nullable().optional(),
  entity_kind: z.string().max(100).nullable().optional(),
  submit_workflow_code: z.string().max(150).nullable().optional(),
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const FormSectionSchema = z.object({
  section_key: z.string().min(1).max(150),
  display_order: z.number().int().min(0).optional(),
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  is_collapsible: z.boolean().optional(),
  default_collapsed: z.boolean().optional(),
});

const FIELD_KIND = z.enum([
  'text','textarea','number','integer','boolean','date','datetime',
  'select','multiselect','radio','checkbox','file','user_picker',
  'entity_picker','rich_text','signature','json','rating',
]);

export const FormFieldSchema = z.object({
  field_key: z.string().min(1).max(150),
  field_kind: FIELD_KIND,
  display_order: z.number().int().min(0).optional(),
  label_key: z.string().max(150).nullable().optional(),
  help_key: z.string().max(200).nullable().optional(),
  placeholder_key: z.string().max(150).nullable().optional(),
  width_units: z.number().int().min(1).max(12).optional(),
  is_readonly: z.boolean().optional(),
  is_required: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const FormFieldRuleSchema = z.object({
  rule_kind: z.enum(['visible_when','required_when','enabled_when','value_when']),
  expression: z.record(z.unknown()).optional(),
  message_key: z.string().max(150).nullable().optional(),
  priority: z.number().int().min(0).max(10000).optional(),
});

export const FormValidationRuleSchema = z.object({
  validator_kind: z.enum(['required','pattern','range','min_length','max_length','min','max','email','url','phone','custom']),
  params: z.record(z.unknown()).optional(),
  message_key: z.string().max(150).nullable().optional(),
});

export const FormDefaultValueSchema = z.object({
  default_kind: z.enum(['static','expression','from_user','from_tenant','from_workflow']),
  value: z.unknown().optional(),
  expression: z.record(z.unknown()).optional(),
});

export const FormSubmissionCreateSchema = z.object({
  form_definition_id: UUID,
  entity_kind: z.string().max(100).nullable().optional(),
  entity_id: UUID.nullable().optional(),
  payload: z.record(z.unknown()).optional(),
  status: z.enum(['draft','submitted']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const FormSubmissionTransitionSchema = z.object({
  status: z.enum(['submitted','approved','rejected','withdrawn','superseded']),
});

export const FormDraftSchema = z.object({
  form_definition_id: UUID,
  entity_kind: z.string().max(100).nullable().optional(),
  entity_id: UUID.nullable().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const FormAttachmentSchema = z.object({
  form_submission_id: UUID.nullable().optional(),
  form_draft_id: UUID.nullable().optional(),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(150),
  size_bytes: z.number().int().min(0),
  storage_url: z.string().min(1),
  checksum: z.string().max(128).nullable().optional(),
}).refine((b) => Boolean(b.form_submission_id) !== Boolean(b.form_draft_id), {
  message: 'attachment requires exactly one of form_submission_id or form_draft_id',
});

export const FormApprovalLinkSchema = z.object({
  workflow_run_id: UUID.nullable().optional(),
  approval_step_code: z.string().min(1).max(150),
  decision: z.enum(['pending','approved','rejected','delegated','escalated']).optional(),
});

export const FormApprovalDecisionSchema = z.object({
  decision: z.enum(['approved','rejected','delegated','escalated']),
  comments: z.string().nullable().optional(),
});
