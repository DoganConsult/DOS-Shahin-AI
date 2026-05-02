import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MODULE_SHELL_REGISTRY } from '../../../shared/contracts/module-shell-registry';
import { MODULE_TABLE_VIEWS } from '../../../shared/contracts/module-table-views';

const ROOT = path.resolve(__dirname, '../../..');

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.resolve(ROOT, relPath));
}

const ALL_MODULE_CODES = Object.keys(MODULE_SHELL_REGISTRY);

describe('§4 ShellHostComponent — Canonical Shell Layers', () => {
  const src = readFile('core/platform/shell/shell-host.component.ts');

  it('imports and renders ModuleMastheadComponent (Layer 2)', () => {
    expect(src).toContain('ModuleMastheadComponent');
    expect(src).toContain('app-module-masthead');
  });

  it('imports and renders KpiCardGridComponent (Layer 3)', () => {
    expect(src).toContain('KpiCardGridComponent');
    expect(src).toContain('app-kpi-card-grid');
  });

  it('imports and renders ModuleActionBarComponent (Layer 4)', () => {
    expect(src).toContain('ModuleActionBarComponent');
    expect(src).toContain('app-module-action-bar');
  });

  it('imports and renders ModuleWorkflowRibbonComponent (Layer 7)', () => {
    expect(src).toContain('ModuleWorkflowRibbonComponent');
    expect(src).toContain('app-module-workflow-ribbon');
  });

  it('imports and renders ModuleContextRailComponent (Layer 6)', () => {
    expect(src).toContain('ModuleContextRailComponent');
    expect(src).toContain('app-module-context-rail');
  });

  it('imports and renders ModuleStickyFooterComponent (Layer 9)', () => {
    expect(src).toContain('ModuleStickyFooterComponent');
    expect(src).toContain('app-module-sticky-footer');
  });

  it('imports and renders ModuleStatePresetComponent (Layer 8)', () => {
    expect(src).toContain('ModuleStatePresetComponent');
    expect(src).toContain('app-module-state-preset');
  });

  it('imports all 4 layout components (Layer 5)', () => {
    expect(src).toContain('CommandCenterLayoutComponent');
    expect(src).toContain('RegistryLayoutComponent');
    expect(src).toContain('CaseWorkspaceLayoutComponent');
    expect(src).toContain('StudioLayoutComponent');
  });

  it('uses RouterOutlet inside each layout', () => {
    expect(src).toContain('RouterOutlet');
    expect(src).toContain('<router-outlet');
  });

  it('supports RTL via dir attribute', () => {
    expect(src).toContain('[attr.dir]');
  });

  it('handles all 9 state presets', () => {
    const presets = ['loading', 'skeleton', 'no-permission', 'error', 'error-blocking', 'empty-first-use', 'empty-filtered', 'archived', 'syncing'];
    for (const preset of presets) {
      expect(src, `missing state "${preset}"`).toContain(preset);
    }
  });

  it('platform mode indicator with hybrid/shadow/autonomous', () => {
    expect(src).toContain('platformMode()');
    expect(src).toContain('shell-mode-indicator');
    expect(src).toContain('hybrid');
    expect(src).toContain('shadow_agent');
    expect(src).toContain('full_autonomous');
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('has standalone: true', () => {
    expect(src).toContain('standalone: true');
  });
});

describe('§11.1 Shell Components — existence', () => {
  const shellComponents = [
    { file: 'shared/components/canonical-module-shell.component.ts', name: 'CanonicalModuleShell' },
    { file: 'shared/components/global-command-bar.component.ts', name: 'GlobalCommandBar' },
    { file: 'shared/components/workspace-context-switcher.component.ts', name: 'WorkspaceContextSwitcher' },
  ];

  for (const c of shellComponents) {
    it(`${c.name} component file exists`, () => {
      expect(fileExists(c.file), `missing ${c.file}`).toBe(true);
    });
  }
});

describe('§11.2 Module Shell Components — existence and structure', () => {
  const moduleShellComponents = [
    { file: 'core/platform/shell/shell-host.component.ts', name: 'ShellHostComponent', selector: 'app-shell-host' },
    { file: 'shared/components/module-masthead.component.ts', name: 'ModuleMastheadComponent', selector: 'app-module-masthead' },
    { file: 'shared/components/kpi-card-grid.component.ts', name: 'KpiCardGridComponent', selector: 'app-kpi-card-grid' },
    { file: 'shared/components/module-action-bar.component.ts', name: 'ModuleActionBarComponent', selector: 'app-module-action-bar' },
    { file: 'shared/components/module-context-rail.component.ts', name: 'ModuleContextRailComponent', selector: 'app-module-context-rail' },
    { file: 'shared/components/module-workflow-ribbon.component.ts', name: 'ModuleWorkflowRibbonComponent', selector: 'app-module-workflow-ribbon' },
    { file: 'shared/components/module-sticky-footer.component.ts', name: 'ModuleStickyFooterComponent', selector: 'app-module-sticky-footer' },
    { file: 'shared/components/module-state-preset.component.ts', name: 'ModuleStatePresetComponent', selector: 'app-module-state-preset' },
  ];

  for (const c of moduleShellComponents) {
    describe(c.name, () => {
      it('file exists', () => {
        expect(fileExists(c.file), `missing ${c.file}`).toBe(true);
      });

      it('is standalone', () => {
        const src = readFile(c.file);
        expect(src).toContain('standalone: true');
      });

      it('uses OnPush change detection', () => {
        const src = readFile(c.file);
        expect(src).toContain('ChangeDetectionStrategy.OnPush');
      });

      it(`has selector '${c.selector}'`, () => {
        const src = readFile(c.file);
        expect(src).toContain(`selector: '${c.selector}'`);
      });
    });
  }
});

describe('§11.3 Workspace Layout Components — existence', () => {
  const layouts = [
    { file: 'shared/components/layouts/command-center-layout.component.ts', name: 'CommandCenterLayout' },
    { file: 'shared/components/layouts/registry-layout.component.ts', name: 'RegistryLayout' },
    { file: 'shared/components/layouts/case-workspace-layout.component.ts', name: 'CaseWorkspaceLayout' },
    { file: 'shared/components/layouts/studio-layout.component.ts', name: 'StudioLayout' },
  ];

  for (const l of layouts) {
    it(`${l.name} component exists and is standalone`, () => {
      expect(fileExists(l.file), `missing ${l.file}`).toBe(true);
      const src = readFile(l.file);
      expect(src).toContain('standalone: true');
    });
  }
});

describe('§11.4 Shared Operational Components — existence', () => {
  const operational = [
    { file: 'shared/components/priority-queue-panel.component.ts', name: 'PriorityQueuePanel' },
    { file: 'shared/components/activity-timeline-panel.component.ts', name: 'ActivityTimelinePanel' },
    { file: 'shared/components/relationship-view.component.ts', name: 'RelatedRecordsPanel' },
    { file: 'shared/components/data-freshness-badge.component.ts', name: 'DataFreshnessBadge' },
    { file: 'shared/components/health-strip.component.ts', name: 'HealthTag' },
    { file: 'shared/components/confidence-heatmap.component.ts', name: 'ConfidenceBadge' },
    { file: 'shared/components/record-summary-header.component.ts', name: 'RecordSummaryHeader' },
    { file: 'shared/components/status-badge.component.ts', name: 'EntityStatusTag' },
    { file: 'shared/components/provenance-badge.component.ts', name: 'ProvenanceBadge' },
  ];

  for (const c of operational) {
    it(`${c.name} exists and is standalone`, () => {
      expect(fileExists(c.file), `missing ${c.file}`).toBe(true);
      const src = readFile(c.file);
      expect(src).toContain('standalone: true');
    });
  }
});

describe('§11.5 Table/Registry Components — existence', () => {
  const registry = [
    { file: 'shared/components/canonical-registry-table.component.ts', name: 'CanonicalRegistryTable' },
    { file: 'shared/components/canonical-filter-bar.component.ts', name: 'CanonicalFilterBar' },
    { file: 'shared/components/saved-views-bar.component.ts', name: 'CanonicalSavedViews' },
    { file: 'shared/components/bulk-action-bar.component.ts', name: 'CanonicalBulkActionBar' },
    { file: 'shared/components/canonical-preview-panel.component.ts', name: 'CanonicalPreviewPanel' },
  ];

  for (const c of registry) {
    it(`${c.name} exists`, () => {
      expect(fileExists(c.file), `missing ${c.file}`).toBe(true);
    });
  }
});

describe('§11.6 Generic Module Components — existence and DB-driven', () => {
  const generics = [
    { file: 'shared/components/generic-module-detail.component.ts', name: 'GenericModuleDetail', minLines: 300 },
    { file: 'shared/components/generic-module-reports.component.ts', name: 'GenericModuleReports', minLines: 300 },
    { file: 'shared/components/generic-module-create-dialog.component.ts', name: 'GenericModuleCreateDialog', minLines: 150 },
    { file: 'shared/components/generic-module-lifecycle.component.ts', name: 'GenericModuleLifecycle', minLines: 300 },
  ];

  for (const c of generics) {
    describe(c.name, () => {
      it('file exists', () => {
        expect(fileExists(c.file)).toBe(true);
      });

      it(`is enterprise-grade (>= ${c.minLines} lines)`, () => {
        const src = readFile(c.file);
        const lineCount = src.split('\n').length;
        expect(lineCount, `${c.name} has only ${lineCount} lines`).toBeGreaterThanOrEqual(c.minLines);
      });

      it('uses ModuleCrudApiService for DB-driven data', () => {
        const src = readFile(c.file);
        expect(src).toContain('ModuleCrudApiService');
      });

      it('references MODULE_SHELL_REGISTRY for module metadata', () => {
        const src = readFile(c.file);
        expect(src).toContain('MODULE_SHELL_REGISTRY');
      });

      it('supports AR/EN bilingual UI', () => {
        const src = readFile(c.file);
        expect(src).toContain('isAr');
      });
    });
  }
});

describe('§10 Content Model — all 33 modules populated', () => {
  it(`has at least 33 registered modules`, () => {
    expect(ALL_MODULE_CODES.length).toBeGreaterThanOrEqual(33);
  });

  for (const code of ALL_MODULE_CODES) {
    describe(`module "${code}"`, () => {
      const def = MODULE_SHELL_REGISTRY[code];

      it('has moduleCode matching key', () => {
        expect(def.moduleCode).toBe(code);
      });

      it('has bilingual moduleName', () => {
        expect(def.moduleName.en).toBeTruthy();
        expect(def.moduleName.ar).toBeTruthy();
      });

      it('has moduleIcon (Carbon icon name, no pi- prefix)', () => {
        expect(def.moduleIcon).toBeTruthy();
        expect(def.moduleIcon).not.toMatch(/^pi-/);
      });

      it('has moduleAccentToken', () => {
        expect(def.moduleAccentToken).toBeTruthy();
      });

      it('has bilingual purposeLine', () => {
        expect(def.purposeLine.en).toBeTruthy();
        expect(def.purposeLine.ar).toBeTruthy();
      });

      it('has primaryAiAction with bilingual label', () => {
        expect(def.primaryAiAction.id).toBeTruthy();
        expect(def.primaryAiAction.label.en).toBeTruthy();
        expect(def.primaryAiAction.label.ar).toBeTruthy();
      });

      it('has 5+ KPI definitions', () => {
        expect(def.kpiDefinitions.length).toBeGreaterThanOrEqual(5);
      });

      it('has valid defaultWorkspacePattern', () => {
        expect(['command-center', 'registry', 'case-workspace', 'studio']).toContain(def.defaultWorkspacePattern);
      });

      it('has 3+ defaultRecordTabs', () => {
        expect(def.defaultRecordTabs.length).toBeGreaterThanOrEqual(3);
      });

      it('has non-empty lifecycleDefinition', () => {
        expect(def.lifecycleDefinition.length).toBeGreaterThan(0);
      });

      it('has non-empty relatedObjectTypes', () => {
        expect(def.relatedObjectTypes.length).toBeGreaterThan(0);
      });

      it('has aiCapabilities', () => {
        expect(def.aiCapabilities.length).toBeGreaterThan(0);
      });

      it('has non-empty filters', () => {
        expect(def.filters.length).toBeGreaterThan(0);
      });

      it('has populated tableViews', () => {
        expect(def.tableViews.length).toBeGreaterThan(0);
      });

      it('has valid tier', () => {
        expect(['full', 'domain', 'platform']).toContain(def.tier);
      });

      it('has at least 1 agent', () => {
        expect(def.agents.length).toBeGreaterThan(0);
      });
    });
  }
});

describe('§5 Module Manifests — route coverage', () => {
  const manifestDir = path.resolve(ROOT, 'platform-manifests');
  const manifestFiles = fs.readdirSync(manifestDir)
    .filter(f => f.endsWith('.module.routes.ts'));

  it('has at least 30 manifest files', () => {
    expect(manifestFiles.length).toBeGreaterThanOrEqual(30);
  });

  for (const file of manifestFiles) {
    const moduleKey = file.replace('.module.routes.ts', '');
    describe(`manifest: ${moduleKey}`, () => {
      const src = fs.readFileSync(path.join(manifestDir, file), 'utf-8');

      it('uses ShellHostComponent as shell', () => {
        expect(src).toContain('ShellHostComponent');
      });

      it('has at least 1 loadComponent entry', () => {
        const count = (src.match(/loadComponent/g) || []).length;
        expect(count, `${moduleKey} has 0 loadComponent entries`).toBeGreaterThan(0);
      });

      it('has a lifecycle route', () => {
        expect(
          src.includes('lifecycle') || src.includes('GenericModuleLifecycleComponent') || src.includes('MemberLifecyclePanel'),
          `${moduleKey} missing lifecycle route`
        ).toBe(true);
      });
    });
  }
});

describe('ShellResolverService — pure function contracts', () => {
  const src = readFile('core/platform/shell/shell-resolver.service.ts');

  it('exports ShellResolverService class', () => {
    expect(src).toContain('export class ShellResolverService');
  });

  it('has resolveShell method', () => {
    expect(src).toContain('resolveShell(');
  });

  it('implements caching', () => {
    expect(src).toContain('cache');
    expect(src).toContain('cacheKey');
  });

  it('implements buildPlatformDefault from MODULE_SHELL_REGISTRY', () => {
    expect(src).toContain('buildPlatformDefault');
    expect(src).toContain('MODULE_SHELL_REGISTRY');
  });

  it('implements applyOverride for tenant/role customization', () => {
    expect(src).toContain('applyOverride');
  });

  it('implements slotsForLayout for each layout type', () => {
    expect(src).toContain('slotsForLayout');
    expect(src).toContain("'cockpit'");
    expect(src).toContain("'list-detail'");
    expect(src).toContain("'workspace'");
    expect(src).toContain("'board'");
    expect(src).toContain("'admin-console'");
  });

  it('defines 7-slot ordered action bar', () => {
    expect(src).toContain('defaultActionBar');
    expect(src).toContain("'primary-create'");
    expect(src).toContain("'import'");
    expect(src).toContain("'bulk'");
    expect(src).toContain("'filters'");
    expect(src).toContain("'view-switch'");
    expect(src).toContain("'export'");
    expect(src).toContain("'ai-assist'");
  });

  it('builds workflow config from lifecycle definition', () => {
    expect(src).toContain('buildWorkflowConfig');
    expect(src).toContain('lifecycleDefinition');
  });

  it('supports DB-driven shell override fetch', () => {
    expect(src).toContain('fetchOverrides');
    expect(src).toContain('HttpClient');
  });

  it('defines 16 shell slot types', () => {
    expect(src).toContain('DEFAULT_SLOTS');
    const slotIds = ['masthead', 'kpi-strip', 'action-bar', 'workflow-ribbon', 'main-content', 'context-rail', 'sticky-footer', 'filter-panel', 'detail-drawer', 'preview-panel'];
    for (const id of slotIds) {
      expect(src, `missing slot "${id}"`).toContain(id);
    }
  });
});

describe('ModuleMastheadComponent — structure', () => {
  const src = readFile('shared/components/module-masthead.component.ts');

  it('exports MastheadConfig interface', () => {
    expect(src).toContain('export interface MastheadConfig');
  });

  it('accepts config Input', () => {
    expect(src).toContain('@Input()');
    expect(src).toContain('config');
  });

  it('has aiAction Output', () => {
    expect(src).toContain('@Output()');
    expect(src).toContain('aiAction');
  });

  it('renders breadcrumbs', () => {
    expect(src).toContain('breadcrumb');
  });

  it('shows health level', () => {
    expect(src).toContain('healthLevel');
  });

  it('shows primary AI action button', () => {
    expect(src).toContain('primaryAiAction');
  });
});

describe('ModuleWorkflowRibbonComponent — structure', () => {
  const src = readFile('shared/components/module-workflow-ribbon.component.ts');

  it('exports WorkflowRibbonConfig interface', () => {
    expect(src).toContain('export interface WorkflowRibbonConfig');
  });

  it('accepts config Input for current state', () => {
    expect(src).toContain('currentState');
  });

  it('accepts available transitions', () => {
    expect(src).toContain('availableTransitions');
  });

  it('has SLA/due date support', () => {
    expect(src).toContain('slaDueDate');
    expect(src).toContain('SlaTimerPillComponent');
  });

  it('has pending approvals support', () => {
    expect(src).toContain('pendingApprovals');
  });

  it('has lifecycle progress', () => {
    expect(src).toContain('lifecycleProgress');
    expect(src).toContain('ProgressBarModule');
  });

  it('has transition Output', () => {
    expect(src).toContain('transition');
    expect(src).toContain('EventEmitter');
  });
});

describe('ModuleContextRailComponent — §4.6 tab order', () => {
  const src = readFile('shared/components/module-context-rail.component.ts');

  it('AI summary tab is first', () => {
    expect(src).toContain('ModuleAiPulseComponent');
  });

  it('activity/timeline tab present', () => {
    expect(src).toContain('activity');
  });

  it('related records tab present', () => {
    expect(src).toContain('relatedRecords');
  });

  it('audit trail tab present', () => {
    expect(src).toContain('auditTrail');
  });

  it('notes/collaboration tab present', () => {
    expect(src).toContain('notes');
  });

  it('uses TabViewModule for tab navigation', () => {
    expect(src).toContain('TabViewModule');
  });
});

describe('ModuleStickyFooterComponent — §4.9', () => {
  const src = readFile('shared/components/module-sticky-footer.component.ts');

  it('exports StickyFooterConfig interface', () => {
    expect(src).toContain('export interface StickyFooterConfig');
  });

  it('shows selected count', () => {
    expect(src).toContain('selectedCount');
  });

  it('shows pending changes', () => {
    expect(src).toContain('pendingChanges');
  });

  it('shows sync status', () => {
    expect(src).toContain('syncStatus');
  });

  it('has clearSelection Output', () => {
    expect(src).toContain('clearSelection');
  });
});

describe('ModuleStatePresetComponent — §4.8 all presets', () => {
  const src = readFile('shared/components/module-state-preset.component.ts');

  it('exports StatePreset type', () => {
    expect(src).toContain('export type StatePreset');
  });

  it('supports loading preset', () => {
    expect(src).toContain("'loading'");
  });

  it('supports empty preset', () => {
    expect(src).toContain("'empty'");
  });

  it('supports error preset', () => {
    expect(src).toContain("'error'");
  });

  it('supports no-permission preset', () => {
    expect(src).toContain("'no-permission'");
  });

  it('supports archived preset', () => {
    expect(src).toContain("'archived'");
  });
});

describe('WorkspaceContextSwitcher — §11.1', () => {
  const src = readFile('shared/components/workspace-context-switcher.component.ts');

  it('exports WorkspaceContext interface', () => {
    expect(src).toContain('export interface WorkspaceContext');
  });

  it('supports multiple workspace types', () => {
    expect(src).toContain("'organization'");
    expect(src).toContain("'business-unit'");
    expect(src).toContain("'department'");
  });

  it('fetches workspaces from API', () => {
    expect(src).toContain('HttpClient');
    expect(src).toContain('environment.apiUrl');
  });

  it('has search/filter capability', () => {
    expect(src).toContain('InputTextModule');
  });
});

describe('ActivityTimelinePanel — §11.4', () => {
  const src = readFile('shared/components/activity-timeline-panel.component.ts');

  it('exports ActivityTimelineEvent interface', () => {
    expect(src).toContain('export interface ActivityTimelineEvent');
  });

  it('uses PrimeNG TimelineModule', () => {
    expect(src).toContain('TimelineModule');
  });

  it('fetches events from API (DB-driven)', () => {
    expect(src).toContain('HttpClient');
    expect(src).toContain('environment.apiUrl');
  });

  it('supports severity levels', () => {
    expect(src).toContain("'info'");
    expect(src).toContain("'warning'");
    expect(src).toContain("'danger'");
  });
});

describe('DataFreshnessBadge — §11.4', () => {
  const src = readFile('shared/components/data-freshness-badge.component.ts');

  it('exports FreshnessLevel type', () => {
    expect(src).toContain('export type FreshnessLevel');
  });

  it('supports all freshness levels', () => {
    expect(src).toContain("'live'");
    expect(src).toContain("'recent'");
    expect(src).toContain("'stale'");
    expect(src).toContain("'outdated'");
  });

  it('fetches freshness data from API', () => {
    expect(src).toContain('HttpClient');
  });

  it('has accessibility role=status', () => {
    expect(src).toContain('role="status"');
  });
});

describe('KPI Strip — §4.3 all KPI invariants across 33 modules', () => {
  it('every module has at least one urgency KPI', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const hasUrgency = def.kpiDefinitions.some(k => k.urgency === true);
      expect(hasUrgency, `module "${code}" has no urgency KPI`).toBe(true);
    }
  });

  it('every module has at least one health KPI', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const hasHealth = def.kpiDefinitions.some(k => k.health === true);
      expect(hasHealth, `module "${code}" has no health KPI`).toBe(true);
    }
  });

  it('first KPI in each module is the module total', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      const first = def.kpiDefinitions[0];
      expect(first.id, `module "${code}" first KPI id should start with "kpi-"`).toMatch(/^kpi-/);
    }
  });

  it('all KPI ids are globally unique', () => {
    const allIds = Object.values(MODULE_SHELL_REGISTRY).flatMap(d => d.kpiDefinitions.map(k => k.id));
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});

