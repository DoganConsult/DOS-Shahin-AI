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
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PolicyApiService } from '../../services/policy-api.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

/** Shape of the KPI response from the API */
interface OverviewKPIs {
  totalPolicies: number;
  publishedPct: number;
  overdueReviews: number;
  pendingApprovals: number;
  ackRate: number;
  activeExceptions: number;
  pendingApprovalItems: PendingApprovalItem[];
  overdueReviewItems: OverdueReviewItem[];
  ackCampaigns: AckCampaign[];
  expiringExceptions: ExpiringException[];
  stalePolicies: StalePolicy[];
  categoryDistribution: CategoryCount[];
  recentActivity: ActivityItem[];
}

interface PendingApprovalItem {
  id: string;
  title: string;
  status: string;
  daysWaiting: number;
}

interface OverdueReviewItem {
  id: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  owner: string;
}

interface AckCampaign {
  id: string;
  campaignName: string;
  completionPct: number;
  overdueCount: number;
}

interface ExpiringException {
  id: string;
  policyTitle: string;
  expiryDate: string;
  daysRemaining: number;
}

interface StalePolicy {
  id: string;
  title: string;
  lastUpdated: string;
  owner: string;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface ActivityItem {
  id: string;
  icon: string;
  description: string;
  timestamp: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-home',
    imports: [
        CommonModule,
        RouterModule,
        PageHeaderComponent,
        StatusBadgeComponent,
        SkeletonLoaderComponent,
        EmptyStateComponent,
        ModuleOverviewKitComponent,
    ],
    templateUrl: './policy-home.component.html',
    styleUrls: ['./policy-home.component.scss']
})
export class PolicyHomeComponent implements OnInit {
  private readonly policyApi = inject(PolicyApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  readonly policyAgents: AgentInfo[] = [
    { id: 'A05', name: 'Policy Reviewer', nameAr: 'مراجع السياسات', icon: 'pi-file', color: '#8b5cf6', domain: 'Policy', domainAr: 'السياسات', autonomyLevel: 'hybrid', status: 'active' },
  ];

  readonly policyTransitions = [
    { from: 'draft', to: 'review', requiredPermission: 'policy.document.manage' },
    { from: 'review', to: 'approved', requiresApproval: true },
    { from: 'review', to: 'rejected' },
    { from: 'approved', to: 'published', requiredPermission: 'policy.document.publish' },
    { from: 'published', to: 'review_due' },
    { from: 'review_due', to: 'review' },
    { from: 'published', to: 'retired' },
    { from: 'rejected', to: 'draft' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'policy',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 336,
    transitions: this.policyTransitions,
    currentStatus: 'published',
    agents: this.policyAgents,
    lang: this.isAr() ? 'ar' : 'en',
  }));

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly headerActions: PageHeaderAction[] = [];

  /** Loading state */
  readonly loading = signal(true);

  /** KPI signals */
  readonly totalPolicies = signal(0);
  readonly publishedPct = signal(0);
  readonly overdueReviews = signal(0);
  readonly pendingApprovals = signal(0);
  readonly ackRate = signal(0);
  readonly activeExceptions = signal(0);

  /** Card data signals */
  readonly pendingApprovalItems = signal<PendingApprovalItem[]>([]);
  readonly overdueReviewItems = signal<OverdueReviewItem[]>([]);
  readonly ackCampaigns = signal<AckCampaign[]>([]);
  readonly expiringExceptions = signal<ExpiringException[]>([]);
  readonly stalePolicies = signal<StalePolicy[]>([]);
  readonly categoryDistribution = signal<CategoryCount[]>([]);
  readonly recentActivity = signal<ActivityItem[]>([]);

  /** Max count for category distribution bar chart */
  readonly maxCategoryCount = computed(() => {
    const dist = this.categoryDistribution();
    return dist.length > 0 ? Math.max(...dist.map((c) => c.count)) : 1;
  });

  ngOnInit(): void {
    this.loadOverview();
  }

  private loadOverview(): void {
    this.loading.set(true);
    this.policyApi
      .getOverviewKPIs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.totalPolicies.set(res.totalPolicies ?? 0);
          this.publishedPct.set(res.publishedPct ?? 0);
          this.overdueReviews.set(res.overdueReviews ?? 0);
          this.pendingApprovals.set(res.pendingApprovals ?? 0);
          this.ackRate.set(res.ackRate ?? 0);
          this.activeExceptions.set(res.activeExceptions ?? 0);
          this.pendingApprovalItems.set(res.pendingApprovalItems ?? []);
          this.overdueReviewItems.set(res.overdueReviewItems ?? []);
          this.ackCampaigns.set(res.ackCampaigns ?? []);
          this.expiringExceptions.set(res.expiringExceptions ?? []);
          this.stalePolicies.set(res.stalePolicies ?? []);
          this.categoryDistribution.set(res.categoryDistribution ?? []);
          this.recentActivity.set(res.recentActivity ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /** Returns a formatted relative time string for activity timestamps */
  formatTimestamp(ts: string): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /** Returns the CSS width percentage for a category bar */
  categoryBarWidth(count: number): string {
    const max = this.maxCategoryCount();
    return `${Math.round((count / max) * 100)}%`;
  }

  /** Maps activity icon names to PrimeNG icon classes */
  activityIconClass(icon: string): string {
    const map: Record<string, string> = {
      approve: 'pi pi-check-circle',
      publish: 'pi pi-send',
      review: 'pi pi-eye',
      create: 'pi pi-plus-circle',
      update: 'pi pi-pencil',
      acknowledge: 'pi pi-verified',
      exception: 'pi pi-exclamation-triangle',
      archive: 'pi pi-inbox',
    };
    return map[icon] ?? 'pi pi-clock';
  }
}
