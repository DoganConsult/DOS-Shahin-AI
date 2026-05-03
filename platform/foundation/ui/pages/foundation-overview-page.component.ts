import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ProgressBarModule,
  StructuredListModule,
  TagModule,
} from 'carbon-components-angular';
import {
  DosAdaptiveCommandBarComponent,
  DosEmptyStateComponent,
  DosLoadingStateComponent,
  DosMetricCardComponent,
  DosPageHeaderComponent,
  DosResponsiveGridComponent,
  DosStatusBannerComponent,
} from '@dos/ui-system';
import type { ActionContract } from '@dos/ui-contracts';
import { FoundationApiService, type FoundationOverviewData } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

interface OverviewMetric {
  id: string;
  label: string;
  value: string | number;
  route?: string;
  tone?: 'green' | 'red' | 'blue' | 'cool-gray';
}

interface HealthRow {
  label: string;
  value: string;
}

interface OverviewRouteItem {
  id: string;
  label: string;
  route: string;
  description: string;
}

@Component({
  selector: 'app-foundation-overview-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    DosAdaptiveCommandBarComponent,
    DosEmptyStateComponent,
    DosLoadingStateComponent,
    DosMetricCardComponent,
    DosPageHeaderComponent,
    DosResponsiveGridComponent,
    DosStatusBannerComponent,
    TagModule,
    StructuredListModule,
    ProgressBarModule,
  ],
  template: `
    <section class="foundation-page">
      <dos-page-header
        [title]="'Foundation overview'"
        [description]="'Organization health, setup status, ownership gaps, and access-review readiness from live Foundation services.'">
        <div pageHeaderBreadcrumb class="foundation-page__eyebrow">Platform DNA / Foundation</div>
        <div pageHeaderMeta class="foundation-page__meta">
          <cds-tag [type]="healthTag()">{{ organizationHealth() }}</cds-tag>
          <span class="foundation-page__meta-copy">Live APIs: overview, access reviews, health</span>
        </div>
        <div pageHeaderActions>
          <dos-adaptive-command-bar [actions]="pageActions" (invoke)="handleAction($event)"></dos-adaptive-command-bar>
        </div>
      </dos-page-header>

      @if (error()) {
        <dos-status-banner kind="warning" title="Foundation overview is partial">
          {{ error() }}
        </dos-status-banner>
      }

      @if (loading()) {
        <dos-loading-state label="Loading Foundation overview from live platform services..."></dos-loading-state>
      } @else if (metrics().length === 0) {
        <dos-empty-state
          icon="◌"
          tone="warning"
          [showDefaultGlyph]="false"
          title="No Foundation signals yet"
          description="The product route is wired, but the overview payload does not contain usable cards yet. Open settings or records to inspect the backing data."
          primaryAction="Open settings"
          secondaryAction="Open records"
          (primary)="navigate('/foundation/settings')"
          (secondary)="navigate('/foundation/records')">
        </dos-empty-state>
      } @else {
        <dos-status-banner [kind]="summaryKind()" [title]="summaryTitle()">
          {{ notificationMessage() }}
        </dos-status-banner>

        <dos-responsive-grid [cols]="4" class="foundation-page__metrics">
          @for (metric of metrics(); track metric.id) {
            @if (metric.route) {
              <a [routerLink]="metric.route" class="foundation-page__metric-link">
                <dos-metric-card [label]="metric.label" [value]="metric.value"></dos-metric-card>
              </a>
            } @else {
              <div class="foundation-page__metric-link foundation-page__metric-link--static">
                <dos-metric-card [label]="metric.label" [value]="metric.value"></dos-metric-card>
              </div>
            }
          }
        </dos-responsive-grid>

        <dos-responsive-grid [cols]="2" class="foundation-page__panels">
          <section class="foundation-page__panel foundation-page__panel--status">
            <div class="foundation-page__status-header">
              <div>
                <h2 class="foundation-page__section-title">Setup status</h2>
                <p class="foundation-page__section-body">Live Foundation readiness signals from the platform health probe.</p>
              </div>
              <strong class="foundation-page__progress-copy">{{ setupPercent() }}%</strong>
            </div>
            <cds-progress-bar [value]="setupPercent()" [max]="100" size="sm"></cds-progress-bar>
            <section class="cds--structured-list foundation-page__structured-list">
              <div class="cds--structured-list-tbody">
                @for (row of healthRows(); track row.label) {
                  <div class="cds--structured-list-row">
                    <div class="cds--structured-list-td foundation-page__key">{{ row.label }}</div>
                    <div class="cds--structured-list-td">{{ row.value }}</div>
                  </div>
                }
              </div>
            </section>
          </section>

          <section class="foundation-page__panel foundation-page__panel--routes">
            <div class="foundation-page__status-header">
              <div>
                <h2 class="foundation-page__section-title">Production routes</h2>
                <p class="foundation-page__section-body">The first page is live on the Shahin consumer route, with the rest of the Foundation surfaces one tap away.</p>
              </div>
            </div>
            <ul class="foundation-page__route-list">
              @for (item of routeItems; track item.id) {
                <li class="foundation-page__route-item">
                  <a [routerLink]="item.route" class="foundation-page__route-link">{{ item.label }}</a>
                  <p class="foundation-page__route-copy">{{ item.description }}</p>
                </li>
              }
            </ul>
          </section>
        </dos-responsive-grid>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .foundation-page {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-06);
      padding: var(--cds-spacing-06);
      background: var(--cds-background);
      min-height: 100%;
    }
    .foundation-page__eyebrow {
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-compact-01-font-size);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .foundation-page__meta {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
      flex-wrap: wrap;
    }
    .foundation-page__meta-copy {
      font-size: var(--cds-label-01-font-size);
      color: var(--cds-text-secondary);
    }
    .foundation-page__metrics,
    .foundation-page__panels {
      width: 100%;
    }
    .foundation-page__metric-link {
      display: block;
      text-decoration: none;
      color: inherit;
    }
    .foundation-page__metric-link:hover {
      transform: translateY(-1px);
    }
    .foundation-page__metric-link--static {
      cursor: default;
    }
    .foundation-page__panel {
      padding: var(--cds-spacing-05);
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-layer-01);
      border-radius: 0;
      min-height: 100%;
    }
    .foundation-page__section-body {
      margin: var(--cds-spacing-02) 0 0;
      color: var(--cds-text-secondary);
      line-height: 1.5;
    }
    .foundation-page__status-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--cds-spacing-04);
      margin-bottom: var(--cds-spacing-05);
    }
    .foundation-page__section-title {
      margin: 0 0 var(--cds-spacing-02);
      font-size: var(--cds-heading-03-font-size);
    }
    .foundation-page__progress-copy {
      font-size: var(--cds-heading-03-font-size);
      color: var(--cds-text-primary);
    }
    .foundation-page__structured-list {
      margin-top: var(--cds-spacing-05);
    }
    .foundation-page__key {
      font-weight: 600;
      color: var(--cds-text-secondary);
      width: 18rem;
    }
    .foundation-page__route-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-05);
    }
    .foundation-page__route-item {
      padding-block-end: var(--cds-spacing-04);
      border-block-end: 1px solid var(--cds-border-subtle-01);
    }
    .foundation-page__route-item:last-child {
      padding-block-end: 0;
      border-block-end: 0;
    }
    .foundation-page__route-link {
      font-weight: 600;
      text-decoration: none;
      color: var(--cds-link-primary);
    }
    .foundation-page__route-link:hover {
      text-decoration: underline;
    }
    .foundation-page__route-copy {
      margin: var(--cds-spacing-02) 0 0;
      color: var(--cds-text-secondary);
      line-height: 1.5;
    }
  `],
})
export class FoundationOverviewPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(FoundationApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = [{ label: 'Platform DNA' }, { label: 'Foundation' }];
  readonly pageActions: ActionContract[] = [
    { id: 'records', labelKey: 'Open records', priority: 'primary', mobile: 'visible' },
    { id: 'workflows', labelKey: 'Open workflows', priority: 'secondary', mobile: 'visible' },
    { id: 'reports', labelKey: 'Open reports', priority: 'secondary', mobile: 'visible' },
    { id: 'settings', labelKey: 'Open settings', priority: 'overflow', mobile: 'overflow' },
  ];
  readonly routeItems: OverviewRouteItem[] = [
    {
      id: 'records',
      label: 'Records',
      route: '/foundation/records',
      description: 'Organizations, business units, departments, teams, users, roles, positions, locations, committees, and delegations.',
    },
    {
      id: 'workflows',
      label: 'Workflows',
      route: '/foundation/workflows',
      description: 'User onboarding, role approvals, delegation approval, access reviews, and maker-checker tasks.',
    },
    {
      id: 'reports',
      label: 'Reports',
      route: '/foundation/reports',
      description: 'Org structure, permission coverage, ownership gaps, access review reporting, and the audit export pack.',
    },
    {
      id: 'settings',
      label: 'Settings',
      route: '/foundation/settings',
      description: 'Org profile, role model, hierarchy rules, delegation rules, SoD rules, readiness, and audit settings.',
    },
  ];

  readonly i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly metrics = signal<OverviewMetric[]>([]);
  readonly healthRows = signal<HealthRow[]>([]);
  readonly healthStatus = signal<'Healthy' | 'Degraded' | 'Unknown'>('Unknown');
  readonly setupPercent = signal(0);
  readonly notificationMessage = signal('Awaiting live Foundation health data.');

  readonly organizationHealth = computed(() => this.healthStatus());
  readonly summaryKind = computed<'info' | 'success' | 'warning' | 'danger'>(() => {
    switch (this.healthStatus()) {
      case 'Healthy':
        return 'success';
      case 'Degraded':
        return 'warning';
      default:
        return 'info';
    }
  });
  readonly summaryTitle = computed(() => {
    switch (this.healthStatus()) {
      case 'Healthy':
        return 'Foundation is production-visible';
      case 'Degraded':
        return 'Foundation is visible with live gaps';
      default:
        return 'Foundation health is still resolving';
    }
  });
  readonly healthTag = computed(() => {
    switch (this.healthStatus()) {
      case 'Healthy':
        return 'green';
      case 'Degraded':
        return 'red';
      default:
        return 'cool-gray';
    }
  });

  constructor() {
    forkJoin({
      overview: this.api.getOverviewData({ includeWorkflowSlices: true }).pipe(
        catchError((err: unknown) => {
          this.error.set(FoundationApiService.formatLoadError(err));
          return of(null);
        }),
      ),
      accessReviews: this.api.getAccessReviewCampaigns().pipe(catchError(() => of({ campaigns: [] }))),
      health: this.api.getFoundationHealth().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ overview, accessReviews, health }) => {
        this.applyOverview(overview, accessReviews?.campaigns ?? [], health);
        this.loading.set(false);
      });
  }

  handleAction(action: ActionContract): void {
    const route = this.routeItems.find(item => item.id === action.id)?.route;
    if (route) {
      this.navigate(route);
    }
  }

  navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }

  private applyOverview(overview: FoundationOverviewData | null, accessReviews: unknown[], health: any): void {
    const arr = (value: Record<string, unknown> | undefined, ...keys: string[]): unknown[] => {
      if (!value) return [];
      for (const key of keys) {
        if (Array.isArray(value[key])) return value[key] as unknown[];
      }
      return [];
    };

    const signals = (health?.signals ?? {}) as Record<string, unknown>;
    const status = String(health?.status ?? '').toLowerCase();
    const missingTables = Array.isArray(signals['missing_tables']) ? signals['missing_tables'] as string[] : [];
    const roles = arr(overview?.roles as Record<string, unknown> | undefined, 'roles', 'profiles');
    const organizations = arr(overview?.organizations as Record<string, unknown> | undefined, 'organizations');
    const departments = arr(overview?.departments as Record<string, unknown> | undefined, 'departments');
    const teams = arr(overview?.teams as Record<string, unknown> | undefined, 'teams');
    const users = arr(overview?.users as Record<string, unknown> | undefined, 'users');
    const orphanedDepartments = Number(signals['orphaned_departments'] ?? 0);
    const unassignedPositions = Number(signals['unassigned_positions'] ?? 0);
    const ownershipGaps = Math.max(0, orphanedDepartments) + Math.max(0, unassignedPositions);
    const reviewCount = accessReviews.length;
    const healthyChecks = [
      signals['schema_exists'] === true,
      signals['tables_exist'] === true,
      signals['hierarchy_integrity'] === true,
      orphanedDepartments === 0,
      unassignedPositions <= 5,
    ];
    const setupPercent = Math.round((healthyChecks.filter(Boolean).length / healthyChecks.length) * 100);

    this.metrics.set([
      { id: 'org-health', label: 'Organization health', value: status === 'ok' ? 'Healthy' : status ? 'Degraded' : 'Unknown', route: '/foundation/settings' },
      { id: 'users', label: 'Users count', value: users.length, route: '/foundation/records' },
      { id: 'roles', label: 'Roles count', value: roles.length, route: '/foundation/records' },
      { id: 'departments', label: 'Departments', value: departments.length, route: '/foundation/records' },
      { id: 'teams', label: 'Teams', value: teams.length, route: '/foundation/records' },
      { id: 'ownership-gaps', label: 'Ownership gaps', value: ownershipGaps, route: '/foundation/reports' },
      { id: 'access-reviews', label: 'Pending access reviews', value: reviewCount, route: '/foundation/workflows' },
      { id: 'setup', label: 'Setup status', value: `${setupPercent}%`, route: '/foundation/settings' },
    ]);

    this.healthRows.set([
      { label: 'Organizations', value: String(organizations.length) },
      { label: 'Missing tables', value: missingTables.length ? missingTables.join(', ') : 'None' },
      { label: 'Hierarchy integrity', value: signals['hierarchy_integrity'] === true ? 'OK' : 'Attention required' },
      { label: 'Orphaned departments', value: String(orphanedDepartments) },
      { label: 'Unassigned positions', value: String(unassignedPositions) },
      { label: 'Pending access reviews', value: String(reviewCount) },
    ]);

    this.setupPercent.set(setupPercent);
    this.healthStatus.set(status === 'ok' ? 'Healthy' : status ? 'Degraded' : 'Unknown');
    this.notificationMessage.set(
      status === 'ok'
        ? 'Foundation health probes are passing and the setup contract is mostly complete.'
        : 'Foundation has live gaps. Review missing tables, hierarchy integrity, or ownership coverage before widening rollout.',
    );
  }
}