import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, DestroyRef, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import {
  BreadcrumbModule,
  ButtonModule,
  GridModule,
  LoadingModule,
  NotificationModule,
  StructuredListModule,
  TabsModule,
  TagModule,
  TilesModule,
  UIShellModule,
} from 'carbon-components-angular';
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
  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbModule,
    ButtonModule,
    GridModule,
    LoadingModule,
    NotificationModule,
    StructuredListModule,
    TabsModule,
    TagModule,
    TilesModule,
    UIShellModule,
    FoundationKpiGridComponent,
  ],
  styles: [`
    :host { display: block; }
    /* Structural-only layout — colors, type, spacing all sourced from
       --cds-* tokens. No raw hex, no rgba, no PrimeIcons, no PrimeNG. */
    .fo-page { padding: var(--cds-spacing-06) var(--cds-spacing-07); }
    .fo-stack { display: flex; flex-direction: column; gap: var(--cds-spacing-06); }
    .fo-rail-stack { display: flex; flex-direction: column; gap: var(--cds-spacing-05); }
    .fo-section-title {
      font: 600 var(--cds-heading-03-font-size, 1.25rem)/1.4 var(--cds-font-family-sans);
      color: var(--cds-text-primary);
      margin: 0 0 var(--cds-spacing-04);
    }
    .fo-rail-title {
      font: 600 var(--cds-heading-02-font-size, 1rem)/1.4 var(--cds-font-family-sans);
      color: var(--cds-text-primary);
      margin: 0 0 var(--cds-spacing-04);
    }
    .fo-quick-tile-label {
      display: block;
      font: 400 var(--cds-body-compact-01-font-size, 0.875rem)/1.3 var(--cds-font-family-sans);
      color: var(--cds-text-secondary);
      margin-bottom: var(--cds-spacing-02);
    }
    .fo-quick-tile-value {
      display: block;
      font: 700 var(--cds-heading-03-font-size, 1.25rem)/1.2 var(--cds-font-family-sans);
      color: var(--cds-text-primary);
    }
    .fo-meta {
      font: 400 var(--cds-body-compact-01-font-size, 0.875rem)/1.4 var(--cds-font-family-sans);
      color: var(--cds-text-secondary);
    }
    .fo-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--cds-spacing-03);
      padding: var(--cds-spacing-03) 0;
      border-bottom: 1px solid var(--cds-border-subtle-01);
      text-decoration: none; color: inherit;
    }
    .fo-row:last-child { border-bottom: 0; }
    .fo-row-strong { font-weight: 600; color: var(--cds-text-primary); }
    .fo-empty { padding: var(--cds-spacing-07); text-align: center; color: var(--cds-text-secondary); }
    .fo-skeleton-grid {
      display: grid; gap: var(--cds-spacing-04);
      grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr));
    }
    .fo-access-denied {
      padding: var(--cds-spacing-07);
      text-align: center;
      color: var(--cds-text-secondary);
    }
    .fo-why { margin-top: var(--cds-spacing-04); }
    .fo-why dt {
      font-weight: 600; color: var(--cds-text-primary);
      margin-top: var(--cds-spacing-02);
    }
    .fo-why dd { margin: 0 0 var(--cds-spacing-02); color: var(--cds-text-secondary); }
    .fo-actions-row { display: flex; flex-wrap: wrap; gap: var(--cds-spacing-03); align-items: center; }
    .fo-tabs-region { margin-top: var(--cds-spacing-05); }
    [hidden] { display: none !important; }
  `],
  template: `
    @if (!visibleForUser()) {
      <div class="fo-access-denied" role="alert">
        <h2 class="fo-section-title">{{ i18n.translate('foundation.overview.accessDeniedTitle') }}</h2>
        <p class="fo-meta">{{ i18n.translate('foundation.overview.accessDeniedBody') }}</p>
      </div>
    } @else {
      <div cdsGrid class="fo-page" [dir]="i18n.direction()"
           [attr.data-layout]="layout()" [attr.data-page-type]="pageType()" [attr.data-module]="'foundation'">
        <div cdsRow>
          <!-- ────────── Main column ────────── -->
          <div cdsCol [columnNumbers]="{ lg: 12, md: 8, sm: 4 }">
            <div class="fo-stack">

              <!-- Masthead: Carbon breadcrumb + title + status tag + actions -->
              <cds-tile>
                <cds-breadcrumb [ariaLabel]="i18n.translate('foundation.overview.contextRail')">
                  @for (c of breadcrumbs(); track c.labelKey; let last = $last) {
                    <cds-breadcrumb-item [href]="c.route || null" [current]="last">
                      {{ i18n.translate(c.labelKey) }}
                    </cds-breadcrumb-item>
                  }
                </cds-breadcrumb>

                <h1 class="fo-section-title" style="margin-top: var(--cds-spacing-04);">
                  {{ i18n.translate('foundation.overview.title') }}
                </h1>
                <p class="fo-meta">{{ i18n.translate('foundation.overview.subtitle') }}</p>

                <div class="fo-actions-row" style="margin-top: var(--cds-spacing-04);">
                  @if (realtimeEnabled()) {
                    <cds-tag type="green">{{ i18n.translate('foundation.overview.live') }}</cds-tag>
                  }
                  <button cdsButton="ghost" size="sm" type="button"
                          (click)="toggleWhy()"
                          [attr.aria-pressed]="whyOpen()"
                          [attr.aria-expanded]="whyOpen()">
                    {{ i18n.translate('foundation.overview.whyAmISeeing') }}
                  </button>
                </div>

                @if (whyOpen()) {
                  <dl class="fo-why" role="region"
                      [attr.aria-label]="i18n.translate('foundation.overview.whyAmISeeing')">
                    <dt>{{ i18n.translate('foundation.overview.whyProfile') }}</dt>
                    <dd>{{ profileType() || i18n.translate('foundation.overview.whyProfileUnknown') }}</dd>
                    <dt>{{ i18n.translate('foundation.overview.whyDataScope') }}</dt>
                    <dd>{{ dataScopeLabel() }}</dd>
                    <dt>{{ i18n.translate('foundation.overview.whyContract') }}</dt>
                    <dd>{{ i18n.translate('foundation.overview.whyContractValue') }}</dd>
                  </dl>
                }
              </cds-tile>

              <!-- Status notifications: Carbon inline notifications -->
              @if (error()) {
                <cds-notification
                  [notificationObj]="{ type: 'error', title: i18n.translate('foundation.overview.errorTitle'), message: error() || '', lowContrast: true }">
                </cds-notification>
              }
              @if (loadWarnings().length) {
                <cds-notification
                  [notificationObj]="{ type: 'warning', title: i18n.translate('foundation.overview.partial.summary'), message: translatedWarnings().join(', '), lowContrast: true }">
                </cds-notification>
              }

              <!-- KPI strip — only when contract kpiScope = module-overview -->
              @if (kpiScope() === 'module-overview') {
                @if (loading() && kpis().length === 0) {
                  <cds-loading [isActive]="true" size="sm"></cds-loading>
                } @else if (kpis().length > 0) {
                  <foundation-kpi-grid [cards]="kpis()" [dir]="isAr() ? 'rtl' : 'ltr'"></foundation-kpi-grid>
                }
              }

              <!-- Signature widget: command center via Carbon tabs + tiles -->
              <cds-tile [attr.aria-label]="i18n.translate('foundation.overview.signatureWidget')">
                <h2 class="fo-section-title">{{ i18n.translate('foundation.overview.commandCenter') }}</h2>
                <p class="fo-meta">
                  {{ i18n.translate('foundation.overview.dataSource') }}:
                  {{ i18n.translate('foundation.overview.dataSourceLabel') }}
                </p>

                <div class="fo-tabs-region">
                  <cds-tabs>
                    <cds-tab [heading]="i18n.translate('foundation.overview.view.commandCenter')"
                             [active]="view() === 'command-center'"
                             (selected)="setView('command-center')">
                      @if (loading()) {
                        <div class="fo-skeleton-grid">
                          <cds-loading [isActive]="true" size="sm"></cds-loading>
                          <cds-loading [isActive]="true" size="sm"></cds-loading>
                          <cds-loading [isActive]="true" size="sm"></cds-loading>
                        </div>
                      } @else if (quickTiles().length === 0) {
                        <div class="fo-empty">
                          <p class="fo-row-strong">{{ i18n.translate('foundation.overview.empty.title') }}</p>
                          <p class="fo-meta">{{ i18n.translate('foundation.overview.empty.body') }}</p>
                        </div>
                      } @else {
                        <cds-structured-list>
                          @for (t of quickTiles(); track t.key) {
                            <cds-list-row>
                              <cds-list-column>
                                <a [routerLink]="t.route" [attr.aria-label]="i18n.translate(t.labelKey)"
                                   style="text-decoration:none;color:inherit;display:block;">
                                  <span class="fo-quick-tile-label">{{ i18n.translate(t.labelKey) }}</span>
                                  <span class="fo-quick-tile-value">{{ t.value }}</span>
                                </a>
                              </cds-list-column>
                            </cds-list-row>
                          }
                        </cds-structured-list>
                      }
                    </cds-tab>

                    <cds-tab [heading]="i18n.translate('foundation.overview.view.recent')"
                             [active]="view() === 'recent'"
                             (selected)="setView('recent')">
                      @if (recentAudit().length === 0) {
                        <div class="fo-empty">{{ i18n.translate('foundation.overview.empty.recent') }}</div>
                      } @else {
                        <cds-structured-list>
                          @for (entry of recentAudit(); track $index) {
                            <cds-list-row>
                              <cds-list-column>
                                {{ entry['action'] || entry['event'] || i18n.translate('foundation.overview.activity') }}
                                — {{ entry['entity_type'] || '' }}
                              </cds-list-column>
                              <cds-list-column class="fo-meta">
                                {{ entry['created_at'] | date:'short' }}
                              </cds-list-column>
                            </cds-list-row>
                          }
                        </cds-structured-list>
                      }
                    </cds-tab>
                  </cds-tabs>
                </div>
              </cds-tile>
            </div>
          </div>

          <!-- ────────── Context rail (right) ────────── -->
          <div cdsCol [columnNumbers]="{ lg: 4, md: 8, sm: 4 }">
            <aside class="fo-rail-stack" [attr.aria-label]="i18n.translate('foundation.overview.contextRail')">

              <!-- Agent panel -->
              @if (agentEnabled() && primaryAgent()) {
                <cds-tile>
                  <h3 class="fo-rail-title">{{ i18n.translate('foundation.overview.agent.title') }}</h3>
                  <p class="fo-meta">{{ primaryAgent() }}</p>
                  <div class="fo-actions-row" style="margin-top: var(--cds-spacing-04);">
                    <button cdsButton="primary" size="sm" type="button"
                            (click)="toggleAgent()"
                            [attr.aria-pressed]="agentOpen()"
                            [attr.aria-expanded]="agentOpen()">
                      {{ i18n.translate(agentOpen() ? 'foundation.overview.agent.close' : 'foundation.overview.agent.open') }}
                    </button>
                  </div>
                  @if (agentOpen() && agentActions().length > 0) {
                    <cds-structured-list>
                      @for (a of agentActions(); track a.action_id) {
                        <cds-list-row>
                          <cds-list-column>{{ i18n.translate(a.label_key) }}</cds-list-column>
                          <cds-list-column>
                            <cds-tag type="cool-gray">{{ a.level }}</cds-tag>
                          </cds-list-column>
                        </cds-list-row>
                      }
                    </cds-structured-list>
                  }
                </cds-tile>
              }

              <!-- Context rails -->
              @for (rail of contextRails(); track rail.id) {
                <cds-clickable-tile [route]="[rail.route]">
                  <h3 class="fo-rail-title">{{ i18n.translate(rail.titleKey) }}</h3>
                  <div class="fo-row">
                    <span class="fo-meta">{{ i18n.translate('foundation.overview.openCount') }}</span>
                    <span class="fo-row-strong">{{ rail.count }}</span>
                  </div>
                </cds-clickable-tile>
              }

              <!-- NBA -->
              @if (nbaEnabled()) {
                <cds-tile>
                  <h3 class="fo-rail-title">{{ i18n.translate('foundation.overview.nba.title') }}</h3>
                  @if (nbaItems().length === 0) {
                    <p class="fo-meta">{{ i18n.translate('foundation.overview.nba.empty') }}</p>
                  } @else {
                    <cds-structured-list>
                      @for (n of nbaItems(); track n.id) {
                        <cds-list-row>
                          <cds-list-column>
                            <a [routerLink]="n.route" style="text-decoration:none;color:inherit;">
                              {{ i18n.translate(n.titleKey) }}
                            </a>
                          </cds-list-column>
                          <cds-list-column>
                            <cds-tag [type]="nbaTagType(n.priority)">
                              {{ i18n.translate('foundation.priority.' + n.priority) }}
                            </cds-tag>
                          </cds-list-column>
                        </cds-list-row>
                      }
                    </cds-structured-list>
                  }
                </cds-tile>
              }
            </aside>
          </div>
        </div>
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
    // View preset: in-memory only. Persisted localStorage write was removed
    // per platform directive — Carbon-only Foundation Overview must not
    // write tenant-scoped UI state without an explicit approved spec.

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
    // In-memory only — no localStorage persistence (Carbon-only directive).
    this.view.set(v);
  }

  toggleAgent(): void { this.agentOpen.update(o => !o); }
  toggleWhy(): void { this.whyOpen.update(o => !o); }

  // Spec §5 / §577 — apply only data-attributes for layout selectors. All
  // visual tokens (color, accent) flow through Carbon --cds-* and the DOS
  // carbon-overrides layer. No raw hex, no module-accent variable.
  private applyThemeTokens(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      document.body.dataset['module'] = 'foundation';
      document.body.dataset['pageType'] = this.pageType();
      document.body.dataset['layout'] = this.layout();
    } catch { /* noop */ }
  }

  // Map NBA priority → Carbon tag type. Pure semantic Carbon mapping —
  // colors come from --cds-tag-* via carbon-overrides.css.
  nbaTagType(priority: 'critical' | 'attention' | 'recommended'): 'red' | 'magenta' | 'blue' {
    switch (priority) {
      case 'critical':    return 'red';
      case 'attention':   return 'magenta';
      case 'recommended':
      default:            return 'blue';
    }
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
      { id: 'users',          labelEn: this.i18n.translate('foundation.kpi.users.total'),       labelAr: this.i18n.translate('foundation.kpi.users.total'),       value: tileVal('users'),       icon: '', color: 'var(--cds-text-primary)',    bg: 'var(--cds-layer-02)', route: '/foundation/users',             severity: 'default' },
      { id: 'departments',    labelEn: this.i18n.translate('foundation.kpi.departments.total'), labelAr: this.i18n.translate('foundation.kpi.departments.total'), value: tileVal('departments'), icon: '', color: 'var(--cds-text-primary)',    bg: 'var(--cds-layer-02)', route: '/foundation/departments',       severity: 'default' },
      { id: 'teams',          labelEn: this.i18n.translate('foundation.kpi.teams.total'),       labelAr: this.i18n.translate('foundation.kpi.teams.total'),       value: tileVal('teams'),       icon: '', color: 'var(--cds-text-primary)',    bg: 'var(--cds-layer-02)', route: '/foundation/teams',             severity: 'default' },
      { id: 'vacancies',      labelEn: this.i18n.translate('foundation.kpi.vacancies'),         labelAr: this.i18n.translate('foundation.kpi.vacancies'),         value: get('vacancies'),       icon: '', color: 'var(--cds-support-warning)', bg: 'var(--cds-layer-02)', route: '/foundation/positions',         severity: 'warning' },
      { id: 'complianceRate', labelEn: this.i18n.translate('foundation.kpi.complianceRate'),    labelAr: this.i18n.translate('foundation.kpi.complianceRate'),    value: get('complianceRate'),  icon: '', color: 'var(--cds-support-success)', bg: 'var(--cds-layer-02)', route: policyRoute,                     severity: 'success', unit: '%' },
      { id: 'ownership.gaps', labelEn: this.i18n.translate('foundation.kpi.ownership.gaps'),    labelAr: this.i18n.translate('foundation.kpi.ownership.gaps'),    value: get('ownership'),       icon: '', color: 'var(--cds-support-error)',   bg: 'var(--cds-layer-02)', route: '/foundation/ownership-mapping', severity: 'danger' },
    ];
    this.kpis.set(cards);
  }
}
