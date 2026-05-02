import {
  Component, OnInit, inject, signal, computed, DestroyRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EvidenceApiService } from '../../services/evidence-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { KpiCardVM } from '@app/shared/models/module-overview.vm';
import { GrcDataTableComponent } from '@app/shared/components';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

// ── Interfaces ────────────────────────────────────────────────────────────────

/** Work queue item -- generic shape covering all tab types */
interface WorkItem {
  id: string;
  title: string;
  control?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  submittedBy?: string;
  ageDays?: number;
  type?: string;
  validTo?: string;
  daysRemaining?: number;
  rejectionReason?: string;
  submittedDate?: string;
  assignedTo?: string;
  framework?: string;
}

/** Tab definition for the work queue */
interface TabDef {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

/** Work queue statistics for KPI strip */
interface WorkQueueStats {
  openTasks: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
}

/**
 * Evidence Work Queue -- personal task queue for the current user.
 *
 * Displays evidence-related assignments across five tabs:
 * Assigned Requests, Pending Reviews, Expiring Soon, Rejected Items, and My Tasks.
 * Includes KPI strip, filters, row actions, and detail drawer.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-work-queue',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, KpiCardGridComponent,
        SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent,
        GrcDataTableComponent,
        TableModule, ButtonModule, DropdownModule, CalendarModule,
        ToastModule, SkeletonModule,
    ],
    providers: [MessageService],
    templateUrl: './evidence-work-queue.component.html',
    styleUrls: ['./evidence-work-queue.component.scss']
})
export class EvidenceWorkQueueComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(EvidenceApiService);
  private readonly live = inject(GrcLiveService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msg = inject(MessageService);

  loading = signal(true);
  error = signal(false);
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Active tab key */
  activeTab = signal<string>('assigned');

  /** Selected item for detail drawer */
  selectedItem = signal<WorkItem | null>(null);

  // ── Filters ──
  filterStatus = '';
  filterPriority = '';
  filterDueDateFrom: Date | null = null;
  filterDueDateTo: Date | null = null;

