import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
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
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';

// ── Interfaces ──────────────────────────────────────────────────────────────

/** Reuse map item -- evidence with reuse metadata */
interface ReuseMapItem {
  evidenceId: string;
  title: string;
  type: string;
  reuseCount: number;
  frameworks: string[];
  controls: string[];
  status: string;
  isReusable: boolean;
}

/** Orphan evidence item -- no links */
interface OrphanItem {
  evidenceId: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  owner: string;
}

/** Duplicate candidate pair */
interface DuplicateCandidate {
  candidateId: string;
  titleA: string;
  titleB: string;
  evidenceIdA: string;
  evidenceIdB: string;
  similarity: number;
  detectionMethod: string;
  status: string;
}

/** Reuse statistics */
interface ReuseStats {
  totalReusable: number;
  actuallyReused: number;
  reuseRate: number;
  orphanCount: number;
}

/**
 * Evidence Reuse & Linkage Page -- three-section page for managing evidence
 * reuse, orphan evidence, and duplicate candidates.
 *
 * Section 1: Reuse Map -- evidence items with reuse counts and served frameworks.
 * Section 2: Orphan Evidence -- evidence not linked to any entity.
 * Section 3: Duplicate Candidates -- potential duplicates with merge/dismiss actions.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-reuse',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, KpiCardGridComponent,
        SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent,
        GrcDataTableComponent,
        TableModule, ButtonModule, DropdownModule,
        ToastModule, SkeletonModule, TooltipModule, ConfirmDialogModule,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './evidence-reuse.component.html',
    styleUrls: ['./evidence-reuse.component.scss']
})
export class EvidenceReuseComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(EvidenceApiService);
  private readonly live = inject(GrcLiveService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msg = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── State ──
  loading = signal(true);
  error = signal(false);
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Reuse map data */
  reuseMap = signal<ReuseMapItem[]>([]);

  /** Orphan evidence data */
  orphans = signal<OrphanItem[]>([]);

  /** Duplicate candidates data */
  duplicates = signal<DuplicateCandidate[]>([]);

  /** Aggregated reuse statistics */
  private reuseStats = signal<ReuseStats>({
    totalReusable: 0, actuallyReused: 0, reuseRate: 0, orphanCount: 0,
  });

  /** Framework filter for the reuse map */
  frameworkFilter = '';
  frameworkOptions = signal<{ label: string; value: string }[]>([]);

  /** Page header actions */
  readonly headerActions: PageHeaderAction[] = [
    { id: 'refresh', labelEn: 'Refresh', labelAr: 'تحديث', icon: 'refresh' },
  ];

  /** KPI cards for the top strip */
  kpis = computed<KpiCardVM[]>(() => {
    const s = this.reuseStats();
    return [
      {
        id: 'totalReusable', labelEn: 'Total Reusable', labelAr: 'إجمالي القابلة لإعادة الاستخدام',
        value: s.totalReusable, icon: 'copy', color: 'var(--primary)', bg: 'var(--surface-100)',
        route: '/evidence/reuse',
      },
      {
        id: 'actuallyReused', labelEn: 'Actually Reused', labelAr: 'مُعاد استخدامها فعليا',
        value: s.actuallyReused, icon: 'check-circle', color: 'var(--success)', bg: 'var(--surface-100)',
        route: '/evidence/reuse',
      },
      {
        id: 'reuseRate', labelEn: 'Reuse Rate', labelAr: 'معدل إعادة الاستخدام',
        value: `${s.reuseRate}%`, icon: 'percentage', color: 'var(--info)', bg: 'var(--surface-100)',
        route: '/evidence/reuse',
      },
      {
        id: 'orphanCount', labelEn: 'Orphan Count', labelAr: 'عدد اليتيمة',
        value: s.orphanCount, icon: 'exclamation-triangle', color: 'var(--warning)', bg: 'var(--surface-100)',
        route: '/evidence/reuse', severity: s.orphanCount > 0 ? 'warning' : 'default',
      },
    ];
  });

  /** Filtered reuse map based on framework selection */
  filteredReuseMap = computed(() => {
    const items = this.reuseMap();
    if (!this.frameworkFilter) return items;
    return items.filter(i =>
      i.frameworks.some(f => f.toLowerCase().includes(this.frameworkFilter.toLowerCase()))
    );
  });

  ngOnInit(): void {
    this.loadData();
    this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
  }

  /** Load all three data sets in parallel */
  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      reuse: this.api.getReuseCandidates().pipe(catchError(() => of({ items: [], count: 0 }))),
      orphans: this.api.getOrphans().pipe(catchError(() => of({ items: [], count: 0 }))),
      duplicates: this.api.getDuplicates().pipe(catchError(() => of({ items: [], count: 0 }))),
    }).subscribe({
      next: ({ reuse, orphans, duplicates }) => {
        // Parse reuse candidates
        const reuseData = reuse as Record<string, any>;
        const reuseItems = this.mapReuseItems(reuseData['items'] || reuseData['candidates'] || []);
        this.reuseMap.set(reuseItems);

        // Parse orphans
        const orphanData = orphans as Record<string, any>;
        const orphanItems = this.mapOrphanItems(orphanData['items'] || orphanData['orphans'] || []);
        this.orphans.set(orphanItems);

        // Parse duplicates
        const dupData = duplicates as Record<string, any>;
        const dupItems = this.mapDuplicates(dupData['items'] || dupData['duplicates'] || []);
        this.duplicates.set(dupItems);

        // Build framework filter options from reuse items
        const frameworkSet = new Set<string>();
        reuseItems.forEach(item => item.frameworks.forEach(f => frameworkSet.add(f)));
        this.frameworkOptions.set(
          Array.from(frameworkSet).sort().map(f => ({ label: f, value: f }))
        );

        // Compute statistics
        const totalReusable = reuseItems.filter(i => i.isReusable).length;
        const actuallyReused = reuseItems.filter(i => i.reuseCount > 0).length;
        const reuseRate = totalReusable > 0
          ? Math.round((actuallyReused / totalReusable) * 100)
          : 0;
        this.reuseStats.set({
          totalReusable,
          actuallyReused,
          reuseRate,
          orphanCount: orphanItems.length,
        });

        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Handle page header actions */
  onHeaderAction(id: string): void {
    if (id === 'refresh') this.loadData();
  }

  /** Mark an evidence item as reusable */
  markReusable(evidenceId: string): void {
    this.api.markReusable(evidenceId).pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'success',
          summary: this.isAr() ? 'تم تعيينه كقابل لإعادة الاستخدام' : 'Marked as reusable',
          life: 3000,
        });
        this.loadData();
      } else {
        this.msg.add({
          severity: 'error',
          summary: this.isAr() ? 'فشل العملية' : 'Operation failed',
          life: 3000,
        });
      }
    });
  }

  /** Link orphan evidence to an entity -- navigates to linkage page */
  linkOrphan(evidenceId: string): void {
    this.router.navigate(['/evidence/detail', evidenceId], {
      queryParams: { action: 'link' },
    });
  }

  /** Merge duplicate candidates */
  mergeDuplicate(candidate: DuplicateCandidate): void {
    this.confirm.confirm({
      header: this.isAr() ? 'تأكيد الدمج' : 'Confirm Merge',
      message: this.isAr()
        ? `هل تريد دمج "${candidate.titleA}" مع "${candidate.titleB}"؟`
        : `Merge "${candidate.titleA}" with "${candidate.titleB}"?`,
      accept: () => {
        this.api.resolveDuplicate(candidate.candidateId, 'merged').pipe(
          catchError(() => of(null)),
        ).subscribe(result => {
          if (result) {
            this.msg.add({
              severity: 'success',
              summary: this.isAr() ? 'تم الدمج' : 'Merged successfully',
              life: 3000,
            });
            this.loadData();
          } else {
            this.msg.add({
              severity: 'error',
              summary: this.isAr() ? 'فشل الدمج' : 'Merge failed',
              life: 3000,
            });
          }
        });
      },
    });
  }

  /** Dismiss duplicate candidate */
  dismissDuplicate(candidate: DuplicateCandidate): void {
    this.api.resolveDuplicate(candidate.candidateId, 'dismissed').pipe(
      catchError(() => of(null)),
    ).subscribe(result => {
      if (result) {
        this.msg.add({
          severity: 'info',
          summary: this.isAr() ? 'تم الرفض' : 'Dismissed',
          life: 3000,
        });
        this.loadData();
      }
    });
  }

  /** Navigate to evidence detail */
  viewDetail(evidenceId: string): void {
    this.router.navigate(['/evidence/detail', evidenceId]);
  }

  /** Format snake_case for display */
  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  /** Format similarity score as percentage */
  formatSimilarity(score: number): string {
    if (isNaN(score)) return '--';
    return (score > 1 ? score : score * 100).toFixed(0) + '%';
  }

  /** Get similarity severity class */
  similaritySeverity(score: number): string {
    const pct = score > 1 ? score : score * 100;
    if (pct >= 90) return 'danger';
    if (pct >= 70) return 'warning';
    return 'info';
  }

  // ── Private mapping helpers ─────────────────────────────────────────────────

  private mapReuseItems(raw: any[]): ReuseMapItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((r: Record<string, any>) => ({
      evidenceId: r['evidence_id'] || r['id'] || '',
      title: r['title'] || r['evidence_title'] || '',
      type: r['type'] || r['evidence_type'] || '',
      reuseCount: r['reuse_count'] || r['link_count'] || 0,
      frameworks: this.parseArray(r['frameworks'] || r['framework_codes'] || []),
      controls: this.parseArray(r['controls'] || r['control_refs'] || []),
      status: r['status'] || '',
      isReusable: r['is_reusable'] ?? r['reusable'] ?? false,
    }));
  }

  private mapOrphanItems(raw: any[]): OrphanItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((r: Record<string, any>) => ({
      evidenceId: r['evidence_id'] || r['id'] || '',
      title: r['title'] || r['evidence_title'] || '',
      type: r['type'] || r['evidence_type'] || '',
      status: r['status'] || 'unknown',
      createdAt: r['created_at'] || r['createdUtc'] || '',
      owner: r['owner_name'] || r['owner'] || r['owner_email'] || '',
    }));
  }

  private mapDuplicates(raw: any[]): DuplicateCandidate[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((r: Record<string, any>) => ({
      candidateId: r['candidate_id'] || r['id'] || '',
      titleA: r['title_a'] || r['evidence_a_title'] || '',
      titleB: r['title_b'] || r['evidence_b_title'] || '',
      evidenceIdA: r['evidence_id_a'] || r['id_a'] || '',
      evidenceIdB: r['evidence_id_b'] || r['id_b'] || '',
      similarity: r['similarity_score'] || r['similarity'] || 0,
      detectionMethod: r['detection_method'] || r['method'] || '',
      status: r['status'] || 'pending',
    }));
  }

  /** Parse a value that might be a JSON string array or an actual array */
  private parseArray(val: any): string[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val ? [val] : []; }
    }
    return [];
  }
}
