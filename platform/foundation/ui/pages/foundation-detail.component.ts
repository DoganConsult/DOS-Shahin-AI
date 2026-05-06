/**
 * Foundation Module — Page 3: Detail (Single Record Drill-Down)
 *
 * Phase-1 enrollment. Read-only. Carbon Tabs + StructuredList + DataTable.
 * Layout: Breadcrumb + Tag → Summary Tile → Tabs (Overview/Attributes/Relations/History/Audit).
 * Permission gate: foundation.read + entity-level RLS.
 */
import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import {
  BreadcrumbModule, TilesModule, TagModule, TabsModule,
  SkeletonModule, NotificationModule, IconModule, ButtonModule,
  TooltipModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

@Component({
  selector: 'app-foundation-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    BreadcrumbModule, TilesModule, TagModule, TabsModule,
    SkeletonModule, NotificationModule, IconModule, ButtonModule,
    TooltipModule,
  ],
  template: `
    <!-- Breadcrumb + Status Tag -->
    <cds-breadcrumb>
      <cds-breadcrumb-item [href]="workspaceHref()">{{ i18n.tr('breadcrumb.workspace', 'Workspace') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item [href]="'/foundation'">{{ i18n.tr('foundation.name', 'Foundation') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item [href]="'/foundation/users'">{{ i18n.tr('foundation.register.title', 'Register') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item>{{ recordId() | slice:0:8 }}</cds-breadcrumb-item>
    </cds-breadcrumb>

    @if (loading()) {
      <cds-skeleton-text [lines]="6"></cds-skeleton-text>
    } @else if (!record()) {
      <cds-tile>
        <cds-notification
          [notificationObj]="{ type: 'warning', title: i18n.tr('foundation.detail.notFound', 'Record not found'), message: '' }"
          [showClose]="false">
        </cds-notification>
      </cds-tile>
    } @else {

      <!-- Summary Card -->
      <cds-tile class="fd-summary">
        <div class="fd-summary-header">
          <div>
            <h2 class="fd-summary-title">{{ record()?.name || record()?.email || recordId() }}</h2>
            <span class="fd-summary-sub">{{ record()?.role || '—' }}</span>
          </div>
          <cds-tag [type]="record()?.status === 'active' ? 'green' : 'cool-gray'" size="sm">{{ record()?.status || 'unknown' }}</cds-tag>
        </div>
        <div class="fd-summary-meta">
          <span>{{ i18n.tr('foundation.detail.created', 'Created') }}: {{ record()?.created_at || '—' }}</span>
          <span>{{ i18n.tr('foundation.detail.updated', 'Updated') }}: {{ record()?.updated_at || '—' }}</span>
          <span>{{ i18n.tr('foundation.detail.owner', 'Owner') }}: {{ record()?.owner || '—' }}</span>
        </div>
      </cds-tile>

      <!-- Tabs -->
      <div class="fd-tabs">
        <div class="cds--tabs" role="tablist">
          @for (tab of tabs; track tab.id; let i = $index) {
            <button class="cds--tabs__nav-link" [class.cds--tabs__nav-link--selected]="activeTab === tab.id"
              (click)="activeTab = tab.id" role="tab">{{ tab.label }}</button>
          }
        </div>

        <div class="fd-tab-content">
          @switch (activeTab) {
            @case ('overview') {
              <section class="cds--structured-list">
                <div class="cds--structured-list-tbody">
                  @for (field of overviewFields(); track field.key) {
                    <div class="cds--structured-list-row">
                      <div class="cds--structured-list-td fd-field-key">{{ field.key }}</div>
                      <div class="cds--structured-list-td">{{ field.value }}</div>
                    </div>
                  }
                </div>
              </section>
            }
            @case ('attributes') {
              <section class="cds--structured-list">
                <div class="cds--structured-list-tbody">
                  @for (attr of attributes(); track attr.key) {
                    <div class="cds--structured-list-row">
                      <div class="cds--structured-list-td fd-field-key">{{ attr.key }}</div>
                      <div class="cds--structured-list-td">{{ attr.value }}</div>
                    </div>
                  }
                  @if (attributes().length === 0) {
                    <div class="cds--structured-list-row">
                      <div class="cds--structured-list-td">{{ i18n.tr('foundation.detail.noAttributes', 'No custom attributes') }}</div>
                    </div>
                  }
                </div>
              </section>
            }
            @case ('relations') {
              <table class="cds--data-table">
                <thead><tr>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.relType', 'Type') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.relTarget', 'Target') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.relModule', 'Module') }}</th>
                </tr></thead>
                <tbody>
                  @for (rel of relations(); track rel.id) {
                    <tr><td>{{ rel.type }}</td><td>{{ rel.target }}</td><td>{{ rel.module }}</td></tr>
                  }
                  @if (relations().length === 0) {
                    <tr><td colspan="3">{{ i18n.tr('foundation.detail.noRelations', 'No linked records') }}</td></tr>
                  }
                </tbody>
              </table>
            }
            @case ('history') {
              <table class="cds--data-table">
                <thead><tr>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.histVersion', 'Version') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.histDate', 'Date') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.histActor', 'Actor') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.detail.histChange', 'Change') }}</th>
                </tr></thead>
                <tbody>
                  @for (h of history(); track h.version) {
                    <tr><td>{{ h.version }}</td><td>{{ h.date }}</td><td>{{ h.actor }}</td><td>{{ h.change }}</td></tr>
                  }
                  @if (history().length === 0) {
                    <tr><td colspan="4">{{ i18n.tr('foundation.detail.noHistory', 'No version history') }}</td></tr>
                  }
                </tbody>
              </table>
            }
            @case ('audit') {
              <table class="cds--data-table">
                <thead><tr>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.time', 'Time') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.actor', 'Actor') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.action', 'Action') }}</th>
                  <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.outcome', 'Outcome') }}</th>
                </tr></thead>
                <tbody>
                  @for (a of auditRows(); track a.id) {
                    <tr><td>{{ a.time }}</td><td>{{ a.actor }}</td><td>{{ a.action }}</td><td>{{ a.outcome }}</td></tr>
                  }
                  @if (auditRows().length === 0) {
                    <tr><td colspan="4">{{ i18n.tr('foundation.audit.empty', 'No audit events') }}</td></tr>
                  }
                </tbody>
              </table>
            }
          }
        </div>
      </div>

      <!-- Phase-3 action stubs -->
      <div class="fd-actions">
        <cds-tooltip [description]="i18n.tr('foundation.detail.editDisabled', 'Available in Phase 3')">
          <button cdsButton="primary" size="sm" [disabled]="true">{{ i18n.tr('foundation.detail.edit', 'Edit') }}</button>
        </cds-tooltip>
        <cds-tooltip [description]="i18n.tr('foundation.detail.deleteDisabled', 'Available in Phase 3')">
          <button cdsButton="danger" size="sm" [disabled]="true">{{ i18n.tr('foundation.detail.delete', 'Delete') }}</button>
        </cds-tooltip>
      </div>
    }
  `,
  styles: [`
    :host { display: block; padding: var(--cds-spacing-06); background: var(--cds-background); }
    .fd-summary { margin: var(--cds-spacing-05) 0; }
    .fd-summary-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .fd-summary-title { font-size: var(--cds-heading-03-font-size); font-weight: 600; margin: 0; }
    .fd-summary-sub { font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); }
    .fd-summary-meta { display: flex; gap: var(--cds-spacing-05); margin-top: var(--cds-spacing-03); font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); flex-wrap: wrap; }
    .fd-tabs { margin: var(--cds-spacing-05) 0; }
    .cds--tabs { display: flex; border-bottom: 2px solid var(--cds-border-subtle-00); margin-bottom: var(--cds-spacing-05); }
    .cds--tabs__nav-link { padding: var(--cds-spacing-03) var(--cds-spacing-05); border: none; background: none; cursor: pointer; font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .cds--tabs__nav-link--selected { color: var(--cds-text-primary); border-bottom-color: var(--cds-interactive); font-weight: 600; }
    .fd-tab-content { min-height: 200px; }
    .fd-field-key { font-weight: 600; color: var(--cds-text-secondary); min-width: 160px; }
    .fd-actions { display: flex; gap: var(--cds-spacing-03); margin-top: var(--cds-spacing-05); }
    .cds--data-table { width: 100%; }
  `],
})
export class FoundationDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  /** DB-resolved breadcrumb href (NO FRONTEND INVENTION). */
  workspaceHref(): string | null { return null; }

  loading = signal(true);
  recordId = signal('');
  record = signal<any>(null);
  overviewFields = signal<{ key: string; value: string }[]>([]);
  attributes = signal<{ key: string; value: string }[]>([]);
  relations = signal<{ id: string; type: string; target: string; module: string }[]>([]);
  history = signal<{ version: number; date: string; actor: string; change: string }[]>([]);
  auditRows = signal<{ id: string; time: string; actor: string; action: string; outcome: string }[]>([]);
  activeTab = 'overview';

  tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'attributes', label: 'Attributes' },
    { id: 'relations', label: 'Relations' },
    { id: 'history', label: 'History' },
    { id: 'audit', label: 'Audit' },
  ];

  ngOnInit(): void {
    this.route.queryParams.pipe(
      switchMap(params => {
        const id = params['id'] || '';
        this.recordId.set(id);
        if (!id) return of(null);
        return this.api.getUserById(id).pipe(catchError(() => of(null)));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(user => {
      if (user) {
        this.record.set(user);
        const u = user as any;
        this.overviewFields.set([
          { key: 'Email', value: u.email ?? '—' },
          { key: 'First Name', value: u.first_name ?? '—' },
          { key: 'Last Name', value: u.last_name ?? '—' },
          { key: 'Role', value: u.role ?? '—' },
          { key: 'Department', value: u.department_name ?? '—' },
          { key: 'Status', value: u.status ?? '—' },
          { key: 'Created', value: u.created_at ?? '—' },
          { key: 'Updated', value: u.updated_at ?? '—' },
        ]);
      }
      this.loading.set(false);
    });
  }
}