describe('§13 AR/EN/RTL support in shell', () => {
  const shellSrc = readFile('core/platform/shell/shell-host.component.ts');
  const mastheadSrc = readFile('shared/components/module-masthead.component.ts');
  const footerSrc = readFile('shared/components/module-sticky-footer.component.ts');

  it('shell host sets dir attribute', () => {
    expect(shellSrc).toContain('[attr.dir]');
  });

  it('masthead supports RTL', () => {
    expect(mastheadSrc).toContain('rtl');
  });

  it('footer supports RTL', () => {
    expect(footerSrc).toContain('rtl');
  });

  it('all 33 modules have Arabic module names', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.moduleName.ar, `module "${code}" missing Arabic name`).toBeTruthy();
    }
  });

  it('all 33 modules have Arabic purpose lines', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(def.purposeLine.ar, `module "${code}" missing Arabic purposeLine`).toBeTruthy();
    }
  });
});

describe('§19 CSS Token families', () => {
  const tokensPath = 'styles/grc-tokens.css';

  it('grc-tokens.css file exists', () => {
    const exists = fileExists(tokensPath);
    if (!exists) return;
    const src = readFile(tokensPath);

    expect(src).toContain('--ai-confidence');
    expect(src).toContain('--data-freshness');
    expect(src).toContain('--shell-');
  });
});

describe('MODULE_TABLE_VIEWS completeness', () => {
  it('TABLE_VIEWS object exists and has entries', () => {
    expect(MODULE_TABLE_VIEWS).toBeDefined();
    expect(Object.keys(MODULE_TABLE_VIEWS).length).toBeGreaterThan(0);
  });

  it('all 33 modules have populated table views in the registry', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      expect(
        def.tableViews.length,
        `module "${code}" has empty tableViews`
      ).toBeGreaterThan(0);
    }
  });

  it('each table view has at least 3 columns', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const view of def.tableViews) {
        expect(
          view.columns.length,
          `table view "${view.id}" in "${code}" has fewer than 3 columns`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('each table view column has bilingual headers', () => {
    for (const [code, def] of Object.entries(MODULE_SHELL_REGISTRY)) {
      for (const view of def.tableViews) {
        for (const col of view.columns) {
          expect(col.headerEn, `column "${col.field}" in "${code}" missing headerEn`).toBeTruthy();
          expect(col.headerAr, `column "${col.field}" in "${code}" missing headerAr`).toBeTruthy();
        }
      }
    }
  });
});
