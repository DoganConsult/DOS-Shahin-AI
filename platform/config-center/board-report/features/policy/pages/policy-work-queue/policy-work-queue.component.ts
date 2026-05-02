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
import { PolicyApiService } from '../../services/policy-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

/** Work queue item shapes */
interface DraftItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastUpdated: string;
}

interface ReviewItem {
  id: string;
  policyTitle: string;
  step: string;
  assignedAt: string;
  slaDeadline: string;
}

interface ApprovalItem {
  id: string;
  policyTitle: string;
  step: string;
  requestedBy: string;
  slaDeadline: string;
}

interface PublicationItem {
  id: string;
  policyTitle: string;
  campaign: string;
  audienceCount: number;
  scheduledAt: string;
}

interface AckFollowUpItem {
  id: string;
  campaignName: string;
  policyTitle: string;
  total: number;
  attested: number;
  pending: number;
  completionPct: number;
}

interface ExceptionItem {
  id: string;
  policyTitle: string;
  reason: string;
  requestedBy: string;
  createdAt: string;
}

interface WorkQueueResponse {
  drafts: DraftItem[];
  reviews: ReviewItem[];
  approvals: ApprovalItem[];
  publications: PublicationItem[];
  ackFollowUps: AckFollowUpItem[];
  exceptions: ExceptionItem[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-work-queue',
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
        TabViewModule,
        ButtonModule,
        BadgeModule,
        TooltipModule,
        ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './policy-work-queue.component.html',
    styleUrls: ['./policy-work-queue.component.scss']
})
export class PolicyWorkQueueComponent implements OnInit {
  private readonly policyApi = inject(PolicyApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msgService = inject(MessageService);
  readonly i18n = inject(I18nService);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly loading = signal(true);

  /** Tab data signals */
  readonly drafts = signal<DraftItem[]>([]);
  readonly reviews = signal<ReviewItem[]>([]);
  readonly approvals = signal<ApprovalItem[]>([]);
  readonly publications = signal<PublicationItem[]>([]);
  readonly ackFollowUps = signal<AckFollowUpItem[]>([]);
  readonly exceptions = signal<ExceptionItem[]>([]);

  /** Active tab index */
  readonly activeTabIndex = signal(0);

  ngOnInit(): void {
    this.loadWorkQueue();
  }

  private loadWorkQueue(): void {
    this.loading.set(true);
    this.policyApi
      .getWorkQueue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.drafts.set(res.drafts ?? []);
          this.reviews.set(res.reviews ?? []);
          this.approvals.set(res.approvals ?? []);
          this.publications.set(res.publications ?? []);
          this.ackFollowUps.set(res.ackFollowUps ?? []);
          this.exceptions.set(res.exceptions ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /** Returns true if the SLA deadline is within 24 hours or past */
  isSlaAtRisk(deadline: string): boolean {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - Date.now();
    return diff < 24 * 60 * 60 * 1000;
  }

  /** Returns true if the SLA deadline is past */
  isSlaBreached(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  }

  /** Approve an item (approval or exception) */
  approveItem(item: ApprovalItem | ExceptionItem): void {
    this.policyApi
      .approve(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Approved', life: 3000 });
          this.loadWorkQueue();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Approval failed', life: 4000 });
        },
      });
  }

  /** Reject an item (approval or exception) */
  rejectItem(item: ApprovalItem | ExceptionItem): void {
    this.policyApi
      .retire(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'info', summary: 'Rejected', life: 3000 });
          this.loadWorkQueue();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Rejection failed', life: 4000 });
        },
      });
  }

  /** Send reminders for an acknowledgment follow-up */
  sendReminder(item: AckFollowUpItem): void {
    this.policyApi
      .sendPublicationReminders(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Reminders sent', life: 3000 });
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to send reminders', life: 4000 });
        },
      });
  }

  /** Truncate long strings for display */
  truncate(text: string, maxLen = 60): string {
    if (!text || text.length <= maxLen) return text || '';
    return text.substring(0, maxLen) + '...';
  }
}
