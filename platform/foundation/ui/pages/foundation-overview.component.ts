import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, DestroyRef, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { FoundationApiService, FoundationOverviewData } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';




import {
  DynamicAgentExperienceResolver,
  DynamicUiBootstrapService,
  UserContextResolver,
} from '@app/core/services/platform/dynamic-page-experience.resolver';
import { isCapabilityActive } from '../ports/dynamic-page.port';
import { FoundationKpiGridComponent } from '../components/foundation-kpi-grid.component';
import { KpiCardVM } from '../shared/foundation-types';


interface NbaItem { id: string; titleKey: string; route: string; priority: 'critical'|'attention'|'recommended'; }
interface RailItem { id: string; titleKey: string; count: number; route: string; }
interface CrumbItem { labelKey: string; route?: string; }

const FOUNDATION_REALTIME_EVENTS = [
  'ready',
  'foundation.org_created',
  'foundation.org_updated',
  'foundation.dept_created',
  'foundation.dept_updated',
  'foundation.role_assigned',
  'foundation.role_revoked',
  'foundation.scope_changed',
] as const;

@Component({
  selector: 'app-foundation-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FoundationKpiGridComponent],
  styles: [`
    :host { display: block; }
    .ovw {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: var(--cds-spacing-06, 24px);
      padding: var(--cds-spacing-06, 24px) var(--cds-spacing-07, 32px);
      min-height: 100vh;
      background: var(--shell-page-bg, var(--cds-layer-01, #f4f4f4));
      --module-accent: #1f6feb;
    }
    @media (max-width: 960px) { .ovw { grid-template-columns: 1fr; } }
    .ovw-main { min-width: 0; display: flex; flex-direction: column; gap: var(--cds-spacing-06, 24px); }
    .ovw-rail { display: flex; flex-direction: column; gap: var(--cds-spacing-05, 16px); }
    .masthead {
      background: var(--shell-card-bg, var(--cds-layer-02, #fff));
      border: 1px solid var(--shell-card-border, var(--cds-border-subtle-00));
      border-radius: var(--radius-md, 8px);
      padding: var(--cds-spacing-05, 16px) var(--cds-spacing-06, 24px);
      box-shadow: var(--shell-elevation-01, 0 1px 2px rgba(0,0,0,.06));
    }
    .crumbs { display: flex; gap: var(--cds-spacing-02, 4px); font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary, var(--cds-text-secondary)); margin-bottom: var(--cds-spacing-03, 8px); }
    .crumbs a { color: inherit; text-decoration: none; }
    .crumbs a:hover { color: var(--module-accent); text-decoration: underline; }
    .crumbs .sep { opacity: .5; }
    .ovw-header { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--cds-spacing-05, 16px); flex-wrap: wrap; }
    .ovw-title { font-size: var(--cds-heading-04-size, 1.75rem); font-weight: 600; margin: 0; color: var(--shell-text-primary, var(--cds-text-primary)); }
    .ovw-subtitle { font-size: var(--cds-body-01-size, .875rem); color: var(--shell-text-secondary, var(--cds-text-secondary)); margin: var(--cds-spacing-02, 4px) 0 0; }
    .ovw-chips { display: flex; gap: var(--cds-spacing-03, 8px); flex-wrap: wrap; margin-top: var(--cds-spacing-03, 8px); }
    .chip { padding: var(--cds-spacing-02, 4px) var(--cds-spacing-04, 12px); border-radius: 999px; background: var(--shell-card-bg, var(--cds-layer-02, #fff)); border: 1px solid var(--shell-card-border, var(--cds-border-subtle-00, #e0e0e0)); font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary, var(--cds-text-secondary)); }
    .chip--accent { color: var(--module-accent); border-color: var(--module-accent); background: var(--shell-card-bg, var(--cds-layer-02, #fff)); }
    .chip--ok { color: var(--cds-support-success, #24a148); border-color: var(--cds-support-success, #24a148); }
    .header-actions { display: flex; align-items: center; gap: var(--cds-spacing-03, 8px); }
    .views { display: flex; gap: var(--cds-spacing-02, 4px); }
    .views button { padding: var(--cds-spacing-02, 4px) var(--cds-spacing-04, 12px); border: 1px solid var(--shell-card-border, var(--cds-border-subtle-00)); background: transparent; border-radius: var(--radius-sm, 4px); cursor: pointer; font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary, var(--cds-text-secondary)); }
    .views button.active { background: var(--module-accent); color: #fff; border-color: var(--module-accent); }
    .why-btn { background: transparent; border: 1px dashed var(--shell-card-border, var(--cds-border-subtle-00)); border-radius: var(--radius-sm, 4px); padding: var(--cds-spacing-02, 4px) var(--cds-spacing-04, 12px); font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary, var(--cds-text-secondary)); cursor: pointer; }
    .why-btn:hover { color: var(--module-accent); border-color: var(--module-accent); }
    .why-pop { background: var(--shell-card-bg, var(--cds-layer-02)); border: 1px solid var(--shell-card-border, var(--cds-border-subtle-00)); border-radius: var(--radius-sm, 4px); padding: var(--cds-spacing-04, 12px); margin-top: var(--cds-spacing-03, 8px); font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary); }
    .why-pop dt { font-weight: 600; color: var(--shell-text-primary); margin-top: var(--cds-spacing-02, 4px); }
    .why-pop dd { margin: 0 0 var(--cds-spacing-02, 4px) 0; }
    .signature {
      background: var(--shell-card-bg, var(--cds-layer-02, #fff));
      border: 1px solid var(--shell-card-border, var(--cds-border-subtle-00));
      border-radius: var(--radius-md, 8px);
      padding: var(--cds-spacing-06, 24px);
      box-shadow: var(--shell-elevation-01, 0 1px 2px rgba(0,0,0,.06));
    }
    .signature-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--cds-spacing-05, 16px); flex-wrap: wrap; gap: var(--cds-spacing-03, 8px); }
    .signature-title { margin: 0; font-size: var(--cds-heading-03-size, 1.25rem); font-weight: 600; color: var(--shell-text-primary); }
    .signature-meta { font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary); }
    .quick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--cds-spacing-04, 12px); }
    .quick-tile { display: flex; flex-direction: column; gap: var(--cds-spacing-02, 4px); padding: var(--cds-spacing-04, 12px) var(--cds-spacing-05, 16px); background: var(--cds-layer-01, #f4f4f4); border-radius: var(--radius-sm, 4px); text-decoration: none; color: inherit; border-inline-start: 3px solid var(--module-accent); }
    .quick-tile:hover { background: var(--shell-card-bg, var(--cds-layer-02)); box-shadow: var(--shell-elevation-01, 0 1px 2px rgba(0,0,0,.06)); }
    .quick-label { font-size: var(--cds-body-compact-01-size, .875rem); color: var(--shell-text-secondary); }
    .quick-value { font-size: var(--cds-heading-03-size, 1.25rem); font-weight: 700; color: var(--module-accent); }
    .panel { background: var(--shell-card-bg, var(--cds-layer-02, #fff)); border: 1px solid var(--shell-card-border, var(--cds-border-subtle-00)); border-radius: var(--radius-md, 8px); padding: var(--cds-spacing-05, 16px); }
    .panel-title { font-size: var(--cds-heading-02-size, 1rem); font-weight: 600; margin: 0 0 var(--cds-spacing-04, 12px); color: var(--shell-text-primary); }
    .rail-row, .nba-row { display: flex; align-items: center; justify-content: space-between; padding: var(--cds-spacing-03, 8px) 0; border-bottom: 1px solid var(--shell-card-border, var(--cds-border-subtle-00)); font-size: var(--cds-body-compact-01-size, .875rem); text-decoration: none; color: inherit; }
    .rail-row:last-child, .nba-row:last-child { border-bottom: none; }
    .rail-count { font-weight: 700; color: var(--module-accent); text-decoration: none; }
    .nba-row[data-priority="critical"] .nba-dot { background: var(--cds-support-error, #da1e28); }
    .nba-row[data-priority="attention"] .nba-dot { background: var(--cds-support-warning, #f1c21b); }
    .nba-row[data-priority="recommended"] .nba-dot { background: var(--cds-support-info, #0043ce); }
    .nba-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-inline-end: var(--cds-spacing-02, 4px); }
    .agent-btn { display: inline-flex; align-items: center; gap: var(--cds-spacing-02, 4px); background: var(--module-accent); color: #fff; border: 0; border-radius: var(--radius-sm, 4px); padding: var(--cds-spacing-03, 8px) var(--cds-spacing-04, 12px); cursor: pointer; font-size: var(--cds-body-compact-01-size, .875rem); }
    .empty { text-align: center; padding: var(--cds-spacing-07, 32px); color: var(--shell-text-secondary); }
    .empty-title { font-size: var(--cds-heading-02-size, 1rem); font-weight: 600; color: var(--shell-text-primary); margin: 0 0 var(--cds-spacing-02, 4px); }
    .err { padding: var(--cds-spacing-04, 12px); border-radius: var(--radius-sm, 4px); background: var(--shell-status-danger-bg, #fee); color: var(--cds-support-error, #da1e28); border: 1px solid var(--cds-support-error, #da1e28); margin-bottom: var(--cds-spacing-04, 12px); font-size: var(--cds-body-compact-01-size); }
    .warn { padding: var(--cds-spacing-03, 8px) var(--cds-spacing-04, 12px); border-radius: var(--radius-sm, 4px); background: var(--shell-status-warning-bg, #fff4d6); color: var(--cds-text-primary); border: 1px solid var(--cds-support-warning, #f1c21b); margin-bottom: var(--cds-spacing-04, 12px); font-size: var(--cds-body-compact-01-size); }
    .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--cds-support-success, #24a148); margin-inline-end: var(--cds-spacing-02, 4px); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .access-denied { padding: var(--cds-spacing-07, 32px); text-align: center; color: var(--shell-text-secondary); }
    .skeleton { background: linear-gradient(90deg, var(--cds-layer-01) 0%, var(--cds-layer-02) 50%, var(--cds-layer-01) 100%); background-size: 200% 100%; animation: shimmer 1.4s infinite; height: 64px; border-radius: var(--radius-sm, 4px); }
    @keyframes shimmer { 0%{background-position: 200% 0;} 100%{background-position: -200% 0;} }
  `],
  template: `
    @if (!visibleForUser()) {
      <div class="access-denied" role="alert">
        <h2>{{ i18n.translate('foundation.overview.accessDeniedTitle') }}</h2>
        <p>{{ i18n.translate('foundation.overview.accessDeniedBody') }}</p>
      </div>
    } @else {
      <div class="ovw" [dir]="i18n.direction()" [attr.data-layout]="layout()" [attr.data-page-type]="pageType()" [attr.data-module]="'foundation'">
        <!-- main column -->
        <div class="ovw-main">
          <!-- Page Masthead (spec §26.1) -->
          <header class="masthead">
            <nav class="crumbs" [attr.aria-label]="i18n.translate('foundation.overview.contextRail')">
              @for (c of breadcrumbs(); track c.labelKey; let last = $last) {
                @if (c.route && !last) {
                  <a [routerLink]="c.route">{{ i18n.translate(c.labelKey) }}</a>
                  <span class="sep">/</span>
                } @else {
                  <span>{{ i18n.translate(c.labelKey) }}</span>
                }
              }
            </nav>
            <div class="ovw-header">
              <div>
                <h1 class="ovw-title">{{ i18n.translate('foundation.overview.title') }}</h1>
                <p class="ovw-subtitle">{{ i18n.translate('foundation.overview.subtitle') }}</p>
                <div class="ovw-chips">
                  @if (realtimeEnabled()) {
                    <span class="chip chip--ok"><span class="live-dot"></span>{{ i18n.translate('foundation.overview.live') }}</span>
                  }
                </div>
              </div>
              <div class="header-actions">
                <button class="why-btn" type="button" (click)="toggleWhy()" [attr.aria-pressed]="whyOpen()" [attr.aria-expanded]="whyOpen()">
                  {{ i18n.translate('foundation.overview.whyAmISeeing') }}
                </button>
                <div class="views" role="tablist" [attr.aria-label]="i18n.translate('foundation.overview.views')">
                  <button type="button" [class.active]="view() === 'command-center'" (click)="setView('command-center')" role="tab" [attr.aria-selected]="view() === 'command-center'">
                    {{ i18n.translate('foundation.overview.view.commandCenter') }}
                  </button>
                  <button type="button" [class.active]="view() === 'recent'" (click)="setView('recent')" role="tab" [attr.aria-selected]="view() === 'recent'">
                    {{ i18n.translate('foundation.overview.view.recent') }}
                  </button>
                </div>
              </div>
            </div>
            @if (whyOpen()) {
              <dl class="why-pop" role="region" [attr.aria-label]="i18n.translate('foundation.overview.whyAmISeeing')">
                <dt>{{ i18n.translate('foundation.overview.whyProfile') }}</dt>
                <dd>{{ profileType() || i18n.translate('foundation.overview.whyProfileUnknown') }}</dd>
                <dt>{{ i18n.translate('foundation.overview.whyDataScope') }}</dt>
                <dd>{{ dataScopeLabel() }}</dd>
                <dt>{{ i18n.translate('foundation.overview.whyContract') }}</dt>
                <dd>{{ i18n.translate('foundation.overview.whyContractValue') }}</dd>
              </dl>
            }
          </header>

          @if (error()) { <div class="err" role="alert">{{ error() }}</div> }
          @if (loadWarnings().length) {
            <div class="warn" role="status">
              {{ i18n.translate('foundation.overview.partial.summary') }}
              @if (translatedWarnings().length) {
                <details style="margin-top:6px;">
                  <summary style="cursor:pointer;">{{ i18n.translate('foundation.overview.partial.details') }}</summary>
                  <ul style="margin:6px 0 0 18px; padding:0;">
                    @for (w of translatedWarnings(); track w) { <li>{{ w }}</li> }
                  </ul>
                </details>
              }
            </div>
          }

          <!-- KPI strip (spec §4.1) — only when contract kpiScope = module-overview -->
          @if (kpiScope() === 'module-overview') {
            @if (loading() && kpis().length === 0) {
              <div class="skeleton" aria-busy="true"></div>
            } @else if (kpis().length > 0) {
              <app-kpi-card-grid [cards]="kpis()" [isAr]="isAr()"></app-kpi-card-grid>
            }
          }

          <!-- Signature widget: foundation-command-center (spec §7) -->
          <section class="signature" [attr.aria-label]="i18n.translate('foundation.overview.signatureWidget')">
            <div class="signature-head">
              <h2 class="signature-title">{{ i18n.translate('foundation.overview.commandCenter') }}</h2>
              <span class="signature-meta">{{ i18n.translate('foundation.overview.dataSource') }}: {{ i18n.translate('foundation.overview.dataSourceLabel') }}</span>
            </div>

            @if (loading()) {
              <div class="quick-grid">
                <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
                <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
              </div>
            } @else if (view() === 'command-center') {
              @if (quickTiles().length === 0) {
                <div class="empty">
                  <p class="empty-title">{{ i18n.translate('foundation.overview.empty.title') }}</p>
                  <p>{{ i18n.translate('foundation.overview.empty.body') }}</p>
                </div>
              } @else {
                <div class="quick-grid">
                  @for (t of quickTiles(); track t.key) {
                    <a class="quick-tile" [routerLink]="t.route" [attr.aria-label]="i18n.translate(t.labelKey)">
                      <span class="quick-label">{{ i18n.translate(t.labelKey) }}</span>
                      <span class="quick-value">{{ t.value }}</span>
                    </a>
                  }
                </div>
              }
            } @else {
              @if (recentAudit().length === 0) {
                <div class="empty">{{ i18n.translate('foundation.overview.empty.recent') }}</div>
              } @else {
                @for (entry of recentAudit(); track $index) {
                  <div class="rail-row">
                    <span>{{ entry['action'] || entry['event'] || i18n.translate('foundation.overview.activity') }} — {{ entry['entity_type'] || '' }}</span>
                    <span class="signature-meta">{{ entry['created_at'] | date:'short' }}</span>
                  </div>
                }
              }
            }
          </section>
        </div>

        <!-- right rail: contextRailKeys -->
        <aside class="ovw-rail" [attr.aria-label]="i18n.translate('foundation.overview.contextRail')">
          <!-- Agent side panel trigger (spec §20.3 mode=side-panel) -->
          @if (agentEnabled() && primaryAgent()) {
            <div class="panel">
              <h3 class="panel-title">{{ i18n.translate('foundation.overview.agent.title') }}</h3>
              <p class="signature-meta" style="margin: 0 0 var(--cds-spacing-04, 12px);">{{ primaryAgent() }}</p>
              <button class="agent-btn" type="button" (click)="toggleAgent()" [attr.aria-pressed]="agentOpen()" [attr.aria-expanded]="agentOpen()">
                <i class="pi pi-bolt"></i> {{ i18n.translate(agentOpen() ? 'foundation.overview.agent.close' : 'foundation.overview.agent.open') }}
              </button>
              @if (agentOpen() && agentActions().length > 0) {
                <div style="margin-top: var(--cds-spacing-04, 12px);">
                  @for (a of agentActions(); track a.action_id) {
                    <div class="rail-row">
                      <span>{{ i18n.translate(a.label_key) }}</span>
                      <span class="signature-meta">{{ a.level }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Context rails -->
          @for (rail of contextRails(); track rail.id) {
            <div class="panel">
              <h3 class="panel-title">{{ i18n.translate(rail.titleKey) }}</h3>
              <a class="rail-row" [routerLink]="rail.route">
                <span>{{ i18n.translate('foundation.overview.openCount') }}</span>
                <span class="rail-count">{{ rail.count }}</span>
              </a>
            </div>
          }

          <!-- NBA -->
          @if (nbaEnabled()) {
            <div class="panel">
              <h3 class="panel-title">{{ i18n.translate('foundation.overview.nba.title') }}</h3>
              @if (nbaItems().length === 0) {
                <p class="signature-meta">{{ i18n.translate('foundation.overview.nba.empty') }}</p>
              } @else {
                @for (n of nbaItems(); track n.id) {
                  <a class="nba-row" [attr.data-priority]="n.priority" [routerLink]="n.route">
                    <span><span class="nba-dot"></span>{{ i18n.translate(n.titleKey) }}</span>
                    <span class="signature-meta">{{ i18n.translate('foundation.priority.' + n.priority) }}</span>
                  </a>
                }
              }
            </div>
          }
        </aside>
      </div>
    }
  `,
})
export class FoundationOverviewComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  private http = inject(HttpClient);
  private exp: any = null;
  private agentResolver: DynamicAgentExperienceResolver = inject(DynamicAgentExperienceResolver);
  private dynUi: DynamicUiBootstrapService = inject(DynamicUiBootstrapService);
  private user: UserContextResolver = inject(UserContextResolver);
  private platformId = inject(PLATFORM_ID);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  private readonly CONTRACT_ROUTE = '/foundation';

  loading = signal(true);
  error = signal<string | null>(null);
  loadWarnings = signal<string[]>([]);
  recentAudit = signal<Record<string, unknown>[]>([]);
  kpis = signal<KpiCardVM[]>([]);
  quickTiles = signal<{ key: string; labelKey: string; value: number; route: string }[]>([]);
  view = signal<'command-center' | 'recent'>('command-center');
  agentOpen = signal(false);
  whyOpen = signal(false);
  liveOverview = signal<Record<string, unknown> | null>(null);
  rawData = signal<FoundationOverviewData | null>(null);

  private sse?: EventSource;

  // ── Page Experience contract (spec §3.3) ─────────────────────────────
  experience = computed(() => this.exp.forRoute(this.CONTRACT_ROUTE));
  visibleForUser = computed(() => this.experience()?.visibleForCurrentUser ?? true);
  pageType = computed(() => this.experience()?.pageType ?? 'overview');
  layout = computed(() => this.experience()?.layout ?? 'dashboard');
  kpiScope = computed(() => this.experience()?.kpiScope ?? 'module-overview');
  userIntent = computed(() => this.experience()?.userIntent ?? 'monitor');
  signatureWidget = computed(() => this.experience()?.signatureWidget ?? 'foundation-command-center');
  // Capability gates — fail-closed during Foundation-only bring-up.
  aiEnabled = computed(() => isCapabilityActive('aiOs'));
  workflowEnabled = computed(() => isCapabilityActive('workflow'));
  agentEnabled = computed(() => isCapabilityActive('agent') && isCapabilityActive('aiOs'));
  realtimeEnabled = computed(() => {
    if (!isCapabilityActive('realtime')) return false;
    const e = this.experience();
    if (!e) return false;
    return (e.realtimeChannels?.length ?? 0) > 0;
  });
  nbaEnabled = computed(() => {
    if (!isCapabilityActive('nba')) return false;
    const route = this.dynUi.visibleRoutes().find((r: any) => r.path_pattern === this.CONTRACT_ROUTE) as any;
    const fromContract = route?.nba_enabled;
    return typeof fromContract === 'boolean' ? fromContract : false;
  });

  /**
   * Translate raw entity keys returned by `loadErrors` into i18n labels.
   * Keys without a known translation are dropped — never leak raw English.
   */
  translatedWarnings = computed<string[]>(() => {
    const map: Record<string, string> = {
      users:         'foundation.kpi.users.total',
      departments:   'foundation.nav.departments',
      locations:     'foundation.nav.locations',
      organizations: 'foundation.nav.organization',
      businessUnits: 'foundation.nav.businessUnits',
      roles:         'foundation.nav.roles',
      audit:         'foundation.nav.audit',
      invitations:   'foundation.warn.invitations',
      teams:         'foundation.kpi.teams.total',
      positions:     'foundation.nav.positions',
      committees:    'foundation.nav.committees',
      delegations:   'foundation.nav.delegations',
      policies:      'foundation.nav.policies',
    };
    return this.loadWarnings()
      .map((k) => (map[k] ? this.i18n.translate(map[k]) : null))
      .filter((v): v is string => !!v && !v.startsWith('foundation.'));
  });
  dataResourceKey = computed(() => 'foundation.overview');
  dataResourceUrl = computed(() => '/api/tenants/home/overview');

  profileType = computed(() => this.user.context()?.profileType ?? null);
  dataScopeLabel = computed(() => {
    const mode = this.experience()?.dataScopeMode ?? 'tenant';
    const translated = this.i18n.translate(`foundation.overview.dataScope.${mode}`);
    return translated.startsWith('foundation.overview.dataScope.') ? mode : translated;
  });
  helpKey = computed(() => this.experience()?.helpKey ?? null);

  breadcrumbs = computed<CrumbItem[]>(() => [
    { labelKey: 'foundation.nav.overview', route: '/workspace-home' },
    { labelKey: 'foundation.module.title', route: '/foundation/overview' },
    { labelKey: 'foundation.overview.title' },
  ]);

  // ── Agent experience (spec §3.2 primaryAgentId) ──────────────────────
  primaryAgent = computed(() => this.agentResolver.forRoute(this.CONTRACT_ROUTE)?.primaryAgent ?? 'foundation-org-agent');
  agentActions = computed(() => this.agentResolver.forRoute(this.CONTRACT_ROUTE)?.actions ?? []);

  // ── Context rail keys (contract: work-queue, approvals, ai-pulse) ────
  contextRails = computed<RailItem[]>(() => {
    const d = this.rawData();
    const arr = (v: { [k: string]: unknown } | undefined, ...keys: string[]): unknown[] => {
      if (!v) return [];
      for (const k of keys) { if (Array.isArray(v[k])) return v[k] as unknown[]; }
      return [];
    };
    const invitations = arr(d?.invitations, 'invitations').length;
    const delegations = arr(d?.delegations, 'delegations').length;
    const auditCount = arr(d?.audit, 'entries', 'rows').length;
    const rails: RailItem[] = [];
    if (this.workflowEnabled()) {
      rails.push({ id: 'work-queue', titleKey: 'foundation.rail.workQueue', count: invitations, route: '/inbox' });
      rails.push({ id: 'approvals',  titleKey: 'foundation.rail.approvals', count: delegations, route: '/foundation/delegations' });
    }
    if (this.aiEnabled()) {
      rails.push({ id: 'ai-pulse', titleKey: 'foundation.rail.aiPulse', count: auditCount, route: '/foundation/audit' });
    }
    // Always-on Foundation-only rail: recent audit count surfaced as "activity"
    if (rails.length === 0) {
      rails.push({ id: 'recent-activity', titleKey: 'foundation.rail.recentActivity', count: auditCount, route: '/foundation/audit' });
    }
    return rails;
  });

  nbaItems = computed<NbaItem[]>(() => {
    const items: NbaItem[] = [];
    const d = this.rawData();
    const live = this.liveOverview();
    const arr = (v: { [k: string]: unknown } | undefined, ...keys: string[]): unknown[] => {
      if (!v) return [];
      for (const k of keys) { if (Array.isArray(v[k])) return v[k] as unknown[]; }
      return [];
    };
    const usersCount = arr(d?.users, 'users').length;
    const orgsCount = arr(d?.organizations, 'organizations').length;
    const deptCount = arr(d?.departments, 'departments').length;
    const ownershipGaps = Number((live?.['ownership'] as Record<string, unknown> | undefined)?.['gaps'] ?? 0);

    if (orgsCount === 0) {
      items.push({ id: 'create-org', titleKey: 'foundation.overview.nba.createOrg', route: '/foundation/organization', priority: 'critical' });
    }
    if (deptCount === 0) {
      items.push({ id: 'create-dept', titleKey: 'foundation.overview.nba.createDept', route: '/foundation/departments', priority: 'attention' });
    }
    if (usersCount === 0) {
      items.push({ id: 'invite-users', titleKey: 'foundation.overview.nba.inviteUsers', route: '/foundation/users', priority: 'attention' });
    }
    if (ownershipGaps > 0) {
      items.push({ id: 'fix-ownership', titleKey: 'foundation.overview.nba.fixOwnership', route: '/foundation/ownership-mapping', priority: 'recommended' });
    }
    return items;
  });

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  ngOnInit(): void {
    // Restore last view preset — namespaced by tenant + user so localStorage
    // (which may be shared across browser profiles) cannot bleed presets
    // between tenants. Falls back to legacy global key for one read so users
    // upgrading from the previous build keep their preference.
    if (isPlatformBrowser(this.platformId)) {
      try {
        const key = this.viewPresetKey();
        const saved = localStorage.getItem(key) ?? localStorage.getItem('foundation.overview.view');
        if (saved === 'recent' || saved === 'command-center') this.view.set(saved);
      } catch { /* SSR safe */ }
    }

    // Apply theme tokens (spec §5 / §577)
    this.applyThemeTokens();

    this.loadOverview();
    this.loadAggregator();
    this.connectRealtime();
  }

  ngOnDestroy(): void {
    try { this.sse?.close(); } catch { /* noop */ }
    if (isPlatformBrowser(this.platformId)) {
      try {
        delete (document.body.dataset as DOMStringMap)['module'];
        delete (document.body.dataset as DOMStringMap)['pageType'];
        delete (document.body.dataset as DOMStringMap)['layout'];
      } catch { /* noop */ }
    }
  }

  setView(v: 'command-center' | 'recent'): void {
    this.view.set(v);
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(this.viewPresetKey(), v); } catch { /* noop */ }
    }
  }

  /** Tenant + user scoped key for the foundation overview view preset (no cross-tenant bleed). */
  private viewPresetKey(): string {
    const ctx = this.user.context();
    const tenant = ctx?.tenantId ?? 'anon-tenant';
    const userId = ctx?.userId ?? 'anon-user';
    return `foundation.overview.view::${tenant}::${userId}`;
  }

  toggleAgent(): void { this.agentOpen.update(o => !o); }
  toggleWhy(): void { this.whyOpen.update(o => !o); }

  // Spec §5 / §577 — apply contract theme tokens to body/document.documentElement
  private applyThemeTokens(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const root = document.documentElement;
      root.style.setProperty('--module-accent', '#1f6feb');
      document.body.dataset['module'] = 'foundation';
      document.body.dataset['pageType'] = this.pageType();
      document.body.dataset['layout'] = this.layout();
    } catch { /* noop */ }
  }

  // Spec §2.2 dataResources.foundation.overview → /api/tenants/home/overview
  private loadOverview(): void {
    this.http.get<Record<string, unknown>>(this.dataResourceUrl())
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res) {
          this.liveOverview.set(res);
          this.refreshKpiStrip();
        }
      });
  }

  private loadAggregator(): void {
    this.api.getOverviewData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rawData.set(data);
          this.applyData(data);
          if (data.loadErrors) this.loadWarnings.set(Object.keys(data.loadErrors));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(FoundationApiService.formatLoadError(err));
          this.loading.set(false);
        },
      });
  }

  private connectRealtime(): void {
    if (!isPlatformBrowser(this.platformId) || typeof EventSource === 'undefined') return;
    if (!this.realtimeEnabled()) return;
    try {
      const reload = (): void => {
        this.loadAggregator();
        this.loadOverview();
      };
      const reloadListener: EventListener = () => reload();
      // Build SSE URL from env API base so non-root deployments (gateway prefix,
      // baseHref) don't 404 on a hardcoded path.
      const apiBase = (environment.apiUrl || '/api').replace(/\/+$/, '');
      this.sse = new EventSource(`${apiBase}/foundation/events`);
      this.sse.onmessage = reload;
      FOUNDATION_REALTIME_EVENTS.forEach((eventName) => this.sse?.addEventListener(eventName, reloadListener));
      this.sse.onerror = () => { try { this.sse?.close(); } catch { /* noop */ } };
    } catch { /* SSR/CSP safe */ }
  }

  private applyData(d: FoundationOverviewData): void {
    const arr = (v: { [k: string]: unknown } | undefined, ...keys: string[]): unknown[] => {
      if (!v) return [];
      for (const k of keys) { if (Array.isArray(v[k])) return v[k] as unknown[]; }
      return [];
    };

    const tiles = [
      { key: 'users',         labelKey: 'foundation.kpi.users.total',          value: arr(d.users, 'users').length,                          route: '/foundation/users' },
      { key: 'departments',   labelKey: 'foundation.kpi.departments.total',    value: arr(d.departments, 'departments').length,              route: '/foundation/departments' },
      { key: 'businessUnits', labelKey: 'foundation.nav.businessUnits',        value: arr(d.businessUnits, 'businessUnits').length,          route: '/foundation/business-units' },
      { key: 'teams',         labelKey: 'foundation.kpi.teams.total',          value: arr(d.teams, 'teams').length,                          route: '/foundation/teams' },
      { key: 'roles',         labelKey: 'foundation.nav.roles',                value: arr(d.roles, 'profiles', 'roles').length,              route: '/foundation/roles' },
      { key: 'positions',     labelKey: 'foundation.nav.positions',            value: arr(d.positions, 'positions').length,                  route: '/foundation/positions' },
      { key: 'locations',     labelKey: 'foundation.nav.locations',            value: arr(d.locations, 'locations', 'rows').length,          route: '/foundation/locations' },
      { key: 'committees',    labelKey: 'foundation.nav.committees',           value: arr(d.committees, 'committees').length,                route: '/foundation/committees' },
      { key: 'organizations', labelKey: 'foundation.nav.organization',         value: arr(d.organizations, 'organizations').length,          route: '/foundation/organization' },
    ];
    if (this.workflowEnabled()) {
      tiles.push(
        { key: 'delegations', labelKey: 'foundation.nav.delegations', value: arr(d.delegations, 'delegations').length, route: '/foundation/delegations' },
        { key: 'policies', labelKey: 'foundation.nav.policies', value: arr(d.policies, 'policies').length, route: '/foundation/policies' },
      );
    }
    this.quickTiles.set(tiles);

    const auditEntries = (d.audit?.entries ?? d.audit?.rows ?? []) as Record<string, unknown>[];
    this.recentAudit.set(auditEntries.slice(0, 10));

    this.refreshKpiStrip();
  }

  // Spec contract §kpis: users.total, departments.total, teams.total, vacancies, complianceRate, ownership.gaps
  private refreshKpiStrip(): void {
    const tiles = this.quickTiles();
    const live = this.liveOverview() ?? {};
    const policyRoute = this.workflowEnabled() ? '/foundation/policies' : '/foundation/overview';
    const get = (k: string): number => {
      const v = (live as Record<string, unknown>)[k];
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object') {
        const total = (v as Record<string, unknown>)['total'] ?? (v as Record<string, unknown>)['gaps'];
        if (typeof total === 'number') return total;
      }
      return 0;
    };
    const tileVal = (key: string): number => Number(tiles.find(t => t.key === key)?.value ?? 0);
    const cards: KpiCardVM[] = [
      { id: 'users',          labelEn: this.i18n.translate('foundation.kpi.users.total'),       labelAr: this.i18n.translate('foundation.kpi.users.total'),       value: tileVal('users'),       icon: 'pi pi-users',         color: 'var(--module-accent)', bg: 'var(--shell-card-bg)', route: '/foundation/users',       severity: 'default' },
      { id: 'departments',    labelEn: this.i18n.translate('foundation.kpi.departments.total'), labelAr: this.i18n.translate('foundation.kpi.departments.total'), value: tileVal('departments'), icon: 'pi pi-sitemap',       color: 'var(--module-accent)', bg: 'var(--shell-card-bg)', route: '/foundation/departments', severity: 'default' },
      { id: 'teams',          labelEn: this.i18n.translate('foundation.kpi.teams.total'),       labelAr: this.i18n.translate('foundation.kpi.teams.total'),       value: tileVal('teams'),       icon: 'pi pi-users',         color: 'var(--module-accent)', bg: 'var(--shell-card-bg)', route: '/foundation/teams',       severity: 'default' },
      { id: 'vacancies',      labelEn: this.i18n.translate('foundation.kpi.vacancies'),         labelAr: this.i18n.translate('foundation.kpi.vacancies'),         value: get('vacancies'),       icon: 'pi pi-id-card',       color: 'var(--cds-support-warning)', bg: 'var(--shell-card-bg)', route: '/foundation/positions', severity: 'warning' },
      { id: 'complianceRate', labelEn: this.i18n.translate('foundation.kpi.complianceRate'),    labelAr: this.i18n.translate('foundation.kpi.complianceRate'),    value: get('complianceRate'),  icon: 'pi pi-check-circle',  color: 'var(--cds-support-success)', bg: 'var(--shell-card-bg)', route: policyRoute, severity: 'success', unit: '%' },
      { id: 'ownership.gaps', labelEn: this.i18n.translate('foundation.kpi.ownership.gaps'),    labelAr: this.i18n.translate('foundation.kpi.ownership.gaps'),    value: get('ownership'),       icon: 'pi pi-exclamation-triangle', color: 'var(--cds-support-error)', bg: 'var(--shell-card-bg)', route: '/foundation/ownership-mapping', severity: 'danger' },
    ];
    this.kpis.set(cards);
  }
}
