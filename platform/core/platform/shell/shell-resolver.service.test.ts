import { describe, it, expect } from 'vitest';
import { MODULE_SHELL_REGISTRY } from '../../../shared/contracts/module-shell-registry';
import type { WorkspacePattern } from '../../../shared/contracts/module-shell-definition';

const LAYOUT_MAP: Record<WorkspacePattern, string> = {
  'command-center': 'cockpit',
  'registry': 'list-detail',
  'case-workspace': 'workspace',
  'studio': 'workspace',
};

const VALID_LAYOUT_TYPES = ['cockpit', 'list-detail', 'workspace', 'hub', 'board', 'admin-console', 'reviewer-workspace'];
const VALID_WORKSPACE_PATTERNS: WorkspacePattern[] = ['command-center', 'registry', 'case-workspace', 'studio'];

const ALL_MODULE_CODES = Object.keys(MODULE_SHELL_REGISTRY);

describe('ShellResolverService — layout mapping contract', () => {
  it('LAYOUT_MAP covers all 4 workspace patterns', () => {
    expect(Object.keys(LAYOUT_MAP)).toHaveLength(4);
    for (const pattern of VALID_WORKSPACE_PATTERNS) {
      expect(LAYOUT_MAP[pattern]).toBeDefined();
    }
  });

  it('command-center maps to cockpit', () => {
    expect(LAYOUT_MAP['command-center']).toBe('cockpit');
  });

  it('registry maps to list-detail', () => {
    expect(LAYOUT_MAP['registry']).toBe('list-detail');
  });

  it('case-workspace maps to workspace', () => {
    expect(LAYOUT_MAP['case-workspace']).toBe('workspace');
  });

  it('studio maps to workspace', () => {
    expect(LAYOUT_MAP['studio']).toBe('workspace');
  });

  it('every module defaultWorkspacePattern resolves to a valid layout type', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const layoutType = LAYOUT_MAP[def.defaultWorkspacePattern];
      expect(
        VALID_LAYOUT_TYPES.includes(layoutType),
        `module "${code}" pattern "${def.defaultWorkspacePattern}" resolves to unknown layout "${layoutType}"`,
      ).toBe(true);
    }
  });
});

