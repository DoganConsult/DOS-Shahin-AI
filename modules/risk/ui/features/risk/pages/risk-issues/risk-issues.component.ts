import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { SessionService } from '@app/dauth/session/session.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RISK_PRIMARY_TABS } from '@app/features/risk/risk.constants';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcRecord } from '@app/core/models/shared.types';
import { devError } from '@app/runtime/utils/dev-logger';

/**
 * Risk Issues & Escalations page — per spec section 8.H.
 *
 * Displays risk-related issues from indicator breaches, assessment failures,
 * control deficiencies, and SLA breaches. Links to remediation tasks and
 * tracks escalation queues with approval workflows.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-issues',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, ModuleTabsBarComponent,
        StatusBadgeComponent, AppDatePipe,
        SkeletonModule, TableModule, TagModule, ButtonModule, SelectModule, InputTextModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <div class="ri-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Issues & Escalations"
        titleAr="القضايا والتصعيدات"
        subtitleEn="Risk-related issues, remediation tasks, and escalation queue"
        subtitleAr="القضايا المرتبطة بالمخاطر ومهام المعالجة وطابور التصعيد"
        icon="alert-triangle"
        [actions]="headerActions()"
        (actionClick)="onHeaderAction($event)"
      />
      <app-module-tabs-bar [tabs]="tabs" />

      <!-- KPI Strip -->
      <div class="ri-kpi-strip">
        <div class="ri-kpi">
          <span class="ri-kpi-val ri-kpi--danger">{{ openIssuesCount() }}</span>
          <span class="ri-kpi-lbl">{{ isAr() ? 'قضايا مفتوحة' : 'Open Issues' }}</span>
        </div>
        <div class="ri-kpi">
          <span class="ri-kpi-val ri-kpi--warning">{{ overdueCount() }}</span>
          <span class="ri-kpi-lbl">{{ isAr() ? 'متأخرة' : 'Overdue' }}</span>
        </div>
        <div class="ri-kpi">
          <span class="ri-kpi-val ri-kpi--info">{{ escalationsCount() }}</span>
          <span class="ri-kpi-lbl">{{ isAr() ? 'تصعيدات' : 'Escalations' }}</span>
        </div>
        <div class="ri-kpi">
          <span class="ri-kpi-val ri-kpi--success">{{ closedThisMonth() }}</span>
          <span class="ri-kpi-lbl">{{ isAr() ? 'مغلقة هذا الشهر' : 'Closed This Month' }}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="ri-filters">
        <p-select [options]="severityOptions" [(ngModel)]="filterSeverity" placeholder="{{ isAr() ? 'الأولوية' : 'Severity' }}" [showClear]="true" styleClass="ri-filter" />
        <p-select [options]="statusOptions" [(ngModel)]="filterStatus" placeholder="{{ isAr() ? 'الحالة' : 'Status' }}" [showClear]="true" styleClass="ri-filter" />
        <span class="p-input-icon-left ri-filter">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="searchTerm" placeholder="{{ isAr() ? 'بحث...' : 'Search...' }}" />
        </span>
      </div>

      <!-- Issues table -->
      <div class="ri-table-wrap" *ngIf="!loading(); else skeleton">
        <p-table [value]="filteredIssues()" [rows]="15" [paginator]="filteredIssues().length > 15"
                 styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true" [sortField]="'created_at'" [sortOrder]="-1"
                 emptyMessage="{{ isAr() ? 'لا توجد قضايا' : 'No issues found' }}">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="title">{{ isAr() ? 'القضية' : 'Issue' }} <p-sortIcon field="title" /></th>
              <th pSortableColumn="priority">{{ isAr() ? 'الأولوية' : 'Severity' }} <p-sortIcon field="priority" /></th>
              <th>{{ isAr() ? 'المخاطرة' : 'Linked Risk' }}</th>
              <th>{{ isAr() ? 'المصدر' : 'Source' }}</th>
              <th>{{ isAr() ? 'المسؤول' : 'Assignee' }}</th>
              <th pSortableColumn="due_date">{{ isAr() ? 'الاستحقاق' : 'Due Date' }} <p-sortIcon field="due_date" /></th>
              <th>{{ isAr() ? 'التصعيد' : 'Escalation' }}</th>
              <th pSortableColumn="status">{{ isAr() ? 'الحالة' : 'Status' }} <p-sortIcon field="status" /></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr class="cursor-pointer" (click)="navigateToRisk(row.linked_risk_id || row.risk_id)">
              <td>{{ row.title || row.description }}</td>
              <td><app-status-badge [value]="row.priority || row.severity" type="severity" /></td>
              <td>{{ row.risk_title || row.linked_risk_id || '—' }}</td>
              <td>{{ row.source || row.issue_source || 'Manual' }}</td>
              <td>{{ row.assignee || row.assigned_to || row.owner || '—' }}</td>
              <td>{{ row.due_date || row.sla_deadline | appDate }}</td>
              <td>
                <p-tag *ngIf="row.escalation_level > 0" [severity]="row.escalation_level >= 2 ? 'danger' : 'warning'" [value]="'L' + row.escalation_level" />
                <span *ngIf="!row.escalation_level">—</span>
              </td>
              <td><app-status-badge [value]="row.status" type="status" /></td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <ng-template #skeleton>
        <div class="ri-skeleton">
          <p-skeleton width="100%" height="3rem" styleClass="mb-2" />
          <p-skeleton width="100%" height="25rem" />
        </div>
      </ng-template>
    </div>
  `,
    styles: [`
    .ri-page { padding: 0; }
    .ri-kpi-strip { display: flex; gap: 12px; padding: 10px 20px; flex-wrap: wrap; }
    .ri-kpi { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 20px); }
    .ri-kpi-val { font-weight: 700; font-size: var(--font-size-md); }
    .ri-kpi-lbl { font-size: var(--font-size-sm); color: var(--text-muted); }
    .ri-kpi--danger { color: var(--error); }
    .ri-kpi--warning { color: var(--warning); }
    .ri-kpi--info { color: var(--primary); }
    .ri-kpi--success { color: var(--success); }
    .ri-filters { display: flex; gap: 8px; padding: 8px 20px; flex-wrap: wrap; }
    .ri-filter { min-width: 160px; }
    .ri-table-wrap { padding: 0 20px 20px; }
    .ri-skeleton { padding: 20px; }
    .cursor-pointer { cursor: pointer; }
  `]
})
export class RiskIssuesComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private auth = inject(SessionService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly tabs = RISK_PRIMARY_TABS;
  loading = signal(true);
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  issues = signal<GrcRecord[]>([]);
  searchTerm = '';
  filterSeverity: string | null = null;
  filterStatus: string | null = null;

  severityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];
  statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Closed', value: 'closed' },
  ];

  headerActions = computed<PageHeaderAction[]>(() =>
    this.auth.hasPermission('risk.record.write') ? [{ id: 'create-issue', labelEn: 'New Issue', labelAr: 'قضية جديدة', icon: 'plus', primary: true }] : []
  );

  filteredIssues = computed(() => {
    let list = this.issues();
    if (this.filterSeverity) list = list.filter(i => (i.priority || i.severity) === this.filterSeverity);
    if (this.filterStatus) list = list.filter(i => i.status === this.filterStatus);
    if (this.searchTerm?.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(i => (i.title || '').toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term));
    }
    return list;
  });

  openIssuesCount = computed(() => this.issues().filter(i => i.status !== 'closed').length);
  overdueCount = computed(() => this.issues().filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < new Date() && i.status !== 'closed')).length);
  escalationsCount = computed(() => this.issues().filter(i => (i.escalation_level ?? 0) > 0).length);
  closedThisMonth = computed(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.issues().filter(i => i.status === 'closed' && i.closed_at && new Date(i.closed_at) >= monthStart).length;
  });

  ngOnInit(): void {
    this.load();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api.getIssues().pipe(catchError(() => of([]))).subscribe(data => {
      this.issues.set(Array.isArray(data) ? data : (data as GrcRecord)?.items || []);
      this.loading.set(false);
    });
  }

  onHeaderAction(id: string): void {
    if (id === 'create-issue') this.router.navigate(['/risk/issues'], { queryParams: { action: 'create' } });
  }

  navigateToRisk(riskId: string): void {
    if (riskId) this.router.navigate(['/risk/register', riskId]);
  }
}
