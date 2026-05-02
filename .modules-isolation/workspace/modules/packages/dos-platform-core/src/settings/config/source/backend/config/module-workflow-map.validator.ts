/**
 * Module Workflow Map Validator — Validates module-workflow mappings at startup.
 *
 * Ensures all registered workflow mappings have valid template codes,
 * entity types, and SLA configurations.
 */

import { MODULE_WORKFLOW_MAP, type ModuleWorkflowMapping } from './module-workflow-map';

export interface ValidationError {
  moduleCode: string;
  field: string;
  message: string;
}

/**
 * Validate all module-workflow mappings.
 * Returns an empty array if all mappings are valid.
 */
export function validateModuleWorkflowMap(): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [code, mapping] of Object.entries(MODULE_WORKFLOW_MAP)) {
    if (!mapping.templateCode || mapping.templateCode.trim() === '') {
      errors.push({
        moduleCode: code,
        field: 'templateCode',
        message: `Module "${code}" has empty workflow template code`,
      });
    }

    if (!mapping.entityTypes || mapping.entityTypes.length === 0) {
      errors.push({
        moduleCode: code,
        field: 'entityTypes',
        message: `Module "${code}" has no entity types defined`,
      });
    }

    if (mapping.slaHours <= 0) {
      errors.push({
        moduleCode: code,
        field: 'slaHours',
        message: `Module "${code}" has invalid SLA hours: ${mapping.slaHours}`,
      });
    }

    // Check for duplicate template codes across modules
    const otherModules = Object.entries(MODULE_WORKFLOW_MAP)
      .filter(([c, m]) => c !== code && m.templateCode === mapping.templateCode);
    if (otherModules.length > 0) {
      errors.push({
        moduleCode: code,
        field: 'templateCode',
        message: `Template code "${mapping.templateCode}" is shared with modules: ${otherModules.map(([c]) => c).join(', ')}`,
      });
    }
  }

  return errors;
}

/**
 * Validate a single module-workflow mapping.
 */
export function validateMapping(mapping: ModuleWorkflowMapping): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!mapping.moduleCode) {
    errors.push({ moduleCode: '', field: 'moduleCode', message: 'Module code is required' });
  }
  if (!mapping.templateCode) {
    errors.push({ moduleCode: mapping.moduleCode, field: 'templateCode', message: 'Template code is required' });
  }
  if (!mapping.entityTypes?.length) {
    errors.push({ moduleCode: mapping.moduleCode, field: 'entityTypes', message: 'At least one entity type required' });
  }
  if (!mapping.slaHours || mapping.slaHours <= 0) {
    errors.push({ moduleCode: mapping.moduleCode, field: 'slaHours', message: 'SLA hours must be positive' });
  }

  return errors;
}
