import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  // missing-wrapper: DosCard / DosTile (no @dos/ui-system tile primitive yet)
  TilesModule,
  // missing-wrapper: DosStatusBanner (only DosLoadingState/DosEmptyState exist; banner pending)
  NotificationModule,
  // missing-wrapper: DosButton variants for size=sm primary; current DosButton wrapper does not yet expose Carbon size token
  ButtonModule,
  // missing-wrapper: DosTag / DosStatusPill (no @dos/ui-system tag primitive yet)
  TagModule,
  // missing-wrapper: DosLink (no @dos/ui-system link primitive yet)
  LinkModule,
  // missing-wrapper: DosResponsiveGrid (page already uses CSS grid below; Carbon GridModule retained for cds-tile context)
  GridModule,
} from 'carbon-components-angular';
import { AccessStore, WORKSPACE_NAV_LABEL_RESOLVER, type WorkspaceNavLabelResolver } from '@dos/access-store';

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceModuleCard view-model
//
// Status decision tree (evaluated top-to-bottom, first match wins):
//   trial_blocked    — trial expired or usage limit reached
//   registry_drift   — entitled but code absent from dos.module_registry
//   metadata_missing — in registry but no MODULE_META entry
//   route_missing    — has metadata but no confirmed Angular route
//   active           — entitled + metadata + confirmed route + not trial-blocked
// ─────────────────────────────────────────────────────────────────────────────
interface WorkspaceModuleCard {
  moduleCode:         string;
  productKey:         string;
  title:              string;
  subtitle:           string;
  status:             'active' | 'route_missing' | 'metadata_missing' | 'registry_drift' | 'trial_blocked';
  statusReason:       string;
  route:              string;
  permissions:        string[];
  primaryActionLabel: string;
  isPlatformDefault:  boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE_META — display metadata for known platform modules.
//
// A module code NOT in this map → status 'metadata_missing'.
//
// PHASE-F TODO (DEBT MARKER):
// This local map duplicates data owned by `dos.dynamic_ui_modules` /
// `dos.dynamic_ui_navigation` / `dos.module_registry`. Phase F (DB-Driven
// UI Management) will replace it with a runtime fetch from the
// dynamic-ui-service resolver. Until then, this map is the LAST-RESORT
// fallback; titles/descriptions are first resolved through the
// `WorkspaceNavLabelResolver` (`nav.item.<code>` and
// `module.<code>.description`). Do not add new modules here without
// also registering them in the i18n catalog.
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_META: Record<string, { title: string; description: string }> = {
  // ── Platform DNA ──────────────────────────────────────────────────────────
  foundation: {
    title: 'Foundation',
    description: 'Organization structure, users, roles, delegations, and governance scaffolding.',
  },
  dauth: {
    title: 'DAuth',
    description: 'Identity, authentication, role assignments, and session management.',
  },
  dnoc: {
    title: 'DNOC',
    description: 'Network operations center — observability and platform health monitoring.',
  },
  dsoc: {
    title: 'DSOC',
    description: 'Security operations — threat detection, incident triage, and audit correlation.',
  },
  dos: {
    title: 'DOS Platform',
    description: 'Platform operating system — core runtime, registry, and module lifecycle.',
  },
  // ── AI (each is a distinct module code — do NOT conflate) ─────────────────
  ai: {
    title: 'AI Engine',
    description: 'GRC copilot, contextual assistant, inference, autonomous triggers, and AI squad management.',
  },
  'ai-platform': {
    title: 'AI Platform',
    description: 'Platform-tier AI orchestration — agent registry, dead-letter queue, trace correlation, handoff management.',
  },
  'ai-os': {
    title: 'AI OS',
    description: 'AI Operating System — multi-agent pipelines, dry-run/replay controls, and orchestration contracts.',
  },
  'ai-governance': {
    title: 'AI Governance',
    description: 'AI model risk, bias evaluation, oversight policies, and AI decision audit trail.',
  },
  'agrc-engine': {
    title: 'AGRC Engine',
    description: 'Autonomous GRC workflow engine — discovery, cycle management, agent handoff, and proposed actions.',
  },
  // ── Config / admin ────────────────────────────────────────────────────────
  'config-center': {
    title: 'Config Center',
    description: 'Platform configuration management — feature flags, integration settings, tenant policy overrides.',
  },
  admin: {
    title: 'Administration',
    description: 'Tenant admin console — user management, roles, audit log, and system settings.',
  },
  analytics: {
    title: 'Analytics',
    description: 'Cross-module KPIs, trend analysis, and AI-assisted insights.',
  },
  reporting: {
    title: 'Reporting',
    description: 'Executive summaries, board-level views, and operational reports.',
  },
  workflow: {
    title: 'Workflow Engine',
    description: 'Configurable approval workflows, escalation rules, and process automation.',
  },
  notification: {
    title: 'Notifications',
    description: 'Event subscriptions, delivery rules, and alert management.',
  },
  // ── GRC core ──────────────────────────────────────────────────────────────
  governance: {
    title: 'Governance',
    description: 'Policy lifecycle, committee management, delegations, and governance records.',
  },
  risk: {
    title: 'Risk Management',
    description: 'Risk register, assessment flows, appetite settings, and treatment tracking.',
  },
  compliance: {
    title: 'Compliance',
    description: 'Control mapping, compliance posture, obligation tracking, and program management.',
  },
  controls: {
    title: 'Controls',
    description: 'Control libraries, ownership assignments, attestations, and deficiency tracking.',
  },
  evidence: {
    title: 'Evidence',
    description: 'Evidence collection, packaging, and readiness tracking for reviews and audits.',
  },
  audit: {
    title: 'Audit',
    description: 'Audit planning, fieldwork coordination, finding management, and reporting.',
  },
  policy: {
    title: 'Policy Management',
    description: 'Policy authoring, versioning, distribution, and attestation workflows.',
  },
  // ── GRC operations ────────────────────────────────────────────────────────
  vendor: {
    title: 'Vendor Management',
    description: 'Vendor risk assessments, contract management, and third-party oversight.',
  },
  incident: {
    title: 'Incident Management',
    description: 'Incident capture, triage, escalation, and post-incident review.',
  },
  bcp: {
    title: 'Business Continuity',
    description: 'BCP plans, BIA, continuity testing, and disaster recovery coordination.',
  },
  asset: {
    title: 'Asset Management',
    description: 'Asset registry, classification, lifecycle tracking, and ownership mapping.',
  },
  training: {
    title: 'Training',
    description: 'Compliance training programs, completion tracking, and certification management.',
  },
  remediation: {
    title: 'Remediation',
    description: 'Finding remediation tracking, action plans, and deadline management.',
  },
  action: {
    title: 'Action Items',
    description: 'Cross-module action item management, assignment, and closure workflows.',
  },
  privacy: {
    title: 'Privacy',
    description: 'Data processing activities, DPIA management, consent tracking, and privacy obligations.',
  },
  qiyas: {
    title: 'Qiyas (Maturity)',
    description: 'Organizational maturity assessment, scoring, and improvement roadmap.',
  },
  onboarding: {
    title: 'Onboarding',
    description: 'Tenant and user onboarding workflows, guided setup, and readiness validation.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE_ROUTES — ONLY routes confirmed mounted in app.routes.ts.
//
// Proof of each entry (products/shahin-ai/app/src/app/app.routes.ts):
//   foundation  → line 87:  path 'foundation', redirect '' → 'overview', child 'overview' loadComponent
//   compliance  → line 123: path 'compliance', redirect '' → 'overview', children from complianceRouteChildren
//   dauth       → line 28:  dnaModuleRoutes from SHAHIN_DNA_MODULE_PACKS, moduleCode 'dauth', child 'home'
//   dnoc        → line 28:  dnaModuleRoutes, moduleCode 'dnoc', child 'home'
//   dsoc        → line 28:  dnaModuleRoutes, moduleCode 'dsoc', child 'home'
//   dos         → line 28:  dnaModuleRoutes, moduleCode 'dos', child 'home'
//   ai          → line 28:  dnaModuleRoutes, moduleCode 'ai', child 'home'
//
// NOT included (no route in app.routes.ts or dna-nav-contracts.ts):
//   risk, controls, evidence, audit, knowledge, reporting, analytics,
//   ai-platform, ai-os, ai-governance, agrc-engine, vendor, incident,
//   bcp, asset, training, governance, policy, etc.
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_ROUTES: Readonly<Record<string, string>> = {
  foundation:    '/foundation/overview',
  compliance:    '/compliance/overview',
  dauth:         '/dauth/home',
  dnoc:          '/dnoc/home',
  dsoc:          '/dsoc/home',
  dos:           '/dos/home',
  ai:            '/ai/home',
  // config-center: mounted at app.routes.ts:157, path 'admin/config-center' → child 'resolve'
  // Guard: configCenterGuard (platform.config_center.read). Components: PrimeNG-based (SPA-only path aliases resolve correctly in product build context).
  'config-center': '/admin/config-center/resolve',
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE_REGISTRY_CODES — module codes known in dos.module_registry.
// Any entitled code NOT in this set → registry_drift.
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_REGISTRY_CODES = new Set([
  'action', 'admin', 'agrc-engine', 'ai', 'ai-governance', 'ai-os', 'ai-platform',
  'analytics', 'asset', 'audit', 'bcp', 'compliance', 'config-center', 'controls',
  'dashboard', 'dauth', 'dnoc', 'dos', 'dsoc', 'evidence', 'exception', 'foundation',
  'governance', 'incident', 'integrations', 'navigation', 'notification', 'onboarding',
  'policy', 'privacy', 'provisioning', 'qiyas', 'remediation', 'reporting',
  'risk', 'training', 'vendor', 'workflow',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Display ordering: known modules first, unknown codes last.
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_ORDER: readonly string[] = [
  'foundation', 'dauth', 'dnoc', 'dsoc', 'dos',
  'ai', 'ai-platform', 'ai-os', 'ai-governance', 'agrc-engine',
  'config-center', 'admin', 'analytics', 'reporting', 'workflow', 'notification',
  'governance', 'risk', 'compliance', 'controls', 'evidence', 'audit', 'policy',
  'vendor', 'incident', 'bcp', 'asset', 'training', 'remediation',
  'action', 'privacy', 'qiyas', 'onboarding',
];

function sortModules(codes: string[]): string[] {
  const orderMap = new Map(MODULE_ORDER.map((c, i) => [c, i]));
  return [...codes].sort((a, b) => {
    const ia = orderMap.get(a) ?? MODULE_ORDER.length;
    const ib = orderMap.get(b) ?? MODULE_ORDER.length;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}

@Component({
  selector: 'app-workspace-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TilesModule,
    NotificationModule,
    ButtonModule,
    TagModule,
    LinkModule,
    GridModule,
  ],
  template: `
    <section class="wh">
      <header class="wh__head">
        <p class="wh__eyebrow">{{ i18n('workspace.home.eyebrow') }}</p>
        <h1 class="wh__title">{{ tenantName() }}</h1>
        <p class="wh__sub">
          {{ tenantStatusLabel() }}
          &nbsp;{{ sep() }}&nbsp;
          {{ activeCount() }} {{ i18n('workspace.home.metric.active') }}
          &nbsp;{{ sep() }}&nbsp;
          {{ entitledCount() }} {{ i18n('workspace.home.metric.entitled') }}
          &nbsp;{{ sep() }}&nbsp;
          {{ visibleCount() }} {{ i18n('workspace.home.metric.visible') }}
          &nbsp;{{ sep() }}&nbsp;
          {{ permissionCount() }} {{ permissionCount() === 1 ? i18n('workspace.home.metric.permission') : i18n('workspace.home.metric.permissions') }}
        </p>
      </header>

      @if (!access.loaded()) {
        <cds-inline-notification
          [notificationObj]="loadingNotification()"
        ></cds-inline-notification>
      } @else if (loadError()) {
        <cds-inline-notification
          [notificationObj]="errorNotification()"
        ></cds-inline-notification>
      } @else if (cards().length === 0) {
        <cds-tile>
          <h2 class="wh__h2">{{ i18n('workspace.home.empty.title') }}</h2>
          <p class="wh__empty">
            {{ i18n('workspace.home.empty.body') }}
          </p>
          <a cdsLink routerLink="/tenant-profile">{{ i18n('workspace.home.empty.cta') }}</a>
        </cds-tile>
      } @else {
        <!-- Active cards -->
        @if (activeCards().length > 0) {
          <div class="wh__grid">
            @for (card of activeCards(); track card.moduleCode) {
              <ng-container *ngTemplateOutlet="moduleCard; context: { $implicit: card }"></ng-container>
            }
          </div>
        }

        <!-- Attention required: route_missing / metadata_missing / registry_drift / trial_blocked -->
        @if (attentionCards().length > 0) {
          <details class="wh__attention" [open]="attentionCards().length <= 5">
            <summary class="wh__attention-summary">
              {{ attentionCards().length }} {{ attentionCards().length === 1 ? i18n('workspace.home.attention.singular') : i18n('workspace.home.attention.plural') }}
            </summary>
            <div class="wh__grid wh__grid--muted">
              @for (card of attentionCards(); track card.moduleCode) {
                <ng-container *ngTemplateOutlet="moduleCard; context: { $implicit: card }"></ng-container>
              }
            </div>
          </details>
        }
      }

      <!-- Reusable card template -->
      <ng-template #moduleCard let-card>
        <cds-tile class="wh__card wh__card--{{ card.status }}">
          <div class="wh__card-head">
            <strong class="wh__card-title">{{ card.title }}</strong>
            <cds-tag [type]="tagType(card.status)" size="sm">{{ statusLabel(card.status) }}</cds-tag>
          </div>
          <p class="wh__card-sub">{{ card.subtitle }}</p>
          @if (card.isPlatformDefault && !isEntitled(card.moduleCode)) {
            <p class="wh__card-note">{{ i18n('workspace.home.card.platform_default') }}</p>
          }
          @if (card.statusReason && card.status !== 'active') {
            <p class="wh__card-reason">{{ card.statusReason }}</p>
          }
          @if (card.permissions.length > 0) {
            <p class="wh__card-perms">{{ card.permissions.length }} {{ card.permissions.length === 1 ? i18n('workspace.home.card.permission') : i18n('workspace.home.card.permissions') }}</p>
          }
          <div class="wh__card-foot">
            <button
              cdsButton="primary"
              size="sm"
              [disabled]="card.status !== 'active'"
              (click)="open(card)">
              {{ card.primaryActionLabel }}
            </button>
          </div>
        </cds-tile>
      </ng-template>
    </section>
  `,
  styles: [`
    .wh {
      display: grid;
      gap: var(--cds-spacing-05, 1rem);
      padding: var(--cds-spacing-05, 1rem);
      max-width: 1280px;
      margin-inline: auto;
    }
    .wh__head h1 { margin: 0; font-size: 2rem; font-weight: 300; color: var(--cds-text-primary); }
    .wh__eyebrow { margin: 0 0 .25rem 0; color: var(--cds-text-secondary); text-transform: uppercase; font-size: .75rem; letter-spacing: .08em; }
    .wh__sub { margin: .25rem 0 0 0; color: var(--cds-text-secondary); }
    .wh__h2 { margin: 0 0 .5rem 0; font-size: 1.125rem; }
    .wh__empty { color: var(--cds-text-secondary); margin: 0 0 .75rem 0; }
    .wh__grid {
      display: grid;
      gap: var(--cds-spacing-05, 1rem);
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
    .wh__grid--muted { opacity: .85; }
    .wh__card { display: flex; flex-direction: column; gap: .5rem; min-height: 168px; }
    .wh__card-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
    .wh__card-title { color: var(--cds-text-primary); font-size: 1rem; }
    .wh__card-sub { color: var(--cds-text-secondary); margin: 0; line-height: 1.4; font-size: .875rem; }
    .wh__card-note { color: var(--cds-text-helper); margin: 0; font-size: .75rem; font-style: italic; }
    .wh__card-reason { color: var(--cds-support-warning, #f1c21b); margin: 0; font-size: .75rem; line-height: 1.4; }
    .wh__card-perms { color: var(--cds-text-helper); margin: 0; font-size: .75rem; }
    .wh__card-foot { margin-top: auto; }
    .wh__card--route_missing .wh__card-title,
    .wh__card--metadata_missing .wh__card-title,
    .wh__card--registry_drift .wh__card-title { color: var(--cds-text-secondary); }
    .wh__attention { border-top: 1px solid var(--cds-border-subtle-00); padding-top: var(--cds-spacing-05, 1rem); }
    .wh__attention-summary {
      cursor: pointer;
      font-size: .875rem;
      color: var(--cds-text-secondary);
      margin-bottom: var(--cds-spacing-05, 1rem);
      user-select: none;
    }
    .wh__attention-summary:hover { color: var(--cds-text-primary); }
  `],
})
export class WorkspaceHomeComponent {
  readonly access = inject(AccessStore);
  private readonly router = inject(Router);
  private readonly labelResolver = inject<WorkspaceNavLabelResolver | null>(
    WORKSPACE_NAV_LABEL_RESOLVER, { optional: true },
  );

  /** Resolve an i18n key through the workspace label resolver; falls back to the key itself. */
  i18n(key: string): string {
    const v = this.labelResolver?.shellChromeString?.(key);
    return v ?? key;
  }

  /** Visual separator (·) — externalized so RTL/locale can override. */
  readonly sep = computed(() => this.i18n('workspace.home.separator'));

  readonly permissionCount = computed(() => this.access.permissions().length);
  readonly loadError = computed(() => this.access.error());

  readonly tenantName = computed(() => {
    const t = this.access.tenant();
    return t?.name || t?.code || this.i18n('workspace.home.eyebrow');
  });

  readonly tenantStatusLabel = computed(() => {
    const t = this.access.tenant();
    if (!t?.status) return this.i18n('workspace.home.tenant.status_pending');
    const statusKey = `status.tenant.${t.status}`;
    const localized = this.labelResolver?.shellChromeString?.(statusKey);
    const label = localized ?? t.status;
    return `${this.i18n('workspace.home.tenant.status_prefix')} ${label}`;
  });

  readonly loadingNotification = computed(() => ({
    type: 'info',
    title: this.i18n('workspace.home.loading.title'),
    subtitle: this.i18n('workspace.home.loading.subtitle'),
    lowContrast: true,
    showClose: false,
  }));

  readonly errorNotification = computed(() => ({
    type: 'error',
    title: this.i18n('workspace.home.error.title'),
    subtitle: this.loadError() ?? '',
    lowContrast: true,
    showClose: false,
  }));

  // ── Card resolver ─────────────────────────────────────────────────────────
  readonly cards = computed<WorkspaceModuleCard[]>(() => {
    const entitled = this.access.modules();
    // Foundation is platform default — always visible, but NOT counted as entitled
    // unless access.modules() explicitly returned it.
    const all = Array.from(new Set([...entitled, 'foundation']));
    if (all.length === 0) return [];

    const expired   = new Set(this.access.trialExpiredModules());
    const limitsHit = new Set(this.access.trialLimitsHitModules());
    const allPerms  = this.access.permissions();
    const productKey = this.access.tenant()?.code ?? 'shahin-ai';
    const entitledSet = new Set(entitled);

    return sortModules(all).map((code): WorkspaceModuleCard => {
      const meta  = MODULE_META[code];
      // Prefer label resolver (`nav.item.<code>`) so AR/EN comes from the
      // i18n catalog; fall back to MODULE_META; finally humanize the code.
      const resolverTitle = this.labelResolver?.navItemLabel?.(code, code);
      const title = (resolverTitle && resolverTitle !== code)
        ? resolverTitle
        : (meta?.title ?? code.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '));
      const resolverDesc = this.labelResolver?.shellChromeString?.(`module.${code}.description`);
      const desc  = resolverDesc ?? meta?.description ?? '';
      const route = MODULE_ROUTES[code] ?? '';
      const modPerms = allPerms.filter(p => typeof p === 'string' && p.startsWith(`${code}.`));
      const isPlatformDefault = code === 'foundation';

      // ── 5-tier status decision tree (first match wins) ──────────────────
      let status: WorkspaceModuleCard['status'];
      let statusReason: string;
      let subtitle: string;
      let primaryActionLabel: string;

      if (expired.has(code)) {
        status = 'trial_blocked';
        statusReason = this.i18n('workspace.home.reason.trial_expired');
        subtitle = desc || this.i18n('workspace.home.subtitle.trial_expired');
        primaryActionLabel = this.i18n('workspace.home.card.cta.trial_expired');
      } else if (limitsHit.has(code)) {
        status = 'trial_blocked';
        statusReason = this.i18n('workspace.home.reason.limit_reached');
        subtitle = desc || this.i18n('workspace.home.subtitle.limit_reached');
        primaryActionLabel = this.i18n('workspace.home.card.cta.limit_reached');
      } else if (!MODULE_REGISTRY_CODES.has(code)) {
        status = 'registry_drift';
        statusReason = this.i18n('workspace.home.reason.registry_drift');
        subtitle = this.i18n('workspace.home.subtitle.registry_drift');
        primaryActionLabel = this.i18n('workspace.home.card.cta.registry_drift');
      } else if (!meta) {
        status = 'metadata_missing';
        statusReason = this.i18n('workspace.home.reason.metadata_missing');
        subtitle = this.i18n('workspace.home.subtitle.metadata_missing');
        primaryActionLabel = route
          ? this.i18n('workspace.home.card.cta.open')
          : this.i18n('workspace.home.card.cta.not_configured');
      } else if (!route) {
        status = 'route_missing';
        statusReason = this.i18n('workspace.home.reason.route_missing');
        subtitle = desc;
        primaryActionLabel = this.i18n('workspace.home.card.cta.route_missing');
      } else {
        status = 'active';
        statusReason = '';
        subtitle = desc;
        primaryActionLabel = this.i18n('workspace.home.card.cta.open');
      }

      return { moduleCode: code, productKey, title, subtitle, status, statusReason, route, permissions: modPerms, primaryActionLabel, isPlatformDefault };
    });
  });

  // Active cards for the primary grid.
  readonly activeCards = computed(() =>
    this.cards().filter(c => c.status === 'active')
  );

  // Non-active cards for the attention section.
  readonly attentionCards = computed(() =>
    this.cards().filter(c => c.status !== 'active')
  );

  // ── Metrics ─────────────────────────────────────────────────────────────
  /** Active = cards with status 'active' (entitled + metadata + confirmed route + not trial-blocked). */
  readonly activeCount = computed(() => this.activeCards().length);

  /** Total entitled = access.modules().length (does NOT include foundation platform default). */
  readonly entitledCount = computed(() => this.access.modules().length);

  /** Visible = total rendered cards. */
  readonly visibleCount = computed(() => this.cards().length);

  constructor() {
    void this.access.load();
  }

  /** Check if a module code was explicitly returned by access.modules(). */
  isEntitled(moduleCode: string): boolean {
    return this.access.modules().includes(moduleCode);
  }

  tagType(s: WorkspaceModuleCard['status']): string {
    switch (s) {
      case 'active':           return 'green';
      case 'route_missing':    return 'warm-gray';
      case 'metadata_missing': return 'blue';
      case 'registry_drift':   return 'purple';
      case 'trial_blocked':    return 'red';
    }
  }

  statusLabel(s: WorkspaceModuleCard['status']): string {
    return this.i18n(`workspace.home.status.${s}`);
  }

  open(card: WorkspaceModuleCard): void {
    if (card.status !== 'active' || !card.route) return;
    void this.router.navigateByUrl(card.route);
  }
}
