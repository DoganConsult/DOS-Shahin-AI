import { describe, it, expect } from 'vitest';
import {
  MODULE_SHELL_REGISTRY,
  getAllModuleShellDefinitions,
  getModuleShellDefinition,
} from './module-shell-registry';
import { MODULE_TABLE_VIEWS } from './module-table-views';
import { MODULE_CREATE_FORM_FIELDS, MODULE_REPORT_DEFINITIONS } from './module-form-fields';

const EXPECTED_MODULE_CODES = [
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident', 'exception',
  'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action', 'training',
  'qiyas', 'ai-governance', 'foundation', 'reporting', 'ai', 'integrations',
  'admin', 'workflow', 'notification', 'analytics', 'controls', 'dora',
  'journey', 'privacy', 'issues', 'inbox', 'portals', 'records', 'team',
];

const VALID_TIERS = ['full', 'domain', 'platform'] as const;
const VALID_AUTOMATION_LEVELS = ['full', 'semi', 'manual', null] as const;
const VALID_WORKSPACE_PATTERNS = ['command-center', 'registry', 'case-workspace', 'studio'] as const;
const VALID_AUTONOMY_LEVELS = ['hybrid', 'shadow_agent', 'full'] as const;

describe('MODULE_SHELL_REGISTRY — module set completeness', () => {
  it('contains all 33 expected modules', () => {
    const keys = Object.keys(MODULE_SHELL_REGISTRY);
    expect(keys).toHaveLength(33);
    for (const code of EXPECTED_MODULE_CODES) {
      expect(keys, `module "${code}" missing from registry`).toContain(code);
    }
  });

  it('getAllModuleShellDefinitions() returns all 33 definitions', () => {
    const all = getAllModuleShellDefinitions();
    expect(all).toHaveLength(33);
  });

  it('getModuleShellDefinition() retrieves known modules', () => {
    const risk = getModuleShellDefinition('risk');
    expect(risk).toBeDefined();
    expect(risk?.moduleCode).toBe('risk');
  });

  it('getModuleShellDefinition() returns undefined for unknown codes', () => {
    expect(getModuleShellDefinition('nonexistent')).toBeUndefined();
  });
});

describe('MODULE_SHELL_REGISTRY — identity fields', () => {
  it('every module has a moduleCode matching its registry key', () => {
    for (const [key, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleCode, `moduleCode mismatch on key "${key}"`).toBe(key);
    }
  });

  it('every module has bilingual moduleName (en + ar)', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleName.en, `"${code}" missing moduleName.en`).toBeTruthy();
      expect(def.moduleName.ar, `"${code}" missing moduleName.ar`).toBeTruthy();
    }
  });

  it('every module has a moduleIcon starting with pi-', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleIcon, `"${code}" moduleIcon must start with pi-`).toMatch(/^pi-/);
    }
  });

  it('every module has a non-empty moduleAccentToken', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleAccentToken, `"${code}" missing moduleAccentToken`).toBeTruthy();
    }
  });

  it('every module has bilingual purposeLine', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.purposeLine.en, `"${code}" missing purposeLine.en`).toBeTruthy();
      expect(def.purposeLine.ar, `"${code}" missing purposeLine.ar`).toBeTruthy();
    }
  });

  it('emptyStatePreset is a non-empty string for every module', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.emptyStatePreset, `"${code}" missing emptyStatePreset`).toBeTruthy();
    }
  });
});

