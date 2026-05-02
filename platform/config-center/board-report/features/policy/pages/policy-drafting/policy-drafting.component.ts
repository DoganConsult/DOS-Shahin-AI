import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PolicyApiService, PolicyDto } from '../../services/policy-api.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';
import { TableModule } from 'primeng/table';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

/** Draft item in the drafting pipeline */
interface DraftItem {
  id: string;
  policyCode: string;
  title: string;
  author: string;
  version: string;
  status: string;
  lastUpdated: string;
}

/** Review pipeline item */
interface ReviewItem {
  id: string;
  policyTitle: string;
  currentStep: string;
  reviewer: string;
  stepStatus: string;
  slaRemaining: string;
  slaHours: number;
}

/** Approval queue item */
interface ApprovalQueueItem {
  id: string;
  policyTitle: string;
  requestedBy: string;
  requestedAt: string;
  slaDeadline: string;
}

/** SLA status classification */
type SlaStatus = 'on-track' | 'at-risk' | 'breached' | '';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-drafting',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        PageHeaderComponent,
        StatusBadgeComponent,
        SkeletonLoaderComponent,
        EmptyStateComponent,
        GrcDataTableComponent,
        TableModule,
        AccordionModule,
        ButtonModule,
        DropdownModule,
        InputTextModule,
        TooltipModule,
        ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './policy-drafting.component.html',
    styleUrls: ['./policy-drafting.component.scss']
})
export class PolicyDraftingComponent implements OnInit {
  private readonly policyApi = inject(PolicyApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msgService = inject(MessageService);
  readonly i18n = inject(I18nService);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly headerActions: PageHeaderAction[] = [
    { id: 'new-draft', labelEn: 'New Draft', labelAr: 'مسودة جديدة', icon: 'plus', primary: true },
  ];

  readonly loading = signal(true);

  /** Data signals */
  readonly drafts = signal<DraftItem[]>([]);
  readonly reviews = signal<ReviewItem[]>([]);
  readonly approvalQueue = signal<ApprovalQueueItem[]>([]);

  /** Filter state */
  readonly statusFilter = signal('');
  readonly stepFilter = signal('');
  readonly reviewerFilter = signal('');
  readonly slaFilter = signal<SlaStatus>('');

  /** Dropdown options */
  readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Approved', value: 'approved' },
  ];

  readonly stepOptions = [
    { label: 'All Steps', value: '' },
    { label: 'Internal Review', value: 'internal_review' },
    { label: 'Legal Review', value: 'legal_review' },
    { label: 'Compliance Review', value: 'compliance_review' },
    { label: 'Final Approval', value: 'final_approval' },
  ];

  readonly slaOptions = [
    { label: 'All SLA', value: '' },
    { label: 'On Track', value: 'on-track' },
    { label: 'At Risk', value: 'at-risk' },
    { label: 'Breached', value: 'breached' },
  ];

  /** Unique reviewers from review data for the reviewer dropdown */
  readonly reviewerOptions = computed(() => {
    const reviewers = [...new Set(this.reviews().map((r) => r.reviewer).filter(Boolean))];
    return [{ label: 'All Reviewers', value: '' }, ...reviewers.map((r) => ({ label: r, value: r }))];
  });

  /** Filtered drafts */
  readonly filteredDrafts = computed(() => {
    let result = this.drafts();
    const status = this.statusFilter();
    if (status) {
      result = result.filter((d) => d.status === status);
    }
    return result;
  });

  /** Filtered reviews */
  readonly filteredReviews = computed(() => {
    let result = this.reviews();
    const step = this.stepFilter();
    const reviewer = this.reviewerFilter();
    const sla = this.slaFilter();
    if (step) result = result.filter((r) => r.currentStep === step);
    if (reviewer) result = result.filter((r) => r.reviewer === reviewer);
    if (sla) result = result.filter((r) => this.getSlaStatus(r.slaHours) === sla);
    return result;
  });

