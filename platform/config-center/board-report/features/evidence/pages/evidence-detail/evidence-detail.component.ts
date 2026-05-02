import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
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

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';

// ── Status lifecycle transitions ──────────────────────────────────────────────
const EVIDENCE_TRANSITIONS: Record<string, string[]> = {
  pending: ['collected', 'expired'],
  collected: ['under_review', 'expired'],
  under_review: ['approved', 'rejected'],
  approved: ['expired'],
  rejected: ['collected'],
  expired: ['collected'],
};

/** Quality dimension with score */
interface QualityDimension {
  key: string;
  labelEn: string;
  labelAr: string;
  score: number;
  maxScore: number;
}

type DetailTab = 'overview' | 'files' | 'provenance' | 'quality' | 'links' | 'history' | 'reuse' | 'packages';

/**
 * Evidence Detail Page -- full evidence record view with tabs for overview,
 * files/versions, provenance timeline, quality assessment, linked entities,
 * and status history. Includes right-rail quick actions.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-detail',
    imports: [
        CommonModule, FormsModule, KpiCardGridComponent,
        SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent,
        GrcDataTableComponent,
        TableModule, ButtonModule, DropdownModule, ProgressBarModule,
        ToastModule, SkeletonModule, TooltipModule,
    ],
    providers: [MessageService],
    templateUrl: './evidence-detail.component.html',
    styleUrls: ['./evidence-detail.component.scss']
})
export class EvidenceDetailComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(EvidenceApiService);
  private readonly live = inject(GrcLiveService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msg = inject(MessageService);

  // ── State ──
  loading = signal(true);
  error = signal(false);
  activeTab = signal<DetailTab>('overview');

  /** Full evidence record */
  evidence = signal<Record<string, any> | null>(null);
  /** Status change history */
  statusHistory = signal<Record<string, any>[]>([]);
  /** Freshness verification events */
  freshnessHistory = signal<Record<string, any> | null>(null);
  /** Reuse links for this evidence item */
  reuseLinks = signal<Record<string, any>[]>([]);
  /** Package memberships for this evidence item */
  packageMemberships = signal<Record<string, any>[]>([]);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Pending status transition value */
  pendingStatusChange: string | null = null;

  // ── Computed helpers ──

  title = computed(() => {
    const ev = this.evidence();
    if (!ev) return '';
    return ev['title'] || ev['evidence_title'] || ev['entity_name'] || '';
  });

  code = computed(() => {
    const ev = this.evidence();
    return ev?.['evidence_code'] || ev?.['code'] || ev?.['evidence_id'] || '';
  });

  status = computed(() => this.evidence()?.['status'] || 'unknown');

  evidenceType = computed(() =>
    this.evidence()?.['evidence_type_code'] || this.evidence()?.['type'] || this.evidence()?.['evidence_type'] || 'unknown'
  );

  freshnessBadge = computed(() => {
    const fr = this.evidence()?.['freshnessRecord'] || this.evidence()?.['freshness'];
    if (!fr) return 'unknown';
    return fr['freshness_status'] || fr['status'] || 'unknown';
  });

  qualityBadge = computed(() => {
    const ev = this.evidence();
    return ev?.['quality_status'] || ev?.['quality_tier'] || ev?.['quality'] || 'unknown';
  });

  ownerName = computed(() => {
    const ev = this.evidence();
    return ev?.['owner_name'] || ev?.['owner'] || ev?.['owner_email'] || '--';
  });

  description = computed(() => this.evidence()?.['description'] || '');

  // ── KPI Metrics ──

  linkCount = computed(() =>
    this.evidence()?.['link_count'] ?? this.evidence()?.['links']?.length ?? this.evidenceLinks().length
  );
  obligationCount = computed(() =>
    this.evidence()?.['obligation_count'] ?? 0
  );
  auditCount = computed(() =>
    this.evidence()?.['audit_count'] ?? 0
  );
  reuseCount = computed(() =>
    this.evidence()?.['reuse_count'] ?? 0
  );
  lastReviewDate = computed(() =>
    this.evidence()?.['last_review_date'] || this.evidence()?.['last_reviewed_at'] || null
  );

  kpis = computed<KpiCardVM[]>(() => {
    const ev = this.evidence();
    if (!ev) return [];
    return [
      {
        id: 'controls', labelEn: 'Linked Controls', labelAr: 'الضوابط المرتبطة',
        value: this.linkCount(), icon: 'link', color: 'var(--primary)', bg: 'var(--surface-100)',
        route: '/evidence/catalog/' + (ev?.['evidence_id'] || ''),
      },
      {
        id: 'obligations', labelEn: 'Linked Obligations', labelAr: 'الالتزامات المرتبطة',
        value: this.obligationCount(), icon: 'file', color: 'var(--info)', bg: 'var(--surface-100)',
        route: '/evidence/reuse',
      },
      {
        id: 'audits', labelEn: 'Linked Audits', labelAr: 'التدقيقات المرتبطة',
        value: this.auditCount(), icon: 'search', color: 'var(--warning)', bg: 'var(--surface-100)',
        route: '/evidence/reuse',
      },
      {
        id: 'reuse', labelEn: 'Reuse Count', labelAr: 'عدد إعادة الاستخدام',
        value: this.reuseCount(), icon: 'copy', color: 'var(--success)', bg: 'var(--surface-100)',
        route: '/evidence/reuse',
      },
    ];
  });

  /** Reviews list extracted from evidence record */
  reviews = computed(() => {
    const ev = this.evidence();
    return (ev?.['reviews'] || []) as Record<string, any>[];
  });

  /** Evidence links for the Linked Entities tab */
  evidenceLinks = computed(() => {
    const ev = this.evidence();
    return (ev?.['links'] || ev?.['evidence_links'] || []) as Record<string, any>[];
  });

  /** Files/attachments */
  files = computed(() => {
    const ev = this.evidence();
    return (ev?.['files'] || ev?.['attachments'] || ev?.['versions'] || []) as Record<string, any>[];
  });

  /** Provenance events */
  provenanceEvents = computed(() => {
    const ev = this.evidence();
    return (ev?.['provenance'] || ev?.['provenance_events'] || ev?.['audit_trail'] || []) as Record<string, any>[];
  });

  /** Quality dimensions */
  qualityDimensions = computed<QualityDimension[]>(() => {
    const ev = this.evidence();
    if (!ev) return [];
    const q = ev['quality_dimensions'] || ev['quality_scores'] || {};

    // Standard quality dimensions -- pull from API or provide structured defaults
    const dims: QualityDimension[] = [
      {
        key: 'freshness', labelEn: 'Freshness', labelAr: 'الحداثة',
        score: q['freshness'] ?? q['freshness_score'] ?? 0, maxScore: 100,
      },
      {
        key: 'completeness', labelEn: 'Completeness', labelAr: 'الاكتمال',
        score: q['completeness'] ?? q['completeness_score'] ?? 0, maxScore: 100,
      },
      {
        key: 'sourceReliability', labelEn: 'Source Reliability', labelAr: 'موثوقية المصدر',
        score: q['source_reliability'] ?? q['sourceReliability'] ?? 0, maxScore: 100,
      },
      {
        key: 'reviewerSignOff', labelEn: 'Reviewer Sign-Off', labelAr: 'موافقة المراجع',
        score: q['reviewer_sign_off'] ?? q['reviewerSignOff'] ?? 0, maxScore: 100,
      },
      {
        key: 'formatMatch', labelEn: 'Format Match', labelAr: 'تطابق الصيغة',
        score: q['format_match'] ?? q['formatMatch'] ?? 0, maxScore: 100,
      },
    ];
    return dims;
  });

  /** Overall quality score (average of all dimensions) */
  overallQualityScore = computed(() => {
    const dims = this.qualityDimensions();
    if (dims.length === 0) return 0;
    const total = dims.reduce((sum, d) => sum + d.score, 0);
    return Math.round(total / dims.length);
  });

  /** Whether quality data is empty (no dimensions or all scores zero) */
  noQualityData = computed(() => {
    const dims = this.qualityDimensions();
    return dims.length === 0 || dims.every(d => d.score === 0);
  });

  /** Freshness record */
  freshnessRecord = computed(() => {
    const ev = this.evidence();
    return ev?.['freshnessRecord'] || ev?.['freshness'] || null;
  });

  /** Verification events from freshness history */
  verificationEvents = computed(() => {
    const fh = this.freshnessHistory();
    if (!fh) return [];
    return (fh['events'] || fh['verifications'] || []) as Record<string, any>[];
  });

  /** Available status transitions based on current status */
  availableTransitions = computed(() => {
    const currentStatus = this.status();
    const transitions = EVIDENCE_TRANSITIONS[currentStatus] || [];
    return transitions.map((s: string) => ({ label: this.formatStatus(s), value: s }));
  });

  /** Tab definitions for the tab bar */
  readonly tabs: { id: DetailTab; labelEn: string; labelAr: string; icon: string }[] = [
    { id: 'overview',    labelEn: 'Overview',            labelAr: 'نظرة عامة',         icon: 'pi-file' },
    { id: 'files',       labelEn: 'Files & Versions',    labelAr: 'الملفات والنسخ',    icon: 'pi-folder' },
    { id: 'provenance',  labelEn: 'Provenance Timeline', labelAr: 'مسار المصدر',       icon: 'pi-clock' },
    { id: 'quality',     labelEn: 'Quality Assessment',  labelAr: 'تقييم الجودة',      icon: 'pi-star' },
    { id: 'links',       labelEn: 'Linked Entities',     labelAr: 'الكيانات المرتبطة', icon: 'pi-link' },
    { id: 'history',     labelEn: 'Status History',      labelAr: 'سجل الحالة',        icon: 'pi-history' },
    { id: 'reuse',       labelEn: 'Reuse History',       labelAr: 'سجل إعادة الاستخدام', icon: 'pi-copy' },
    { id: 'packages',    labelEn: 'Packages',            labelAr: 'الحزم',             icon: 'pi-box' },
  ];

  /** Page header actions */
  headerActions = computed<PageHeaderAction[]>(() => [
    { id: 'back', labelEn: 'Back', labelAr: 'رجوع', icon: 'arrow-left' },
    { id: 'refresh', labelEn: 'Refresh', labelAr: 'تحديث', icon: 'refresh' },
  ]);

  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadData(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Load all evidence detail data in parallel */
  private loadData(id: string): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      detail: this.api.getEvidenceDetail(id).pipe(catchError(() => of(null))),
      history: this.api.getEvidenceHistory(id).pipe(catchError(() => of([]))),
      freshness: this.api.getFreshnessHistory(id).pipe(catchError(() => of(null))),
      links: this.api.getEvidenceLinksForItem(id).pipe(catchError(() => of(null))),
      packages: this.api.listPackages({ evidenceId: id }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ detail, history, freshness, links, packages }) => {
        if (!detail) {
          this.error.set(true);
        } else {
          // Merge links into the detail record if fetched separately
          if (links) {
            const linksData = links as Record<string, any>;
            const linksArray = linksData['links'] || linksData['items'] || [];
            detail = { ...detail, links: linksArray };

            // Extract reuse-type links for the Reuse History tab
            const allLinks = Array.isArray(linksArray) ? linksArray : [];
            const reuse = allLinks.filter((l: Record<string, any>) =>
              l['link_type'] === 'reuse' || l['link_type'] === 'cross_map' || l['is_reuse']
            );
            this.reuseLinks.set(reuse);
          } else {
            this.reuseLinks.set([]);
          }

          // Parse package memberships
          if (packages) {
            const pkgData = packages as Record<string, any>;
            const pkgArray = pkgData['packages'] || pkgData['items'] || (Array.isArray(packages) ? packages : []);
            this.packageMemberships.set(pkgArray);
          } else {
            this.packageMemberships.set([]);
          }

          this.evidence.set(detail);
          this.statusHistory.set(Array.isArray(history) ? history : []);
          this.freshnessHistory.set(freshness);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Switch active tab */
  selectTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  /** Handle page header actions */
  onHeaderAction(id: string): void {
    if (id === 'back') {
      this.router.navigate(['/evidence/overview']);
    } else if (id === 'refresh') {
      this.retry();
    }
  }

  /** Retry loading data */
  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadData(id);
  }

  /** Transition evidence status */
  onStatusTransition(newStatus: string | null): void {
    if (!newStatus) return;
    const ev = this.evidence();
    if (!ev) return;
    const id = ev['evidence_id'] || ev['id'];

    this.api.transitionStatus(id, newStatus).pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.isAr()
            ? `تم تغيير الحالة إلى ${this.formatStatus(newStatus)}`
            : `Status changed to ${this.formatStatus(newStatus)}`,
          life: 3000,
        });
        this.pendingStatusChange = null;
        this.loadData(id);
      } else {
        this.msg.add({
          severity: 'error',
          summary: this.isAr() ? 'فشل تغيير الحالة' : 'Status change failed',
          life: 3000,
        });
      }
    });
  }

  /** Mark evidence as reusable */
  markReusable(): void {
    const ev = this.evidence();
    if (!ev) return;
    const id = ev['evidence_id'] || ev['id'];

    this.api.markReusable(id).pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.isAr() ? 'تم تعيينه كقابل لإعادة الاستخدام' : 'Marked as reusable',
          life: 3000,
        });
        this.loadData(id);
      }
    });
  }

  /** Link evidence to another entity */
  linkEntity(): void {
    const ev = this.evidence();
    if (!ev) return;
    // Navigate to the linkage page with pre-selected evidence
    const id = ev['evidence_id'] || ev['id'];
    this.router.navigate(['/evidence/reuse'], { queryParams: { evidenceId: id } });
  }

  /** Navigate to the packages page to add this evidence to a package */
  addToPackage(): void {
    const ev = this.evidence();
    if (!ev) return;
    const id = ev['evidence_id'] || ev['id'];
    this.router.navigate(['/evidence/packages'], { queryParams: { evidenceId: id } });
  }

  /** Navigate to a specific package detail page */
  navigateToPackage(packageId: string): void {
    if (!packageId) return;
    this.router.navigate(['/evidence/packages', packageId]);
  }

  /** Format snake_case status for display */
  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  /** Get freshness severity class */
  freshnessSeverity(status: string): string {
    const map: Record<string, string> = {
      current: 'success',
      fresh: 'success',
      stale: 'warning',
      expired: 'danger',
    };
    return map[status?.toLowerCase()] || 'info';
  }

  /** Get quality score severity for progress bar */
  qualityScoreSeverity(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  }

  /** Get quality score color token */
  qualityScoreColor(score: number): string {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--error)';
  }

  /** Format file size */
  formatFileSize(bytes: number | string | undefined): string {
    if (!bytes) return '--';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return '--';
    if (num < 1024) return `${num} B`;
    if (num < 1048576) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / 1048576).toFixed(1)} MB`;
  }
}
