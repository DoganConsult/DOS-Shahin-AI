import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GOV_PAGES_DIR = resolve(__dirname, 'pages');
const GOV_CONSTANTS = resolve(__dirname, 'governance.constants.ts');
const NAV_CONFIG = resolve(__dirname, '../../core/platform/navigation/navigation.config.ts');
const APP_ROUTES = resolve(__dirname, '../../app.routes.ts');
const GOVERNANCE_MODULE_ROUTES = resolve(__dirname, '../../platform-manifests/governance.module.routes.ts');
const INTERCEPTOR = resolve(__dirname, '../../core/interceptors/grc-mutation.interceptor.ts');
const PROJECT_ROOT = resolve(__dirname, '../../../../..');
/** AGRC product manifest registers `/api/governance/*` mounts (not always duplicated in server.ts). */
const AGRC_ROUTE_MANIFEST = resolve(PROJECT_ROOT, 'backend/src/products/agrc/agrc-route-manifest.ts');
/** Canonical route implementations (shims under `backend/src/routes` re-export these). */
const BACKEND_ROUTES_DIR = resolve(PROJECT_ROOT, 'backend/src/modules/governance/routes');

const GOV_PAGE_FILES = [
  'governance-overview.component.ts',
  'governance-committees.component.ts',
  'governance-decisions.component.ts',
  'governance-actions.component.ts',
  'governance-mandates.component.ts',
  'governance-reviews.component.ts',
  'governance-acknowledgements.component.ts',
  'governance-objectives.component.ts',
  'governance-delegations.component.ts',
  'governance-responsibilities.component.ts',
  'governance-raci.component.ts',
  'governance-obligations.component.ts',
  'governance-charters.component.ts',
  'governance-health.component.ts',
  'governance-structure.component.ts',
  'governance-board-packs.component.ts',
  'governance-initiatives.component.ts',
  'governance-milestones.component.ts',
  'governance-digests.component.ts',
  'governance-executive-summaries.component.ts',
];

const BACKEND_ROUTE_FILES = [
  'governance.routes.ts',
  'governance-os.routes.ts',
  'governance-mandates.routes.ts',
  'governance-delegations.routes.ts',
  'governance-obligations.routes.ts',
  'governance-charters.routes.ts',
  'governance-health.routes.ts',
  'governance-structure.routes.ts',
  'governance-board-packs.routes.ts',
  'governance-responsibilities.routes.ts',
  'governance-raci.routes.ts',
  'governance-enforcement.routes.ts',
  'governance-reviews.routes.ts',
  'governance-acknowledgements.routes.ts',
  'governance-objectives.routes.ts',
];

const NEW_ROUTE_MOUNTS = [
  'governance/mandates',
  'governance/delegations',
  'governance/obligations',
  'governance/charters',
  'governance/health',
  'governance/structure',
  'governance/board-packs',
  'governance/responsibilities',
  'governance/raci',
  'governance/enforcement',
  'governance/reviews',
  'governance/acknowledgements',
  'governance/objectives',
];