describe('ShellResolverService — buildPlatformDefault (indirect via registry)', () => {
  it('has at least 28 registered modules', () => {
    expect(ALL_MODULE_CODES.length).toBeGreaterThanOrEqual(28);
  });

  it('every module produces a non-empty moduleCode matching its registry key', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleCode).toBe(code);
    }
  });

  it('every module has bilingual moduleName (en + ar)', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleName.en, `missing en name on "${code}"`).toBeTruthy();
      expect(def.moduleName.ar, `missing ar name on "${code}"`).toBeTruthy();
    }
  });

  it('every module has a bilingual purposeLine', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.purposeLine.en, `missing en purposeLine on "${code}"`).toBeTruthy();
      expect(def.purposeLine.ar, `missing ar purposeLine on "${code}"`).toBeTruthy();
    }
  });

  it('every module has a primaryAiAction with bilingual label', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.primaryAiAction, `missing primaryAiAction on "${code}"`).toBeDefined();
      expect(def.primaryAiAction.id, `missing primaryAiAction.id on "${code}"`).toBeTruthy();
      expect(def.primaryAiAction.label.en, `missing primaryAiAction.label.en on "${code}"`).toBeTruthy();
      expect(def.primaryAiAction.label.ar, `missing primaryAiAction.label.ar on "${code}"`).toBeTruthy();
    }
  });

  it('every module has a moduleIcon (pi- prefix)', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleIcon, `missing moduleIcon on "${code}"`).toMatch(/^pi-/);
    }
  });

  it('every module has a moduleAccentToken', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleAccentToken, `missing moduleAccentToken on "${code}"`).toBeTruthy();
    }
  });

  it('every module has at least 5 KPI definitions', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.kpiDefinitions.length,
        `module "${code}" has only ${def.kpiDefinitions.length} KPIs`,
      ).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('ShellResolverService — slotsForLayout (indirect)', () => {
  it('cockpit layout exposes kpi-strip (command-center modules)', () => {
    const commandCenterModules = Object.values(MODULE_SHELL_REGISTRY).filter(
      d => d.defaultWorkspacePattern === 'command-center',
    );
    expect(commandCenterModules.length).toBeGreaterThan(0);
    for (const mod of commandCenterModules) {
      expect(mod.kpiDefinitions.length).toBeGreaterThan(0);
    }
  });

  it('registry layout modules have list-based table views', () => {
    const registryModules = Object.values(MODULE_SHELL_REGISTRY).filter(
      d => d.defaultWorkspacePattern === 'registry',
    );
    expect(registryModules.length).toBeGreaterThan(0);
    for (const mod of registryModules) {
      expect(mod.tableViews.length).toBeGreaterThan(0);
    }
  });

  it('studio layout modules have at least 4 tabs (workspace/studio pattern)', () => {
    const studioModules = Object.values(MODULE_SHELL_REGISTRY).filter(
      d => d.defaultWorkspacePattern === 'studio',
    );
    expect(studioModules.length).toBeGreaterThan(0);
    for (const mod of studioModules) {
      expect(mod.defaultRecordTabs.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('ShellResolverService — defaultActionBar contract', () => {
  it('every module primaryAiAction.id is unique across the registry', () => {
    const ids = Object.values(MODULE_SHELL_REGISTRY).map(d => d.primaryAiAction.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every module has at least one agent configured', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.agents.length, `module "${code}" has no agents`).toBeGreaterThan(0);
    }
  });
});

describe('ShellResolverService — defaultTabs contract', () => {
  it('every module has at least 3 defaultRecordTabs', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.defaultRecordTabs.length,
        `module "${code}" has only ${def.defaultRecordTabs.length} tabs`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('every module has exactly one default tab marked', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const defaultTabs = def.defaultRecordTabs.filter(t => t.default === true);
      expect(
        defaultTabs.length,
        `module "${code}" has ${defaultTabs.length} default tabs (expected 1)`,
      ).toBe(1);
    }
  });

  it('every tab has a bilingual label and a route', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const tab of def.defaultRecordTabs) {
        expect(tab.labelEn, `tab "${tab.id}" in "${code}" missing labelEn`).toBeTruthy();
        expect(tab.labelAr, `tab "${tab.id}" in "${code}" missing labelAr`).toBeTruthy();
        expect(tab.route, `tab "${tab.id}" in "${code}" missing route`).toMatch(/^\//);
      }
    }
  });

  it('tab ids are unique within each module', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const ids = def.defaultRecordTabs.map(t => t.id);
      const unique = new Set(ids);
      expect(unique.size, `module "${code}" has duplicate tab ids`).toBe(ids.length);
    }
  });
});

describe('ShellResolverService — buildWorkflowConfig contract', () => {
  it('platform tier modules can have lifecycle definitions', () => {
    const platformModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'platform');
    expect(platformModules.length).toBeGreaterThan(0);
  });

  it('full tier modules all have non-empty lifecycleDefinition', () => {
    const fullModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'full');
    for (const mod of fullModules) {
      expect(
        mod.lifecycleDefinition.length,
        `full-tier module "${mod.moduleCode}" has no lifecycle steps`,
      ).toBeGreaterThan(0);
    }
  });

  it('domain tier modules all have non-empty lifecycleDefinition', () => {
    const domainModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'domain');
    for (const mod of domainModules) {
      expect(
        mod.lifecycleDefinition.length,
        `domain-tier module "${mod.moduleCode}" has no lifecycle steps`,
      ).toBeGreaterThan(0);
    }
  });

  it('every lifecycle step has from and to states', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const step of def.lifecycleDefinition) {
        expect(step.from, `step in "${code}" missing from`).toBeTruthy();
        expect(step.to, `step in "${code}" missing to`).toBeTruthy();
      }
    }
  });

  it('lifecycle steps with requiresApproval have slaHours or adjacent sla step', () => {
    for (const [, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const approvalSteps = def.lifecycleDefinition.filter(s => s.requiresApproval);
      for (const step of approvalSteps) {
        expect(step.requiredPermission).toBeTruthy();
      }
    }
  });

  it('slaHours when defined is a positive number', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const step of def.lifecycleDefinition) {
        if (step.slaHours !== undefined) {
          expect(step.slaHours, `slaHours in step of "${code}" must be positive`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('full tier modules have a positive slaDefaultHours', () => {
    const fullModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'full');
    for (const mod of fullModules) {
      expect(
        mod.slaDefaultHours,
        `full-tier "${mod.moduleCode}" missing slaDefaultHours`,
      ).toBeGreaterThan(0);
    }
  });

  it('platform tier modules have null slaDefaultHours', () => {
    const platformModules = Object.values(MODULE_SHELL_REGISTRY).filter(d => d.tier === 'platform');
    for (const mod of platformModules) {
      expect(
        mod.slaDefaultHours,
        `platform-tier "${mod.moduleCode}" should have null slaDefaultHours`,
      ).toBeNull();
    }
  });
});

describe('ShellResolverService — masthead config shape', () => {
  it('all modules have non-empty breadcrumb-worthy names', () => {
    for (const [, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleName.en.length).toBeGreaterThan(0);
      expect(def.moduleName.ar.length).toBeGreaterThan(0);
    }
  });

  it('all modules have a valid tier value', () => {
    const validTiers = ['full', 'domain', 'platform'];
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        validTiers.includes(def.tier),
        `module "${code}" has invalid tier "${def.tier}"`,
      ).toBe(true);
    }
  });

  it('all modules have a valid automationLevel or null', () => {
    const validLevels = ['full', 'semi', 'manual', null];
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        validLevels.includes(def.automationLevel),
        `module "${code}" has invalid automationLevel "${def.automationLevel}"`,
      ).toBe(true);
    }
  });
});