describe('MODULE_SHELL_REGISTRY — tier and automation', () => {
  it('every module has a valid tier', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        VALID_TIERS.includes(def.tier as typeof VALID_TIERS[number]),
        `"${code}" has invalid tier "${def.tier}"`,
      ).toBe(true);
    }
  });

  it('every module has a valid automationLevel (or null)', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        (VALID_AUTOMATION_LEVELS as readonly unknown[]).includes(def.automationLevel),
        `"${code}" has invalid automationLevel "${def.automationLevel}"`,
      ).toBe(true);
    }
  });

  it('platform tier modules have null automationLevel', () => {
    const platformModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'platform');
    expect(platformModules.length).toBeGreaterThan(0);
    for (const mod of platformModules) {
      expect(mod.automationLevel, `platform module "${mod.moduleCode}" should have null automationLevel`).toBeNull();
    }
  });

  it('platform tier modules have null slaDefaultHours', () => {
    const platformModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'platform');
    for (const mod of platformModules) {
      expect(mod.slaDefaultHours, `platform module "${mod.moduleCode}" should have null slaDefaultHours`).toBeNull();
    }
  });

  it('full tier modules have a positive slaDefaultHours', () => {
    const fullModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'full');
    expect(fullModules.length).toBeGreaterThan(0);
    for (const mod of fullModules) {
      expect(mod.slaDefaultHours, `full-tier "${mod.moduleCode}" has null slaDefaultHours`).toBeGreaterThan(0);
    }
  });
});

describe('MODULE_SHELL_REGISTRY — KPI definitions', () => {
  it('every module has at least 5 KPI definitions', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.kpiDefinitions.length,
        `"${code}" has only ${def.kpiDefinitions.length} KPIs`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it('every KPI has id, bilingual labels, icon, color, bg, and route', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const kpi of def.kpiDefinitions) {
        expect(kpi.id, `KPI in "${code}" missing id`).toBeTruthy();
        expect(kpi.labelEn, `KPI "${kpi.id}" in "${code}" missing labelEn`).toBeTruthy();
        expect(kpi.labelAr, `KPI "${kpi.id}" in "${code}" missing labelAr`).toBeTruthy();
        expect(kpi.icon, `KPI "${kpi.id}" in "${code}" missing icon`).toBeTruthy();
        expect(kpi.color, `KPI "${kpi.id}" in "${code}" missing color`).toBeTruthy();
        expect(kpi.bg, `KPI "${kpi.id}" in "${code}" missing bg`).toBeTruthy();
        expect(kpi.route, `KPI "${kpi.id}" in "${code}" missing route`).toMatch(/^\//);
      }
    }
  });

  it('KPI ids are unique within each module', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const ids = def.kpiDefinitions.map(k => k.id);
      const unique = new Set(ids);
      expect(unique.size, `"${code}" has duplicate KPI ids`).toBe(ids.length);
    }
  });
});

describe('MODULE_SHELL_REGISTRY — lifecycle definitions', () => {
  it('full and domain tier modules have non-empty lifecycleDefinition', () => {
    const nonPlatform = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier !== 'platform');
    for (const mod of nonPlatform) {
      expect(
        mod.lifecycleDefinition.length,
        `"${mod.moduleCode}" (${mod.tier}) has no lifecycle steps`,
      ).toBeGreaterThan(0);
    }
  });

  it('every lifecycle step has from, to, and requiredPermission', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const step of def.lifecycleDefinition) {
        expect(step.from, `lifecycle step in "${code}" missing from`).toBeTruthy();
        expect(step.to, `lifecycle step in "${code}" missing to`).toBeTruthy();
        expect(step.requiredPermission, `lifecycle step "${step.from}→${step.to}" in "${code}" missing requiredPermission`).toBeTruthy();
      }
    }
  });

  it('slaHours when defined is a positive integer', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const step of def.lifecycleDefinition) {
        if (step.slaHours !== undefined) {
          expect(step.slaHours, `slaHours in "${code}" must be > 0`).toBeGreaterThan(0);
          expect(Number.isInteger(step.slaHours)).toBe(true);
        }
      }
    }
  });

  it('lifecycle step state identifiers use snake_case or camelCase (no spaces)', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const step of def.lifecycleDefinition) {
        expect(step.from, `from state in "${code}" has spaces`).not.toContain(' ');
        expect(step.to, `to state in "${code}" has spaces`).not.toContain(' ');
      }
    }
  });
});