describe('Governance module — GOVERNANCE_TABS integrity', () => {
  const src = readFileSync(GOV_CONSTANTS, 'utf-8');

  it('has exactly 24 tabs (aligned with hub routes)', () => {
    const tabBlock = src.slice(src.indexOf('GOVERNANCE_TABS'), src.indexOf('];', src.indexOf('GOVERNANCE_TABS')) + 2);
    const matches = tabBlock.match(/\{ id: '/g);
    expect(matches?.length).toBe(24);
  });

  it('has no duplicate tab IDs', () => {
    const ids = [...src.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('has no duplicate tab icons', () => {
    const icons = [...src.matchAll(/icon: '([^']+)'/g)].map(m => m[1]);
    expect(icons.length).toBe(new Set(icons).size);
  });

  it('all 12 new tab IDs present', () => {
    const newIds = ['mandates', 'reviews', 'acknowledgements', 'objectives', 'delegations', 'responsibilities', 'raci', 'obligations', 'charters', 'health', 'structure', 'board-packs'];
    for (const id of newIds) {
      expect(src).toContain(`id: '${id}'`);
    }
  });

  it('all tab routes start with /governance/', () => {
    const routes = [...src.matchAll(/route: '([^']+)'/g)].map(m => m[1]);
    for (const r of routes) {
      expect(r).toMatch(/^\/governance\//);
    }
  });
});

describe('Governance module — navigation.config.ts alignment', () => {
  const navSrc = readFileSync(NAV_CONFIG, 'utf-8');

  it('has 24 governance sidebar children', () => {
    const children = [...navSrc.matchAll(/\{ id: '(governance-[^']+)'/g)];
    expect(children.length).toBe(24);
  });

  it('all extended nav items present (mandates … digests)', () => {
    const newNavIds = [
      'governance-mandates', 'governance-reviews', 'governance-acknowledgements',
      'governance-objectives', 'governance-delegations', 'governance-responsibilities',
      'governance-raci', 'governance-obligations', 'governance-charters',
      'governance-health', 'governance-structure', 'governance-board-packs',
      'governance-initiatives', 'governance-milestones', 'governance-digests',
    ];
    for (const id of newNavIds) {
      expect(navSrc).toContain(`id: '${id}'`);
    }
  });
});

describe('Governance module — app.routes + governance.module.routes', () => {
  const routesSrc = readFileSync(APP_ROUTES, 'utf-8');
  const manifestSrc = readFileSync(GOVERNANCE_MODULE_ROUTES, 'utf-8');
  const combined = `${routesSrc}\n${manifestSrc}`;

  it('has all 12 new child route keys in manifest', () => {
    const newPaths = ['mandates', 'reviews', 'acknowledgements', 'objectives', 'delegations', 'responsibilities', 'raci', 'obligations', 'charters', 'health', 'structure', 'board-packs'];
    for (const p of newPaths) {
      const keySnippet = p.includes('-') ? `'${p}':` : `${p}:`;
      expect(combined).toContain(keySnippet);
    }
  });

  it('lazy-loads GovernanceMandatesComponent', () => {
    expect(combined).toContain('GovernanceMandatesComponent');
  });

  it('lazy-loads GovernanceHealthComponent', () => {
    expect(combined).toContain('GovernanceHealthComponent');
  });

  it('lazy-loads GovernanceBoardPacksComponent', () => {
    expect(combined).toContain('GovernanceBoardPacksComponent');
  });

  it('lazy-loads GovernanceStructureComponent', () => {
    expect(combined).toContain('GovernanceStructureComponent');
  });
});

describe('Governance module — frontend page components exist', () => {
  for (const file of GOV_PAGE_FILES) {
    it(`${file} exists`, () => {
      expect(existsSync(resolve(GOV_PAGES_DIR, file))).toBe(true);
    });
  }
});

describe('Governance module — page components import GOVERNANCE_TABS', () => {
  const pagesWithTabs = GOV_PAGE_FILES.filter(f => f !== 'governance-overview.component.ts');
  for (const file of pagesWithTabs) {
    it(`${file} uses GOVERNANCE_TABS`, () => {
      const content = readFileSync(resolve(GOV_PAGES_DIR, file), 'utf-8');
      expect(content).toContain('GOVERNANCE_TABS');
    });
  }
});

describe('Governance module — 15 backend route files exist', () => {
  for (const file of BACKEND_ROUTE_FILES) {
    it(`${file} exists`, () => {
      expect(existsSync(resolve(BACKEND_ROUTES_DIR, file))).toBe(true);
    });
  }
});

describe('Governance module — backend routes use auth + tenant isolation', () => {
  const securedFiles = BACKEND_ROUTE_FILES.filter(f => f !== 'governance.routes.ts' && f !== 'governance-os.routes.ts');
  for (const file of securedFiles) {
    it(`${file} uses authenticate middleware`, () => {
      const src = readFileSync(resolve(BACKEND_ROUTES_DIR, file), 'utf-8');
      expect(src).toContain('authenticate');
    });

    it(`${file} uses requirePermission`, () => {
      const src = readFileSync(resolve(BACKEND_ROUTES_DIR, file), 'utf-8');
      expect(src).toContain('requirePermission');
    });

    it(`${file} uses tenant isolation (tenantSchema or req.tenantId)`, () => {
      const src = readFileSync(resolve(BACKEND_ROUTES_DIR, file), 'utf-8');
      expect(src.includes('tenantSchema') || src.includes('req.tenantId')).toBe(true);
    });
  }
});

describe('Governance module — agrc-route-manifest route registration', () => {
  const manifestSrc = readFileSync(AGRC_ROUTE_MANIFEST, 'utf-8');

  for (const mount of NEW_ROUTE_MOUNTS) {
    it(`mounts /api/${mount}`, () => {
      expect(manifestSrc).toContain(`/api/${mount}`);
    });
  }

  it('imports all 13 new governance route modules', () => {
    const imports = [
      'governance-mandates.routes', 'governance-delegations.routes', 'governance-obligations.routes',
      'governance-charters.routes', 'governance-health.routes', 'governance-structure.routes',
      'governance-board-packs.routes', 'governance-responsibilities.routes', 'governance-raci.routes',
      'governance-enforcement.routes', 'governance-reviews.routes', 'governance-acknowledgements.routes',
      'governance-objectives.routes',
    ];
    for (const imp of imports) {
      expect(manifestSrc).toContain(imp);
    }
  });
});

describe('Governance module — mutation interceptor coverage', () => {
  const src = readFileSync(INTERCEPTOR, 'utf-8');

  it('intercepts /governance/ sub-routes', () => {
    expect(src).toContain('governance\\/mandates');
    expect(src).toContain('governance\\/delegations');
    expect(src).toContain('governance\\/obligations');
    expect(src).toContain('governance\\/charters');
    expect(src).toContain('governance\\/health');
    expect(src).toContain('governance\\/structure');
    expect(src).toContain('governance\\/board-packs');
    expect(src).toContain('governance\\/responsibilities');
    expect(src).toContain('governance\\/raci');
    expect(src).toContain('governance\\/enforcement');
    expect(src).toContain('governance\\/reviews');
    expect(src).toContain('governance\\/acknowledgements');
    expect(src).toContain('governance\\/objectives');
  });

  it('maps governance API paths to governance entity bucket', () => {
    const line = src.split('\n').find(l => l.includes('governance\\/mandates'));
    expect(line).toContain("'governance'");
  });
});

describe('Governance module — health score backend recalculate', () => {
  const src = readFileSync(resolve(BACKEND_ROUTES_DIR, 'governance-health.routes.ts'), 'utf-8');

  it('has 8-dimension weighted scoring', () => {
    expect(src).toContain('policy_health');
    expect(src).toContain('accountability');
    expect(src).toContain('committee_effectiveness');
    expect(src).toContain('decision_execution');
    expect(src).toContain('exception_exposure');
    expect(src).toContain('action_timeliness');
    expect(src).toContain('mandate_validity');
    expect(src).toContain('review_discipline');
  });

  it('has recalculate endpoint', () => {
    expect(src).toContain('/recalculate');
  });

  it('computes weighted overall score', () => {
    expect(src).toContain('weightedSum');
    expect(src).toContain('totalWeight');
  });
});

describe('Governance module — SQL migrations exist', () => {
  const MIGRATIONS_DIR = resolve(PROJECT_ROOT, 'backend/src/migrations/tenant');

  it('100_governance_wiring_additions.sql exists', () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, '100_governance_wiring_additions.sql'))).toBe(true);
  });

  it('106_governance_phase2_consolidation.sql exists', () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, '106_governance_phase2_consolidation.sql'))).toBe(true);
  });

  it('102_governance_enforcement.sql exists', () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, '102_governance_enforcement.sql'))).toBe(true);
  });

  it('103_governance_health_scores.sql exists', () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, '103_governance_health_scores.sql'))).toBe(true);
  });

  it('104_governance_structural_modules.sql exists', () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, '104_governance_structural_modules.sql'))).toBe(true);
  });
});

