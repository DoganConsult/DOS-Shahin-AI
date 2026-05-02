/**
 * Controls Mapping & Coverage — Coverage Analysis Dashboard
 *
 * Displays KPI strip for mapping health, and three analysis sections:
 * - Controls with no mapped risks
 * - Obligations with no controls
 * - Risks with weak coverage (with progress bars)
 *
 * @module controls
 * @see ControlCoverageDto for the backend response shape
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { KnobModule } from 'primeng/knob';

import { ControlsApiService } from '../../services/controls-api.service';
import { ControlCoverageDto } from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { KpiCardVM } from '@app/shared/models/module-overview.vm';

@Component({
    selector: 'app-controls-mapping',
    templateUrl: './controls-mapping.component.html',
    styleUrl: './controls-mapping.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        GrcDataTableComponent,
        TableModule,
        SkeletonModule,
        TagModule,
        ProgressBarModule,
        TooltipModule,
        KnobModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        KpiCardGridComponent,
    ]
})
export class ControlsMappingComponent implements OnInit {
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  data = signal<ControlCoverageDto | null>(null);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  // -- KPI Cards -----------------------------------------------------------
  kpis = computed<KpiCardVM[]>(() => {
    const d = this.data();
    if (!d) return [];
    return ([
      {
        id: 'unmapped-controls',
        labelEn: 'Unmapped Controls',
        labelAr: 'ضوابط غير مرتبطة',
        value: d.unmappedControls,
        icon: 'link',
        color: d.unmappedControls > 0 ? 'var(--error)' : 'var(--success)',
        bg: d.unmappedControls > 0
          ? 'color-mix(in srgb, var(--error) 10%, transparent)'
          : 'color-mix(in srgb, var(--success) 10%, transparent)',
        severity: d.unmappedControls > 0 ? 'danger' : 'default',
      },
      {
        id: 'unmapped-obligations',
        labelEn: 'Unmapped Obligations',
        labelAr: 'التزامات غير مغطاة',
        value: d.unmappedObligations,
        icon: 'file',
        color: d.unmappedObligations > 0 ? 'var(--warning)' : 'var(--success)',
        bg: d.unmappedObligations > 0
          ? 'color-mix(in srgb, var(--warning) 10%, transparent)'
          : 'color-mix(in srgb, var(--success) 10%, transparent)',
        severity: d.unmappedObligations > 0 ? 'warning' : 'default',
      },
      {
        id: 'weak-coverage',
        labelEn: 'Weak Coverage Risks',
        labelAr: 'مخاطر بتغطية ضعيفة',
        value: d.weakCoverageRisks,
        icon: 'shield',
        color: d.weakCoverageRisks > 0 ? 'var(--severity-high)' : 'var(--success)',
        bg: d.weakCoverageRisks > 0
          ? 'color-mix(in srgb, var(--severity-high) 10%, transparent)'
          : 'color-mix(in srgb, var(--success) 10%, transparent)',
        severity: d.weakCoverageRisks > 0 ? 'danger' : 'default',
      },
      {
        id: 'duplicates',
        labelEn: 'Duplicate Controls',
        labelAr: 'ضوابط مكررة',
        value: d.duplicateControls,
        icon: 'copy',
        color: d.duplicateControls > 0 ? 'var(--info)' : 'var(--text-muted)',
        bg: d.duplicateControls > 0
          ? 'color-mix(in srgb, var(--info) 10%, transparent)'
          : 'color-mix(in srgb, var(--text-muted) 6%, transparent)',
        severity: 'default',
      },
      {
        id: 'shared-controls',
        labelEn: 'Shared Controls',
        labelAr: 'ضوابط مشتركة',
        value: d.sharedControlUsage,
        icon: 'share-alt',
        color: 'var(--primary)',
        bg: 'color-mix(in srgb, var(--primary) 10%, transparent)',
        severity: 'default',
      },
    ] as any);
  });

  /** Mapping health score for gauge display */
  healthScore = computed(() => this.data()?.mappingHealthScore ?? 0);

  /** Color for health score gauge based on value */
  healthScoreColor = computed(() => {
    const score = this.healthScore();
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--error)';
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getControlCoverage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Coverage score color for progress bar */
  coverageColor(score: number): string {
    if (score >= 70) return 'var(--success)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--error)';
  }

  /** Coverage score severity for status badge */
  coverageSeverity(score: number): string {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'critical';
  }
}
