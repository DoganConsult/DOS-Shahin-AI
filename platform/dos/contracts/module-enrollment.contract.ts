/**
 * Module Enrollment Contract — Phase 1 (Read-only) / Phase 2 (Read-only deep)
 * / Phase 3 (Read+Write).
 *
 * Aligned with @dos/ui-contracts (UI-System v2):
 *   - Pages extend `PageContract` + `ResponsiveContract`.
 *   - Page/widget archetypes are `ApprovedComponentKey` (the 22 Dos* keys),
 *     NOT raw Carbon archetype strings. Carbon `carbon_key` mapping lives
 *     in the CI `ui_system_preflight.components[]` block per
 *     `.modules-isolation/workspace/ci-gates/PREFLIGHT_CHECKLIST.md`.
 *   - SideNav root entry follows `NavigationItemContract`.
 *   - Page-level actions follow `ActionContract`.
 *
 * Constraints (locked):
 *   - Phase 1 = exactly the 5 standard pages (Home, Register, Detail,
 *     Settings, Audit). All read-only.
 *   - Every widget archetype MUST be one of `APPROVED_COMPONENT_KEYS`.
 *   - Every page MUST cite the real GET endpoint that backs each widget.
 *   - Every page MUST cite the AccessStore permission that gates it.
 *   - Apps and depth-1 sub-apps follow the same 5-page contract.
 */

import { z } from 'zod';
import {
  APPROVED_COMPONENT_KEYS,
  type ApprovedComponentKey,
} from '../../ui-system/dos-ui-contracts/src/component-keys.js';
import type { PageContract } from '../../ui-system/dos-ui-contracts/src/page-contract.js';
import type { NavigationItemContract } from '../../ui-system/dos-ui-contracts/src/navigation-contract.js';
import type { ActionContract } from '../../ui-system/dos-ui-contracts/src/action-contract.js';
import type { ResponsiveBehavior } from '../../ui-system/dos-ui-contracts/src/responsive-contract.js';

// ─── Standard 5 page IDs ──────────────────────────────────────────────────
export const STANDARD_PAGE_IDS = [
  'home', 'register', 'detail', 'settings', 'audit',
] as const;
export type StandardPageId = typeof STANDARD_PAGE_IDS[number];

export const MODULE_PHASE = ['phase-1', 'phase-2', 'phase-3'] as const;
export type ModulePhase = typeof MODULE_PHASE[number];

// ─── Zod mirrors of @dos/ui-contracts shapes ──────────────────────────────
const ApprovedComponentKeyEnum = z.enum(
  APPROVED_COMPONENT_KEYS as unknown as [ApprovedComponentKey, ...ApprovedComponentKey[]],
);

const ResponsiveBehaviorSchema = z.object({
  mobile:  z.string().min(1),
  tablet:  z.string().min(1),
  desktop: z.string().min(1),
}) satisfies z.ZodType<ResponsiveBehavior>;

const ActionContractSchema = z.object({
  id: z.string().min(1),
  labelKey: z.string().min(1),
  icon: z.string().optional(),
  priority: z.enum(['primary', 'secondary', 'tertiary', 'overflow']),
  permissions: z.array(z.string().regex(/^[a-z0-9.-]+$/)).optional(),
  mobile: z.enum(['visible', 'overflow', 'hidden']).optional(),
  destructive: z.boolean().optional(),
}) satisfies z.ZodType<ActionContract>;