describe('MODULE_SHELL_REGISTRY — filters', () => {
  it('every module has at least 3 filters', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.filters.length,
        `"${code}" has only ${def.filters.length} filters`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('every filter has id, bilingual labels, and a valid type', () => {
    const validTypes = ['select', 'multiselect', 'date-range', 'search', 'toggle'];
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const filter of def.filters) {
        expect(filter.id, `filter in "${code}" missing id`).toBeTruthy();
        expect(filter.labelEn, `filter "${filter.id}" in "${code}" missing labelEn`).toBeTruthy();
        expect(filter.labelAr, `filter "${filter.id}" in "${code}" missing labelAr`).toBeTruthy();
        expect(
          validTypes.includes(filter.type),
          `filter "${filter.id}" in "${code}" has invalid type "${filter.type}"`,
        ).toBe(true);
      }
    }
  });

  it('select and multiselect filters have options arrays', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const filter of def.filters) {
        if (filter.type === 'select' || filter.type === 'multiselect') {
          if (filter.options !== undefined) {
            expect(Array.isArray(filter.options), `filter "${filter.id}" in "${code}" options not an array`).toBe(true);
          }
        }
      }
    }
  });

  it('filter ids are unique within each module', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const ids = def.filters.map(f => f.id);
      const unique = new Set(ids);
      expect(unique.size, `"${code}" has duplicate filter ids`).toBe(ids.length);
    }
  });
});

describe('MODULE_SHELL_REGISTRY — defaultRecordTabs', () => {
  it('every module has at least 3 defaultRecordTabs', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.defaultRecordTabs.length,
        `"${code}" has only ${def.defaultRecordTabs.length} tabs`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('exactly one tab per module is marked as default', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const defaultTabs = def.defaultRecordTabs.filter(t => t.default === true);
      expect(defaultTabs.length, `"${code}" has ${defaultTabs.length} default tabs (expected 1)`).toBe(1);
    }
  });

  it('every tab has bilingual labels, icon and route', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const tab of def.defaultRecordTabs) {
        expect(tab.labelEn, `tab "${tab.id}" in "${code}" missing labelEn`).toBeTruthy();
        expect(tab.labelAr, `tab "${tab.id}" in "${code}" missing labelAr`).toBeTruthy();
        expect(tab.icon, `tab "${tab.id}" in "${code}" missing icon`).toMatch(/^pi-/);
        expect(tab.route, `tab "${tab.id}" in "${code}" missing route`).toMatch(/^\//);
      }
    }
  });
});

describe('MODULE_SHELL_REGISTRY — tableViews', () => {
  it('MODULE_TABLE_VIEWS provides views for every module code', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      expect(
        MODULE_TABLE_VIEWS[code],
        `MODULE_TABLE_VIEWS missing entry for "${code}"`,
      ).toBeDefined();
    }
  });

  it('every module has at least one table view after registry wiring', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.tableViews.length,
        `"${code}" has no table views after wiring`,
      ).toBeGreaterThan(0);
    }
  });

  it('each table view has columns with field, headerEn, headerAr', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const view of def.tableViews) {
        expect(view.id, `view in "${code}" missing id`).toBeTruthy();
        expect(view.columns.length, `view "${view.id}" in "${code}" has no columns`).toBeGreaterThan(0);
        for (const col of view.columns) {
          expect(col.field, `col in view "${view.id}" of "${code}" missing field`).toBeTruthy();
          expect(col.headerEn, `col "${col.field}" in "${code}" missing headerEn`).toBeTruthy();
          expect(col.headerAr, `col "${col.field}" in "${code}" missing headerAr`).toBeTruthy();
        }
      }
    }
  });
});

