import { safeQuery } from "@dos/db";

// policy-template.service.ts — barrel re-export for backward compatibility
// All implementations have been split into focused sub-files.

export { PolicyTemplateVar, PolicyTemplate } from './policy-template.types';

export { V, ALL_SECTORS, POLICY_TEMPLATES, MOM_FORMATS, WORKFLOW_STEPS } from './policy-template-catalog';

export {
  getTenantContext,
  interpolateTemplate,
  getTemplates,
  getTemplateByKey,
  getTemplatesByCategory,
  getTemplatesBySector,
  getTemplatesByFramework,
  generatePolicyFromTemplate,
  bulkGeneratePolicies,
  seedPolicyTemplates,
} from './policy-template-query.service';

export {
  trackPolicyAction,
  getPolicyWorkflowHistory,
  createPolicyWorkflowSteps,
  getPolicyProcessSteps,
  advancePolicyStep,
} from './policy-template-workflow.service';

export {
  createMOMRecord,
  getMOMRecords,
  approveMOM,
} from './policy-template-mom.service';

export {
  getPolicyGuidance,
  addPolicyGuidance,
} from './policy-template-guidance.service';