  /** Filtered approval queue */
  readonly filteredApprovalQueue = computed(() => {
    const sla = this.slaFilter();
    if (!sla) return this.approvalQueue();
    return this.approvalQueue().filter((a) => {
      const hours = (new Date(a.slaDeadline).getTime() - Date.now()) / 3600000;
      return this.getSlaStatus(hours) === sla;
    });
  });

  /** Reviews grouped by step type */
  readonly reviewsByStep = computed(() => {
    const reviews = this.filteredReviews();
    const groups: Record<string, ReviewItem[]> = {};
    for (const r of reviews) {
      const key = r.currentStep || 'unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  });

  /** Step group keys for iteration */
  readonly reviewStepGroups = computed(() => Object.keys(this.reviewsByStep()));

  ngOnInit(): void {
    this.loadData();
  }

  onHeaderAction(id: string): void {
    if (id === 'new-draft') {
      this.createNewDraft();
    }
  }

  private loadData(): void {
    this.loading.set(true);

    // Load drafts from list API with draft status filter
    this.policyApi
      .list({ status: 'draft', limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.drafts.set(
            (res.data ?? []).map((p: PolicyDto) => ({
              id: p.id,
              policyCode: p.frameworkRef ?? p.id.substring(0, 8).toUpperCase(),
              title: p.title,
              author: p.ownerName ?? p.owner ?? '',
              version: p.version,
              status: p.status,
              lastUpdated: p.updatedAt,
            }))
          );
        },
        error: () => {},
      });

    // Load work queue for reviews and approvals
    this.policyApi
      .getWorkQueue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.reviews.set(
            (res.reviews ?? []).map((r: any) => ({
              id: r.id,
              policyTitle: r.policyTitle,
              currentStep: r.step,
              reviewer: r.reviewer ?? r.assignedTo ?? '',
              stepStatus: r.stepStatus ?? r.status ?? 'in_progress',
              slaRemaining: r.slaRemaining ?? '',
              slaHours: r.slaHours ?? this.computeSlaHours(r.slaDeadline),
            }))
          );
          this.approvalQueue.set(
            (res.approvals ?? []).map((a: any) => ({
              id: a.id,
              policyTitle: a.policyTitle,
              requestedBy: a.requestedBy,
              requestedAt: a.requestedAt ?? a.createdAt,
              slaDeadline: a.slaDeadline,
            }))
          );
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /** Classify SLA status from remaining hours */
  getSlaStatus(hours: number): SlaStatus {
    if (hours <= 0) return 'breached';
    if (hours <= 24) return 'at-risk';
    return 'on-track';
  }

  /** CSS class for SLA badge */
  slaClass(hours: number): string {
    const status = this.getSlaStatus(hours);
    return `sla-badge sla-badge--${status}`;
  }

  /** Compute SLA hours from deadline string */
  private computeSlaHours(deadline: string | undefined): number {
    if (!deadline) return 999;
    return (new Date(deadline).getTime() - Date.now()) / 3600000;
  }

  /** Approve an item in the approval queue */
  approveItem(item: ApprovalQueueItem): void {
    this.policyApi
      .approve(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Policy approved', life: 3000 });
          this.loadData();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Approval failed', life: 4000 });
        },
      });
  }

  /** Reject an item in the approval queue */
  rejectItem(item: ApprovalQueueItem): void {
    this.policyApi
      .retire(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'info', summary: 'Policy rejected', life: 3000 });
          this.loadData();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Rejection failed', life: 4000 });
        },
      });
  }

  /** Navigate to create new draft */
  private createNewDraft(): void {
    this.policyApi
      .create({ title: 'Untitled Draft', status: 'draft', tags: [] })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Draft created', life: 3000 });
          this.loadData();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to create draft', life: 4000 });
        },
      });
  }

  /** Compute hours remaining from a deadline string (used in template) */
  computeHoursFromDeadline(deadline: string): number {
    return this.computeSlaHours(deadline);
  }

  /** Format step name for display */
  formatStepName(step: string): string {
    return (step || 'unassigned').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