// ─── Per-widget contract ──────────────────────────────────────────────────
export const PageWidgetSchema = z.object({
  slot: z.enum([
    'header', 'hero', 'toolbar', 'filters', 'body',
    'tabs', 'tab-body', 'footer', 'banner', 'side-panel',
  ]),
  /** ApprovedComponentKey (Dos* UI-system key). The shell resolves it to
   *  a Carbon renderer via component-map.ts; this contract never names a
   *  carbon_key directly. */
  componentKey: ApprovedComponentKeyEnum,
  /** Real GET endpoint that feeds this widget. Required even in Phase 1. */
  source: z.object({
    method: z.literal('GET'),
    path: z.string().regex(/^\/api\//, 'Source must be a real /api/* path'),
    tenantScoped: z.literal(true),
    /** OpenAPI fragment id for response shape. */
    schemaRef: z.string().min(1),
  }),
  /** Optional permission override; defaults to page.permissions. */
  permissions: z.array(z.string().regex(/^[a-z0-9.-]+$/)).optional(),
  /** Disabled-with-tooltip in Phase 1; activated by phase. */
  writeAction: z.object({
    enabledFromPhase: z.enum(['phase-3']),
    tooltipKey: z.string(),
  }).optional(),
});
export type PageWidget = z.infer<typeof PageWidgetSchema>;

// ─── Per-page contract — extends @dos/ui-contracts PageContract ──────────
export const ModulePageSchema = z.object({
  id: z.enum(STANDARD_PAGE_IDS),
  /** PageContract.pageCode — kebab/lowercase; unique within module. */
  pageCode: z.string().regex(/^[a-z][a-z0-9-]+$/),
  /** PageContract.moduleCode — must equal the enrolling module. */
  moduleCode: z.string().regex(/^[a-z][a-z0-9-]+$/),
  /** PageContract.titleKey — i18n. */
  titleKey: z.string().min(1),
  /** PageContract.descriptionKey — i18n; optional. */
  descriptionKey: z.string().optional(),
  /** URL fragment under /<module>/. e.g. 'home', 'register/:id'. */
  routePath: z.string(),
  /** Phase at which the page first becomes navigable. */
  introducedAt: z.enum(MODULE_PHASE),
  /** PageContract.permissions — dot-style codes. */
  permissions: z.array(z.string().regex(/^[a-z0-9.-]+$/)).min(1),
  /** Show in sidenav. Detail page = false (reached via Register). */
  inSideNav: z.boolean(),
  /** ResponsiveContract.responsive — every page MUST declare all 3. */
  responsive: ResponsiveBehaviorSchema,
  /** PageContract.componentKeys — full allow-list this page may render.
   *  Computed: the union of widget componentKeys plus AppShell. CI guard
   *  refuses any widget whose componentKey is not in this allow-list. */
  componentKeys: z.array(ApprovedComponentKeyEnum).min(1),
  /** PageContract.actions — page-level command-bar/header actions. */
  actions: z.array(ActionContractSchema).optional(),
  /** Ordered widget slots that compose the page. */
  widgets: z.array(PageWidgetSchema).min(1),
  /** Empty-state widget; required, never blank. Must be EmptyState or
   *  LoadingState component_key from APPROVED_COMPONENT_KEYS. */
  emptyState: z.object({
    componentKey: z.enum(['EmptyState', 'LoadingState', 'StatusBanner']),
    messageKey: z.string(),
  }),
});
export type ModulePage = z.infer<typeof ModulePageSchema>;
// Static structural compatibility with PageContract:
const _pageCompat: PageContract = {
  pageCode: '', moduleCode: '', titleKey: '',
  componentKeys: [],
  responsive: { mobile: '', tablet: '', desktop: '' },
};
void _pageCompat;

// ─── App / sub-app composition ────────────────────────────────────────────
export const ModuleAppSchema = z.object({
  appCode: z.string().regex(/^[a-z][a-z0-9-]+$/),
  displayNameKey: z.string(),
  permissions: z.array(z.string()).min(1),
  pages: z.array(ModulePageSchema).length(5),
  subApps: z.array(z.object({
    appCode: z.string().regex(/^[a-z][a-z0-9-]+$/),
    displayNameKey: z.string(),
    permissions: z.array(z.string()).min(1),
    pages: z.array(ModulePageSchema).length(5),
  })).optional(),
});
export type ModuleApp = z.infer<typeof ModuleAppSchema>;

// ─── SideNav root entry — NavigationItemContract shape ────────────────────
const SideNavSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/),
  labelKey: z.string().min(1),
  /** Canonical icon system: lucide / material-icons-outlined per DosNavItem.
   *  No `pi-*` / `mdi-*` allowed by the UI-system guard. */
  icon: z.string().regex(/^[a-z][a-z0-9-]+$/, 'lucide/mio key, no pi-* / mdi-*'),
  route: z.string().min(1),
  moduleCode: z.string().regex(/^[a-z][a-z0-9-]+$/),
  permissions: z.array(z.string().regex(/^[a-z0-9.-]+$/)).min(1),
  order: z.number().int().min(0).optional(),
  children: z.array(z.lazy((): z.ZodTypeAny => SideNavSchema)).optional(),
}) satisfies z.ZodType<NavigationItemContract & { id: string; order?: number }>;