describe('MODULE_SHELL_REGISTRY — AI capabilities', () => {
  it('every module has at least 4 aiCapabilities', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.aiCapabilities.length,
        `"${code}" has only ${def.aiCapabilities.length} aiCapabilities`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('aiCapability strings are snake_case identifiers', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const cap of def.aiCapabilities) {
        expect(cap, `aiCapability "${cap}" in "${code}" should not have spaces`).not.toContain(' ');
        expect(cap.length, `aiCapability in "${code}" is empty`).toBeGreaterThan(0);
      }
    }
  });
});

describe('MODULE_SHELL_REGISTRY — agents', () => {
  it('every module has at least one agent', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.agents.length, `"${code}" has no agents`).toBeGreaterThan(0);
    }
  });

  it('every agent has id, name, icon, color, domain', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const agent of def.agents) {
        expect(agent.id, `agent in "${code}" missing id`).toBeTruthy();
        expect(agent.name, `agent "${agent.id}" in "${code}" missing name`).toBeTruthy();
        expect(agent.icon, `agent "${agent.id}" in "${code}" missing icon`).toMatch(/^pi-/);
        expect(agent.color, `agent "${agent.id}" in "${code}" missing color`).toBeTruthy();
        expect(agent.domain, `agent "${agent.id}" in "${code}" missing domain`).toBeTruthy();
      }
    }
  });

  it('agent autonomyLevel when defined is a valid value', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const agent of def.agents) {
        if (agent.autonomyLevel !== undefined) {
          expect(
            (VALID_AUTONOMY_LEVELS as readonly string[]).includes(agent.autonomyLevel),
            `agent "${agent.id}" in "${code}" has invalid autonomyLevel "${agent.autonomyLevel}"`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('MODULE_SHELL_REGISTRY — relatedObjectTypes', () => {
  it('every module has at least one relatedObjectType', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.relatedObjectTypes.length,
        `"${code}" has no relatedObjectTypes`,
      ).toBeGreaterThan(0);
    }
  });

  it('relatedObjectTypes reference valid module codes', () => {
    const validCodes = new Set([...EXPECTED_MODULE_CODES, 'control', 'team']);
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const related of def.relatedObjectTypes) {
        expect(
          validCodes.has(related),
          `"${code}" references unknown relatedObjectType "${related}"`,
        ).toBe(true);
      }
    }
  });
});

describe('MODULE_SHELL_REGISTRY — workspace patterns', () => {
  it('every module defaultWorkspacePattern is a valid pattern', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        (VALID_WORKSPACE_PATTERNS as readonly string[]).includes(def.defaultWorkspacePattern),
        `"${code}" has invalid defaultWorkspacePattern "${def.defaultWorkspacePattern}"`,
      ).toBe(true);
    }
  });

  it('defaultWorkspacePattern is included in allowedWorkspacePatterns', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.allowedWorkspacePatterns.includes(def.defaultWorkspacePattern),
        `"${code}" defaultWorkspacePattern not in allowedWorkspacePatterns`,
      ).toBe(true);
    }
  });
});

describe('MODULE_SHELL_REGISTRY — post-wiring createFormFields and reportDefinitions', () => {
  it('every module has createFormFields after wiring', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.createFormFields,
        `"${code}" missing createFormFields after wiring`,
      ).toBeDefined();
      expect(
        def.createFormFields!.length,
        `"${code}" createFormFields is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('every module has reportDefinitions after wiring', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.reportDefinitions,
        `"${code}" missing reportDefinitions after wiring`,
      ).toBeDefined();
      expect(
        def.reportDefinitions!.length,
        `"${code}" reportDefinitions is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('MODULE_CREATE_FORM_FIELDS covers all 33 modules', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      expect(
        MODULE_CREATE_FORM_FIELDS[code],
        `MODULE_CREATE_FORM_FIELDS missing "${code}"`,
      ).toBeDefined();
    }
  });

  it('MODULE_REPORT_DEFINITIONS covers all 33 modules', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      expect(
        MODULE_REPORT_DEFINITIONS[code],
        `MODULE_REPORT_DEFINITIONS missing "${code}"`,
      ).toBeDefined();
    }
  });
});
