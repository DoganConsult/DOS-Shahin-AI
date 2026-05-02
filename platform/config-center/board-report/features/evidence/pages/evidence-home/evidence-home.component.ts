import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EvidenceApiService } from '../../services/evidence-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';

/** Shape returned by api.getHomeWidgets() */
interface HomeWidgets {
  totalActive: number;
  openRequests: number;
  overdueRequests: number;
  pendingReview: number;
  rejectedEvidence: number;
  staleEvidence: number;
  expiringThisMonth: number;
  reuseRate: number;
  automationRate: number;
  totalPackages: number;
}

/** Shape returned by api.getEvidenceByStatus() */
interface StatusBreakdown {
  status: string;
  count: number;
}

/** Shape returned by api.getRecentActivity() */
interface ActivityItem {
  id: string;
  action: string;
  entityName: string;
  actor: string;
  timestamp: string;
}

/** KPI metric card definition */
interface KpiCard {
  labelEn: string;
  labelAr: string;
  value: number;
  suffix?: string;
  colorVar: string;
  icon: string;
}

/**
 * Evidence Home — command center dashboard with KPIs, status breakdown, and activity feed.
 *
 * Displays aggregated evidence metrics, status distribution table,
 * and recent activity stream for quick operational awareness.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-home',
    imports: [
        CommonModule,
        SkeletonLoaderComponent,
        EmptyStateComponent,
        StatusBadgeComponent,
    ],
    templateUrl: './evidence-home.component.html',
    styleUrls: ['./evidence-home.component.scss']
})
export class EvidenceHomeComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private api = inject(EvidenceApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal(false);
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  widgets = signal<HomeWidgets | null>(null);
  statusBreakdown = signal<StatusBreakdown[]>([]);
  recentActivity = signal<ActivityItem[]>([]);

  /** Primary KPI row (5 columns) */
  primaryKpis = computed<KpiCard[]>(() => {
    const w = this.widgets();
    if (!w) return [];
    return [
      { labelEn: 'Total Active Evidence', labelAr: 'الأدلة النشطة', value: w.totalActive, colorVar: '--primary', icon: 'pi-folder-open' },
      { labelEn: 'Open Requests', labelAr: 'طلبات مفتوحة', value: w.openRequests, colorVar: '--info', icon: 'pi-inbox' },
      { labelEn: 'Overdue Requests', labelAr: 'طلبات متأخرة', value: w.overdueRequests, colorVar: '--error', icon: 'pi-clock' },
      { labelEn: 'Pending Review', labelAr: 'بانتظار المراجعة', value: w.pendingReview, colorVar: '--warning', icon: 'pi-eye' },
      { labelEn: 'Stale / Expiring', labelAr: 'قديمة / تنتهي قريبا', value: w.staleEvidence + w.expiringThisMonth, colorVar: '--warning', icon: 'pi-exclamation-triangle' },
    ];
  });

  /** Secondary KPI row (3 columns) */
  secondaryKpis = computed<KpiCard[]>(() => {
    const w = this.widgets();
    if (!w) return [];
    return [
      { labelEn: 'Reuse Rate', labelAr: 'نسبة إعادة الاستخدام', value: w.reuseRate, suffix: '%', colorVar: '--success', icon: 'pi-replay' },
      { labelEn: 'Automation Rate', labelAr: 'نسبة الأتمتة', value: w.automationRate, suffix: '%', colorVar: '--info', icon: 'pi-bolt' },
      { labelEn: 'Total Packages', labelAr: 'إجمالي الحزم', value: w.totalPackages, colorVar: '--primary', icon: 'pi-box' },
    ];
  });

  ngOnInit(): void {
    this.load();
    this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      widgets: this.api.getHomeWidgets().pipe(catchError(() => of(null))),
      byStatus: this.api.getEvidenceByStatus().pipe(catchError(() => of([]))),
      activity: this.api.getRecentActivity(10).pipe(catchError(() => of(null))),
    }).subscribe({
      next: (res) => {
        if (res.widgets) {
          this.widgets.set(res.widgets as unknown as HomeWidgets);
        } else {
          this.error.set(true);
        }

        // Status breakdown
        const raw = Array.isArray(res.byStatus) ? res.byStatus : [];
        this.statusBreakdown.set(
          raw.map((r) => ({
            status: (r['status'] as string) || 'unknown',
            count: (r['count'] as number) || 0,
          }))
        );

        // Activity feed
        const act = res.activity as Record<string, any> | null;
        const items = Array.isArray(act) ? act : (act?.['items'] as unknown[] || []);
        this.recentActivity.set(
          (items as Record<string, any>[]).slice(0, 10).map((a) => ({
            id: (a['id'] as string) || String(Math.random()),
            action: (a['action'] as string) || (a['event_type'] as string) || '',
            entityName: (a['entity_name'] as string) || (a['title'] as string) || '',
            actor: (a['actor'] as string) || (a['actor_email'] as string) || '',
            timestamp: (a['timestamp'] as string) || (a['created_at'] as string) || '',
          }))
        );

        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Format a timestamp for display */
  formatTime(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(this.isAr() ? 'ar-SA' : 'en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
}
