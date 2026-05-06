/**
 * Foundation Module — Page 1: Home (Module Landing)
 *
 * Phase-1 enrollment. Read-only. All Carbon primitives from DB registry.
 * Layout: Breadcrumb → KPI Tiles (4) → Quick Links (ClickableTile 2×3) →
 *         Activity Feed (StructuredList) → Footer (InlineNotification).
 * Permission gate: foundation.read via AccessStore.
 */
import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  BreadcrumbModule, TilesModule, TagModule, GridModule,
  StructuredListModule, NotificationModule, SkeletonModule,
  IconModule, ButtonModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

interface KpiCard { id: string; label: string; value: string | number; icon: string; delta?: string; }
interface ActivityRow { id: string; time: string; actor: string; action: string; entity: string; }

@Component({
  selector: 'app-foundation-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink,
    BreadcrumbModule, TilesModule, TagModule, GridModule,
    StructuredListModule, NotificationModule, SkeletonModule,
    IconModule, ButtonModule,
  ],
  template: `
    <!-- Breadcrumb + Status Tag -->
    <cds-breadcrumb>
      <cds-breadcrumb-item [href]="workspaceHref()">{{ i18n.tr('breadcrumb.workspace', 'Workspace') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item>{{ i18n.tr('foundation.name', 'Foundation') }}</cds-breadcrumb-item>
    </cds-breadcrumb>
    <cds-tag type="green" size="sm" class="fh-status-tag">{{ i18n.tr('foundation.status.active', 'Active') }}</cds-tag>

    @if (loading()) {
      <div class="fh-skeleton">
        <cds-skeleton-text [lines]="3"></cds-skeleton-text>
        <cds-skeleton-text [lines]="2"></cds-skeleton-text>
      </div>
    } @else {

      <!-- KPI Tiles (4) -->
      <div cdsGrid class="fh-kpi-strip">
        @for (kpi of kpis(); track kpi.id) {
          <div cdsCol [columnNumbers]="{lg: 4, md: 4, sm: 4}">
            <cds-tile class="fh-kpi-tile">
              <svg [attr.cdsIcon]="kpi.icon" size="20" class="fh-kpi-icon"></svg>
              <div class="fh-kpi-body">
                <span class="fh-kpi-value">{{ kpi.value }}</span>
                <span class="fh-kpi-label">{{ kpi.label }}</span>
              </div>
              @if (kpi.delta) {
                <cds-tag type="blue" size="sm">{{ kpi.delta }}</cds-tag>
              }
            </cds-tile>
          </div>
        }
      </div>

      <!-- Quick Links (ClickableTile 2×3 grid) -->
      <div cdsGrid class="fh-links">
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-clickable-tile [routerLink]="['/foundation/overview']">
            <svg cdsIcon="dashboard" size="20"></svg>
            <span>{{ i18n.tr('foundation.nav.overview', 'Overview') }}</span>
          </cds-clickable-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-clickable-tile [routerLink]="['/foundation/users']">
            <svg cdsIcon="group" size="20"></svg>
            <span>{{ i18n.tr('foundation.nav.users', 'Users & Roles') }}</span>
          </cds-clickable-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-clickable-tile [routerLink]="['/foundation/organization']">
            <svg cdsIcon="enterprise" size="20"></svg>
            <span>{{ i18n.tr('foundation.nav.organization', 'Organization') }}</span>
          </cds-clickable-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-clickable-tile [routerLink]="['/foundation/roles']">
            <svg cdsIcon="security" size="20"></svg>
            <span>{{ i18n.tr('foundation.nav.roles', 'Roles') }}</span>
          </cds-clickable-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-clickable-tile [routerLink]="['/foundation/settings']">
            <svg cdsIcon="settings" size="20"></svg>
            <span>{{ i18n.tr('foundation.nav.settings', 'Settings') }}</span>
          </cds-clickable-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-clickable-tile [routerLink]="['/foundation/audit']">
            <svg cdsIcon="recently-viewed" size="20"></svg>
            <span>{{ i18n.tr('foundation.nav.audit', 'Audit') }}</span>
          </cds-clickable-tile>
        </div>
      </div>

      <!-- Activity Feed (last 5 events) -->
      <section class="cds--structured-list fh-activity">
        <div class="cds--structured-list-thead">
          <div class="cds--structured-list-row cds--structured-list-row--header-row">
            <div class="cds--structured-list-th">{{ i18n.tr('foundation.activity.time', 'Time') }}</div>
            <div class="cds--structured-list-th">{{ i18n.tr('foundation.activity.actor', 'Actor') }}</div>
            <div class="cds--structured-list-th">{{ i18n.tr('foundation.activity.action', 'Action') }}</div>
            <div class="cds--structured-list-th">{{ i18n.tr('foundation.activity.entity', 'Entity') }}</div>
          </div>
        </div>
        <div class="cds--structured-list-tbody">
          @for (row of activity(); track row.id) {
            <div class="cds--structured-list-row">
              <div class="cds--structured-list-td">{{ row.time }}</div>
              <div class="cds--structured-list-td">{{ row.actor }}</div>
              <div class="cds--structured-list-td">{{ row.action }}</div>
              <div class="cds--structured-list-td">{{ row.entity }}</div>
            </div>
          }
          @if (activity().length === 0) {
            <div class="cds--structured-list-row">
              <div class="cds--structured-list-td" style="grid-column: 1/-1">
                {{ i18n.tr('foundation.activity.empty', 'No recent activity') }}
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Footer — tenant status -->
      <cds-notification
        [notificationObj]="{ type: 'info', title: i18n.tr('foundation.footer.title', 'Foundation Module'), message: i18n.tr('foundation.footer.message', 'Active · Phase 1 · Read-only') }"
        [showClose]="false">
      </cds-notification>

    }
  `,
  styles: [`
    :host { display: block; padding: var(--cds-spacing-06); background: var(--cds-background); }
    .fh-status-tag { margin-inline-start: var(--cds-spacing-03); margin-block-end: var(--cds-spacing-05); }
    .fh-skeleton { padding: var(--cds-spacing-06) 0; }
    .fh-kpi-strip { margin-block-end: var(--cds-spacing-06); }
    .fh-kpi-tile { display: flex; align-items: center; gap: var(--cds-spacing-04); }
    .fh-kpi-icon { fill: var(--cds-interactive); flex-shrink: 0; }
    .fh-kpi-body { display: flex; flex-direction: column; }
    .fh-kpi-value { font-size: var(--cds-heading-03-font-size, 1.25rem); font-weight: 600; }
    .fh-kpi-label { font-size: var(--cds-body-compact-01-font-size, 0.875rem); color: var(--cds-text-secondary); }
    .fh-links { margin-block-end: var(--cds-spacing-06); }
    .fh-links cds-clickable-tile { display: flex; align-items: center; gap: var(--cds-spacing-03); }
    .fh-links svg { fill: var(--cds-interactive); }
    .fh-activity { margin-block-end: var(--cds-spacing-06); }
  `],
})
export class FoundationHomeComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  /** Workspace breadcrumb href is DB-resolved (chrome.breadcrumbs from
   *  UI-OS runtime). Returning null suppresses the link until the DB
   *  emits a value (NO FRONTEND INVENTION per AGENTS.md). */
  workspaceHref(): string | null { return null; }

  loading = signal(true);
  kpis = signal<KpiCard[]>([]);
  activity = signal<ActivityRow[]>([]);

  ngOnInit(): void {
    this.api.getOverviewData().pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(data => {
      if (data) {
        const d = data as any;
        this.kpis.set([
          { id: 'users', label: this.i18n.tr('foundation.kpi.users', 'Users'), value: d.userCount ?? 0, icon: 'group', delta: d.userDelta },
          { id: 'departments', label: this.i18n.tr('foundation.kpi.departments', 'Departments'), value: d.departmentCount ?? 0, icon: 'enterprise' },
          { id: 'roles', label: this.i18n.tr('foundation.kpi.roles', 'Roles'), value: d.roleCount ?? 0, icon: 'security' },
          { id: 'openItems', label: this.i18n.tr('foundation.kpi.openItems', 'Open Items'), value: d.openItemCount ?? 0, icon: 'warning--alt' },
        ]);
        const events = Array.isArray(d.recentActivity) ? d.recentActivity : [];
        this.activity.set(events.slice(0, 5).map((e: any, i: number) => ({
          id: e.id ?? `evt-${i}`,
          time: e.timestamp ?? '—',
          actor: e.actor ?? '—',
          action: e.action ?? '—',
          entity: e.entity ?? '—',
        })));
      }
      this.loading.set(false);
    });
  }
}
