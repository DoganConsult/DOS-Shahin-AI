/**
 * Re-export shim — delegates to the canonical seed-workflow-templates in data/.
 * The canonical implementation lives at backend/src/data/seed-workflow-templates.ts.
 *
 * Consumers importing from this path get the full seedWorkflowTemplates() function,
 * the WORKFLOW_TEMPLATE_SEEDS array, the WorkflowTemplateSeed type, and all helpers.
 */
export {
  seedWorkflowTemplates,
  WORKFLOW_TEMPLATE_SEEDS,
  WORKFLOW_PROFILE_CODE_ALIASES,
  expandWorkflowTemplateCodesFromProfile,
} from '../../data/seed-workflow-templates';

export type {
  WorkflowTemplateSeed,
  SeedWorkflowTemplatesOptions,
} from '../../data/seed-workflow-templates';