describe('Governance module — board-packs auto-assemble endpoint', () => {
  const src = readFileSync(resolve(BACKEND_ROUTES_DIR, 'governance-board-packs.routes.ts'), 'utf-8');

  it('has assemble endpoint', () => {
    expect(src).toContain('/assemble');
  });

  it('has approve endpoint', () => {
    expect(src).toContain('/approve');
  });

  it('has publish endpoint', () => {
    expect(src).toContain('/publish');
  });
});

describe('Governance module — enforcement scan endpoint', () => {
  const src = readFileSync(resolve(BACKEND_ROUTES_DIR, 'governance-enforcement.routes.ts'), 'utf-8');

  it('has /scan endpoint', () => {
    expect(src).toContain('/scan');
  });

  it('checks for NO_CHARTER violation', () => {
    expect(src).toContain('NO_CHARTER');
  });

  it('checks for OVERDUE_ACTION violation', () => {
    expect(src).toContain('OVERDUE_ACTION');
  });

  it('checks for EXPIRED_MANDATE violation', () => {
    expect(src).toContain('EXPIRED_MANDATE');
  });

  it('has /violations endpoint', () => {
    expect(src).toContain('/violations');
  });

  it('has resolve endpoint', () => {
    expect(src).toContain('/resolve');
  });
});
