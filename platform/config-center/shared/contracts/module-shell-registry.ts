import type { ModuleShellDefinition } from './module-shell-definition';
import { MODULE_TABLE_VIEWS } from './module-table-views';
import { MODULE_CREATE_FORM_FIELDS, MODULE_REPORT_DEFINITIONS } from './module-form-fields';

import { GRC_SHELL_ENTRIES } from './module-shell-registry-grc';
import { OPS_SHELL_ENTRIES } from './module-shell-registry-ops';
import { GOV_SHELL_ENTRIES } from './module-shell-registry-gov';
import { PLATFORM_SHELL_ENTRIES } from './module-shell-registry-platform';
import { EXT_SHELL_ENTRIES } from './module-shell-registry-ext';

export const MODULE_SHELL_REGISTRY: Record<string, ModuleShellDefinition> = {
  ...GRC_SHELL_ENTRIES,
  ...OPS_SHELL_ENTRIES,
  ...GOV_SHELL_ENTRIES,
  ...PLATFORM_SHELL_ENTRIES,
  ...EXT_SHELL_ENTRIES,
};

for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
  if (def.tableViews.length === 0 && MODULE_TABLE_VIEWS[code]) {
    def.tableViews = MODULE_TABLE_VIEWS[code];
  }
  if (!def.createFormFields && MODULE_CREATE_FORM_FIELDS[code]) {
    def.createFormFields = MODULE_CREATE_FORM_FIELDS[code];
  }
  if (!def.reportDefinitions && MODULE_REPORT_DEFINITIONS[code]) {
    def.reportDefinitions = MODULE_REPORT_DEFINITIONS[code];
  }
}

export function getModuleShellDefinition(code: string): ModuleShellDefinition | undefined {
  return MODULE_SHELL_REGISTRY[code];
}

export function getAllModuleShellDefinitions(): ModuleShellDefinition[] {
  return Object.values(MODULE_SHELL_REGISTRY);
}
