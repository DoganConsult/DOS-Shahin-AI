import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const FEATURES_DIR = resolve(__dirname);

const ALL_FEATURE_MODULES = readdirSync(FEATURES_DIR)
  .filter(name => {
    const full = join(FEATURES_DIR, name);
    return statSync(full).isDirectory() && name !== '__tests__';
  })
  .sort();

describe('All feature modules — dashboards/ directory exists', () => {
  for (const mod of ALL_FEATURE_MODULES) {
    it(`${mod}/dashboards/ exists`, () => {
      expect(existsSync(resolve(FEATURES_DIR, mod, 'dashboards'))).toBe(true);
    });
  }
});

describe('All feature modules — dashboards/ contains at least one component', () => {
  for (const mod of ALL_FEATURE_MODULES) {
    it(`${mod}/dashboards/ has a .component.ts file`, () => {
      const dashDir = resolve(FEATURES_DIR, mod, 'dashboards');
      if (!existsSync(dashDir)) return;
      const files = readdirSync(dashDir).filter(f => f.endsWith('.component.ts'));
      expect(files.length).toBeGreaterThanOrEqual(1);
    });
  }
});

describe('All feature modules — index.ts barrel export exists', () => {
  for (const mod of ALL_FEATURE_MODULES) {
    it(`${mod}/index.ts exists`, () => {
      expect(existsSync(resolve(FEATURES_DIR, mod, 'index.ts'))).toBe(true);
    });
  }
});

describe('All feature modules — index.ts exports dashboard component', () => {
  for (const mod of ALL_FEATURE_MODULES) {
    it(`${mod}/index.ts references dashboards/`, () => {
      const indexPath = resolve(FEATURES_DIR, mod, 'index.ts');
      if (!existsSync(indexPath)) return;
      const src = readFileSync(indexPath, 'utf-8');
      expect(src.includes('./dashboards/') || src.includes('Dashboard')).toBe(true);
    });
  }
});

describe('All dashboard components follow canonical conventions', () => {
  for (const mod of ALL_FEATURE_MODULES) {
    const dashDir = resolve(FEATURES_DIR, mod, 'dashboards');
    if (!existsSync(dashDir)) continue;

    const dashFiles = readdirSync(dashDir).filter(f => f.endsWith('.component.ts'));
    for (const file of dashFiles) {
      const filePath = resolve(dashDir, file);
      const src = readFileSync(filePath, 'utf-8');

      describe(`${mod}/dashboards/${file}`, () => {
        it('is standalone', () => {
          expect(src).toContain('standalone: true');
        });

        it('uses OnPush change detection', () => {
          expect(src).toContain('ChangeDetectionStrategy.OnPush');
        });

        it('implements OnInit', () => {
          expect(src).toContain('implements OnInit');
        });

        it('injects HttpClient', () => {
          expect(src).toContain('HttpClient');
        });

        it('injects I18nService', () => {
          expect(src.includes('I18nService') || src.includes('OnboardingPlatformPort') || src.includes('ONBOARDING_PLATFORM')).toBe(true);
        });

        it('uses takeUntilDestroyed', () => {
          expect(src).toContain('takeUntilDestroyed');
        });

        it('uses signals', () => {
          expect(src).toContain('signal(');
        });

        it('supports RTL', () => {
          expect(src).toContain('i18n.direction()');
        });

        it('has responsive CSS', () => {
          expect(src).toContain('@media');
        });

        it('has loading state', () => {
          expect(src).toContain('loading()');
        });

        it('has KPI display', () => {
          expect(src.includes('kpi-grid') || src.includes('kpi-card') || src.includes('kpiEntries')).toBe(true);
        });
      });
    }
  }
});