// ─── "Prepared for review" gate ───────────────────────────────────────────
export const PreparedForReviewSchema = z.object({
  phase: z.enum(MODULE_PHASE),
  submittedAt: z.string().datetime(),
  submittedBy: z.string().min(1),
  apiContracts: z.object({
    openApiPath: z.string().min(1),
    endpointsImplemented: z.boolean(),
    examplesPresent: z.boolean(),
  }),
  data: z.object({
    seedProvider: z.string().min(1),
    devSeedLoaded: z.boolean(),
    rlsApplied: z.boolean(),
  }),
  permissions: z.object({
    keysRegistered: z.boolean(),
    defaultGrantsSeeded: z.boolean(),
    negativeTestPassed: z.boolean(),
  }),
  ui: z.object({
    /** All widget.componentKey values resolve through @dos/ui-system COMPONENT_MAP. */
    componentMapResolved: z.boolean(),
    /** No PrimeNG / Material / pi-* / emoji on the 5 pages. */
    forbiddenUiClean: z.boolean(),
    /** Mobile 390 + RTL screenshots attached. */
    responsiveProofPath: z.string().min(1),
    /** Path to ui_system_preflight.components[] block (CI). */
    uiSystemPreflightPath: z.string().min(1),
  }),
  audit: z.object({
    eventsFlowing: z.boolean(),
    decisionLedgerWired: z.boolean(),
  }),
  build: z.object({
    shahinBuildPass: z.boolean(),
    dynamicUiGatesPass: z.boolean(),
    tenancyAccessGuardsPass: z.boolean(),
    /** ui-component-allowlist.mjs guard PASS. */
    uiAllowlistPass: z.boolean(),
    /** ui-responsive-contract.mjs guard PASS. */
    uiResponsivePass: z.boolean(),
  }),
  rollback: z.object({
    sqlDownPath: z.string().min(1),
    rehearsedInStaging: z.boolean(),
  }),
  notes: z.string().optional(),
});
export type PreparedForReview = z.infer<typeof PreparedForReviewSchema>;

// ─── Top-level module enrollment block ────────────────────────────────────
export const ModuleEnrollmentContractSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  moduleCode: z.string().regex(/^[a-z][a-z0-9-]+$/),
  currentPhase: z.enum(MODULE_PHASE),

  pages: z.array(ModulePageSchema).length(5)
    .refine(
      (pages) => {
        const ids = pages.map(p => p.id);
        return STANDARD_PAGE_IDS.every(req => ids.includes(req));
      },
      { message: 'Module must enroll exactly the 5 standard pages: home, register, detail, settings, audit' },
    ),

  apps: z.array(ModuleAppSchema).optional(),

  /** SideNav root entry — NavigationItemContract shape. */
  sideNav: SideNavSchema,

  /** Five canonical permission keys per module. */
  permissions: z.object({
    read:          z.string(),
    write:         z.string(),
    delete:        z.string(),
    settingsWrite: z.string(),
    auditRead:     z.string(),
  }),

  prepared: PreparedForReviewSchema.optional(),
});
export type ModuleEnrollmentContract = z.infer<typeof ModuleEnrollmentContractSchema>;

// ─── Validator ────────────────────────────────────────────────────────────
export function validateModuleEnrollment(input: unknown): ModuleEnrollmentContract {
  const parsed = ModuleEnrollmentContractSchema.parse(input);

  // 1. Detail page must NOT be in sidenav.
  const detail = parsed.pages.find(p => p.id === 'detail');
  if (detail && detail.inSideNav) {
    throw new Error('Detail page must have inSideNav=false (reached via Register row click).');
  }

  // 2. Every page.moduleCode must equal the enrolling module.
  for (const p of parsed.pages) {
    if (p.moduleCode !== parsed.moduleCode) {
      throw new Error(`Page ${p.id} has moduleCode=${p.moduleCode}, expected ${parsed.moduleCode}`);
    }
  }

  // 3. Every widget.componentKey must be in page.componentKeys allow-list
  //    (PageContract invariant).
  for (const p of parsed.pages) {
    const allow = new Set(p.componentKeys);
    for (const w of p.widgets) {
      if (!allow.has(w.componentKey)) {
        throw new Error(
          `Page ${p.id}: widget componentKey '${w.componentKey}' not in page.componentKeys allow-list`,
        );
      }
    }
  }

  // 4. read + auditRead permissions must be exercised by at least one page.
  const used = new Set(parsed.pages.flatMap(p => p.permissions));
  for (const k of [parsed.permissions.read, parsed.permissions.auditRead]) {
    if (!used.has(k)) {
      throw new Error(`Permission ${k} declared in permissions block but not used by any page.`);
    }
  }

  return parsed;
}
