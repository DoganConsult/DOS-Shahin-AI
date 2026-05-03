import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  TilesModule,
  NotificationModule,
  ButtonModule,
  TagModule,
  LinkModule,
  GridModule,
} from 'carbon-components-angular';
import { AccessStore } from '@dos/access-store';

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
        <p class="wh__eyebrow">Workspace</p>
        <h1 class="wh__title">{{ tenantName() }}</h1>
        <p class="wh__sub">
          {{ tenantStatusLabel() }}
          &nbsp;·&nbsp;
          {{ activeCount() }} active
          &nbsp;·&nbsp;
          {{ entitledCount() }} entitled
          &nbsp;·&nbsp;
          {{ visibleCount() }} visible
          &nbsp;·&nbsp;
          {{ permissionCount() }} permission{{ permissionCount() === 1 ? '' : 's' }}
        </p>
      </header>

      @if (!access.loaded()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'info', title: 'Loading workspace…', subtitle: 'Resolving entitled modules.', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
      } @else if (loadError()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'error', title: 'Could not load workspace', subtitle: loadError() ?? '', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
      } @else if (cards().length === 0) {
        <cds-tile>
          <h2 class="wh__h2">No modules activated for this tenant</h2>
          <p class="wh__empty">
            Contact your workspace administrator to activate modules.
          </p>
          <a cdsLink routerLink="/tenant-profile">Open tenant profile →</a>
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
              {{ attentionCards().length }} module{{ attentionCards().length === 1 ? '' : 's' }} need attention
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
            <p class="wh__card-note">Platform default</p>
          }
          @if (card.statusReason && card.status !== 'active') {
            <p class="wh__card-reason">{{ card.statusReason }}</p>
          }
          @if (card.permissions.length > 0) {
            <p class="wh__card-perms">{{ card.permissions.length }} permission{{ card.permissions.length === 1 ? '' : 's' }}</p>
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

  readonly tenantName = computed(() => {
    const t = this.access.tenant();
    return t?.name || t?.code || 'Workspace';
  });

  readonly tenantStatusLabel = computed(() => {
    const t = this.access.tenant();
    if (!t?.status) return 'Tenant status pending';
    return `Tenant ${t.status}`;
  });

  readonly permissionCount = computed(() => this.access.permissions().length);
  readonly loadError = computed(() => this.access.error());

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
      const title = meta?.title ?? code.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      const desc  = meta?.description ?? '';
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
        statusReason = 'Trial period has expired for this module.';
        subtitle = desc || 'Trial expired — contact your administrator.';
        primaryActionLabel = 'Trial expired';
      } else if (limitsHit.has(code)) {
        status = 'trial_blocked';
        statusReason = 'Trial usage limit reached for this module.';
        subtitle = desc || 'Usage limit reached — upgrade to continue.';
        primaryActionLabel = 'Limit reached';
      } else if (!MODULE_REGISTRY_CODES.has(code)) {
        status = 'registry_drift';
        statusReason = `Module '${code}' is entitled but has no entry in the platform module registry.`;
        subtitle = `Entitled module with no registry entry.`;
        primaryActionLabel = 'Registry drift';
      } else if (!meta) {
        status = 'metadata_missing';
        statusReason = `Module '${code}' is registered but has no display metadata configured.`;
        subtitle = 'Entitled module — no metadata configured.';
        primaryActionLabel = route ? 'Open module' : 'Not configured';
      } else if (!route) {
        status = 'route_missing';
        statusReason = `Module '${code}' is entitled but has no route mounted in the application.`;
        subtitle = desc;
        primaryActionLabel = 'Route not wired';
      } else {
        status = 'active';
        statusReason = '';
        subtitle = desc;
        primaryActionLabel = 'Open module';
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
    switch (s) {
      case 'active':           return 'Active';
      case 'route_missing':    return 'Route missing';
      case 'metadata_missing': return 'Metadata missing';
      case 'registry_drift':   return 'Registry drift';
      case 'trial_blocked':    return 'Trial blocked';
    }
  }

  open(card: WorkspaceModuleCard): void {
    if (card.status !== 'active' || !card.route) return;
    void this.router.navigateByUrl(card.route);
  }
}