  readonly statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Pending', value: 'pending' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Completed', value: 'completed' },
  ];

  readonly priorityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  /** Page header actions */
  readonly headerActions: PageHeaderAction[] = [
    { id: 'refresh', labelEn: 'Refresh', labelAr: 'تحديث', icon: 'refresh' },
  ];

  /** Tab definitions */
  readonly tabs: TabDef[] = [
    { key: 'assigned', labelEn: 'Assigned Requests', labelAr: 'الطلبات المُسندة', icon: 'pi-inbox' },
    { key: 'reviews',  labelEn: 'Pending Reviews',   labelAr: 'مراجعات معلقة',     icon: 'pi-eye' },
    { key: 'expiring', labelEn: 'Expiring Soon',     labelAr: 'تنتهي قريبا',       icon: 'pi-clock' },
    { key: 'rejected', labelEn: 'Rejected Items',    labelAr: 'عناصر مرفوضة',      icon: 'pi-times-circle' },
    { key: 'tasks',    labelEn: 'My Tasks',           labelAr: 'مهامي',              icon: 'pi-list' },
  ];

  /** Data signals for each tab */
  assignedRequests = signal<WorkItem[]>([]);
  pendingReviews = signal<WorkItem[]>([]);
  expiringEvidence = signal<WorkItem[]>([]);
  rejectedItems = signal<WorkItem[]>([]);
  myTasks = signal<WorkItem[]>([]);

  /** Queue statistics for KPI strip */
  private queueStats = signal<WorkQueueStats>({
    openTasks: 0,
    overdue: 0,
    dueToday: 0,
    completedThisWeek: 0,
  });

  /** Badge counts per tab */
  tabCounts = computed(() => ({
    assigned: this.assignedRequests().length,
    reviews: this.pendingReviews().length,
    expiring: this.expiringEvidence().length,
    rejected: this.rejectedItems().length,
    tasks: this.myTasks().length,
  }));

  /** KPI cards for the top strip */
  kpis = computed<KpiCardVM[]>(() => {
    const s = this.queueStats();
    return [
      {
        id: 'open', route: '/evidence/work-queue',
        labelEn: 'Open Tasks',
        labelAr: 'مهام مفتوحة',
        value: s.openTasks,
        icon: 'inbox',
        color: 'var(--primary)',
        bg: 'var(--surface-100)',
      },
      {
        id: 'overdue', route: '/evidence/work-queue',
        labelEn: 'Overdue',
        labelAr: 'متأخرة',
        value: s.overdue,
        icon: 'exclamation-triangle',
        color: 'var(--error)',
        bg: 'var(--surface-100)',
        severity: s.overdue > 0 ? 'danger' : 'default',
      },
      {
        id: 'dueToday', route: '/evidence/work-queue',
        labelEn: 'Due Today',
        labelAr: 'مستحقة اليوم',
        value: s.dueToday,
        icon: 'calendar',
        color: 'var(--warning)',
        bg: 'var(--surface-100)',
        severity: s.dueToday > 0 ? 'warning' : 'default',
      },
      {
        id: 'completed', route: '/evidence/work-queue',
        labelEn: 'Completed This Week',
        labelAr: 'مكتملة هذا الأسبوع',
        value: s.completedThisWeek,
        icon: 'check-circle',
        color: 'var(--success)',
        bg: 'var(--surface-100)',
      },
    ];
  });

  /** Filtered items for the current active tab */
  filteredAssigned = computed(() => this.applyFilters(this.assignedRequests()));
  filteredReviews = computed(() => this.applyFilters(this.pendingReviews()));
  filteredExpiring = computed(() => this.applyFilters(this.expiringEvidence()));
  filteredRejected = computed(() => this.applyFilters(this.rejectedItems()));
  filteredTasks = computed(() => this.applyFilters(this.myTasks()));

  ngOnInit(): void {
    this.load();
    this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  /** Load work queue data from the API */
  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.api.getWorkQueue().pipe(
      catchError(() => of(null)),
    ).subscribe({
      next: (res) => {
        if (!res) {
          this.error.set(true);
          this.loading.set(false);
          return;
        }
        const data = res as Record<string, unknown>;
        this.assignedRequests.set(this.mapItems(data['assignedRequests']));
        this.pendingReviews.set(this.mapItems(data['pendingReviews']));
        this.expiringEvidence.set(this.mapItems(data['expiringEvidence']));
        this.rejectedItems.set(this.mapItems(data['rejectedItems']));
        this.myTasks.set(this.mapItems(data['myTasks']));

        // Compute queue statistics from the response or derive from items
        const stats = data['stats'] as Record<string, number> | undefined;
        this.queueStats.set({
          openTasks: stats?.['openTasks'] ??
            (this.assignedRequests().length + this.myTasks().length),
          overdue: stats?.['overdue'] ??
            this.computeOverdueCount(),
          dueToday: stats?.['dueToday'] ??
            this.computeDueTodayCount(),
          completedThisWeek: stats?.['completedThisWeek'] ?? 0,
        });

        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Switch active tab */
  selectTab(key: string): void {
    this.activeTab.set(key);
  }

  /** Handle page header actions */
  onHeaderAction(id: string): void {
    if (id === 'refresh') {
      this.load();
    }
  }

  /** Handle KPI card click */
  onKpiClick(card: KpiCardVM): void {
    if (card.id === 'overdue') this.selectTab('assigned');
    else if (card.id === 'dueToday') this.selectTab('tasks');
    else if (card.id === 'open') this.selectTab('assigned');
  }

  /** Open detail drawer for a work item */
  openDetail(item: WorkItem): void {
    this.selectedItem.set(item);
  }

  /** Close detail drawer */
  closeDetail(): void {
    this.selectedItem.set(null);
  }

  /** Acknowledge a work item assignment */
  acknowledge(item: WorkItem): void {
    this.api.updateEvidence(item.id, { status: 'in_progress' }).pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.isAr() ? 'تم الإقرار' : 'Acknowledged',
          life: 3000,
        });
        this.load();
        this.closeDetail();
      } else {
        this.msg.add({
          severity: 'error',
          summary: this.isAr() ? 'فشل الإقرار' : 'Acknowledge failed',
          life: 3000,
        });
      }
    });
  }

  /** Submit evidence for a work item */
  submit(item: WorkItem): void {
    this.api.transitionStatus(item.id, 'under_review').pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.isAr() ? 'تم التقديم' : 'Submitted',
          life: 3000,
        });
        this.load();
        this.closeDetail();
      } else {
        this.msg.add({
          severity: 'error',
          summary: this.isAr() ? 'فشل التقديم' : 'Submit failed',
          life: 3000,
        });
      }
    });
  }

  /** Delegate a work item to another user */
  delegate(item: WorkItem): void {
    // Open delegation flow -- sets status to delegated
    this.api.updateEvidence(item.id, { status: 'delegated' }).pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'info',
          summary: this.isAr() ? 'تم التفويض' : 'Delegated',
          life: 3000,
        });
        this.load();
        this.closeDetail();
      }
    });
  }

  /** Clear all filters */
  clearFilters(): void {
    this.filterStatus = '';
    this.filterPriority = '';
    this.filterDueDateFrom = null;
    this.filterDueDateTo = null;
  }

  /** Format snake_case status for display */
  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  /** Check if any filters are active */
  get hasFilters(): boolean {
    return !!(this.filterStatus || this.filterPriority || this.filterDueDateFrom || this.filterDueDateTo);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Map raw API array to typed WorkItem[] */
  private mapItems(raw: unknown): WorkItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((r: Record<string, unknown>) => ({
      id: (r['id'] as string) || (r['request_id'] as string) || (r['task_id'] as string) || '',
      title: (r['title'] as string) || (r['evidence_title'] as string) || (r['name'] as string) || '',
      control: (r['control'] as string) || (r['control_ref'] as string) || '',
      dueDate: (r['due_date'] as string) || (r['deadline'] as string) || '',
      priority: (r['priority'] as string) || '',
      status: (r['status'] as string) || '',
      submittedBy: (r['submitted_by'] as string) || (r['submitter'] as string) || '',
      ageDays: (r['age_days'] as number) || (r['ageDays'] as number) || 0,
      type: (r['type'] as string) || (r['evidence_type'] as string) || '',
      validTo: (r['valid_to'] as string) || (r['expires_at'] as string) || '',
      daysRemaining: (r['days_remaining'] as number) || (r['daysRemaining'] as number) || 0,
      rejectionReason: (r['rejection_reason'] as string) || (r['reason'] as string) || '',
      submittedDate: (r['submitted_date'] as string) || (r['created_at'] as string) || '',
      assignedTo: (r['assigned_to'] as string) || (r['assignee'] as string) || '',
      framework: (r['framework'] as string) || (r['framework_code'] as string) || '',
    }));
  }

  /** Apply client-side filters to a work item list */
  private applyFilters(items: WorkItem[]): WorkItem[] {
    let filtered = items;

    if (this.filterStatus) {
      filtered = filtered.filter(i => i.status === this.filterStatus);
    }
    if (this.filterPriority) {
      filtered = filtered.filter(i => i.priority === this.filterPriority);
    }
    if (this.filterDueDateFrom) {
      const from = this.filterDueDateFrom.toISOString();
      filtered = filtered.filter(i => (i.dueDate || '') >= from);
    }
    if (this.filterDueDateTo) {
      const to = this.filterDueDateTo.toISOString();
      filtered = filtered.filter(i => (i.dueDate || '') <= to);
    }

    return filtered;
  }

  /** Compute count of overdue items across all tabs */
  private computeOverdueCount(): number {
    const now = new Date().toISOString();
    const allItems = [
      ...this.assignedRequests(),
      ...this.myTasks(),
    ];
    return allItems.filter(i =>
      i.dueDate && i.dueDate < now && i.status !== 'completed'
    ).length;
  }

  /** Compute count of items due today */
  private computeDueTodayCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    const allItems = [
      ...this.assignedRequests(),
      ...this.myTasks(),
    ];
    return allItems.filter(i =>
      i.dueDate && i.dueDate.slice(0, 10) === today
    ).length;
  }
}
