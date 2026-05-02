import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const FEATURES_DIR = resolve(__dirname);

const TIER_A_MODULES = [
  { name: 'ai', dashboardClass: 'AiModuleDashboardComponent', dashboardFile: 'ai-dashboard.component.ts', apiEndpoint: '/api/ai/dashboard' },
  { name: 'ai-governance', dashboardClass: 'AiGovernanceDashboardComponent', dashboardFile: 'ai-governance-dashboard.component.ts', apiEndpoint: '/api/ai-governance/dashboard' },
  { name: 'compliance', dashboardClass: 'ComplianceDashboardComponent', dashboardFile: 'compliance-dashboard.component.ts', apiEndpoint: '/api/compliance/dashboard' },
  { name: 'evidence', dashboardClass: 'EvidenceDashboardComponent', dashboardFile: 'evidence-dashboard.component.ts', apiEndpoint: '/api/evidence/dashboard' },
  { name: 'governance', dashboardClass: 'GovernanceDashboardComponent', dashboardFile: 'governance-dashboard.component.ts', apiEndpoint: '/api/governance/dashboard' },
  { name: 'workflow', dashboardClass: 'WorkflowDashboardComponent', dashboardFile: 'workflow-dashboard.component.ts', apiEndpoint: '/api/workflow/dashboard' },
];

describe('Tier A — dashboards/ directory exists for all modules', () => {
  for (const mod of TIER_A_MODULES) {
    it(`${mod.name}/dashboards/ directory exists`, () => {
      expect(existsSync(resolve(FEATURES_DIR, mod.name, 'dashboards'))).toBe(true);
    });
  }
});

describe('Tier A — dashboard component files exist', () => {
  for (const mod of TIER_A_MODULES) {
    it(`${mod.name}/dashboards/${mod.dashboardFile} exists`, () => {
      expect(existsSync(resolve(FEATURES_DIR, mod.name, 'dashboards', mod.dashboardFile))).toBe(true);
    });
  }
});

describe('Tier A — dashboard components follow canonical conventions', () => {
  for (const mod of TIER_A_MODULES) {
    const filePath = resolve(FEATURES_DIR, mod.name, 'dashboards', mod.dashboardFile);

    describe(`${mod.name} dashboard component`, () => {
      const src = readFileSync(filePath, 'utf-8');

      it('is a standalone component', () => {
        expect(src).toContain('standalone: true');
      });

      it('uses OnPush change detection', () => {
        expect(src).toContain('ChangeDetectionStrategy.OnPush');
      });

      it(`exports ${mod.dashboardClass}`, () => {
        expect(src).toContain(`export class ${mod.dashboardClass}`);
      });

      it('implements OnInit', () => {
        expect(src).toContain('implements OnInit');
      });

      it('injects HttpClient', () => {
        expect(src).toContain('HttpClient');
      });

      it('injects I18nService', () => {
        expect(src).toContain('I18nService');
      });

      it('uses takeUntilDestroyed for subscription cleanup', () => {
        expect(src).toContain('takeUntilDestroyed');
      });

      it('uses signals for reactive state', () => {
        expect(src).toContain('signal(');
      });

      it(`fetches data from ${mod.apiEndpoint}`, () => {
        expect(src).toContain(mod.apiEndpoint);
      });

      it('supports RTL via i18n.direction()', () => {
        expect(src).toContain('i18n.direction()');
      });

      it('has responsive CSS (media query)', () => {
        expect(src).toContain('@media');
      });

      it('has loading state', () => {
        expect(src).toContain('loading()');
      });

      it('has KPI grid', () => {
        expect(src).toContain('kpi-grid');
      });
    });
  }
});

describe('Tier A — index.ts barrel exports exist for all modules', () => {
  for (const mod of TIER_A_MODULES) {
    it(`${mod.name}/index.ts exists`, () => {
      expect(existsSync(resolve(FEATURES_DIR, mod.name, 'index.ts'))).toBe(true);
    });
  }
});

describe('Tier A — index.ts barrel exports re-export dashboard component', () => {
  for (const mod of TIER_A_MODULES) {
    it(`${mod.name}/index.ts exports ${mod.dashboardClass}`, () => {
      const indexPath = resolve(FEATURES_DIR, mod.name, 'index.ts');
      const src = readFileSync(indexPath, 'utf-8');
      expect(src).toContain(mod.dashboardClass);
    });
  }
});

describe('Tier A — index.ts barrel exports re-export core artifacts', () => {
  const MODULES_WITH_NEW_INDEX = TIER_A_MODULES.filter(m => m.name !== 'ai');

  for (const mod of MODULES_WITH_NEW_INDEX) {
    describe(`${mod.name}/index.ts`, () => {
      const src = readFileSync(resolve(FEATURES_DIR, mod.name, 'index.ts'), 'utf-8');

      it('exports from services/', () => {
        expect(src).toContain('./services/');
      });

      it('exports from admin/', () => {
        expect(src).toContain('./admin/');
      });

      it('exports from diagnostics/', () => {
        expect(src).toContain('./diagnostics/');
      });

      it('exports from state/', () => {
        expect(src).toContain('./state/');
      });

      it('exports from widgets/', () => {
        expect(src).toContain('./widgets/');
      });

      it('exports from contracts/', () => {
        expect(src).toContain('./contracts/');
      });

      it('exports from workflows/', () => {
        expect(src).toContain('./workflows/');
      });

      it('exports from dashboards/', () => {
        expect(src).toContain('./dashboards/');
      });
    });
  }
});
