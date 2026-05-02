import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService } from '../../services/asset-api.service';
import { SkeletonLoaderComponent} from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-reports',
    imports: [CommonModule, SkeletonLoaderComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--green-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--green-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .report-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .report-card { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; cursor: pointer; transition: box-shadow 0.2s; }
    .report-card:hover { box-shadow: 0 4px 12px rgba(var(--color-black-rgb), 0.08); }
    .report-title { font-size: var(--font-size-md); font-weight: 600; margin-bottom: 8px; }
    .report-desc { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
    .report-status { margin-top: 12px; font-size: var(--font-size-sm); padding: 4px 10px; border-radius: var(--radius); display: inline-block; }
    .loaded { background: var(--green-50); color: var(--green-700); }
    .pending { background: var(--surface-100); color: var(--text-color-secondary); }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-chart-bar"></i></div>
        <div><h1>Asset Reports</h1><p class="subtitle">Coverage, aging, orphan, and classification reports</p></div>
      </header>

      @if (loading()) {
        <app-skeleton-loader [rows]="4" />
      } @else {
        <div class="report-grid">
          <div class="report-card" (click)="loadReport('coverage')">
            <div class="report-title">Coverage Report</div>
            <div class="report-desc">Control and risk coverage across assets</div>
            <span class="report-status" [class]="coverageData() ? 'loaded' : 'pending'">{{ coverageData() ? 'Loaded' : 'Click to load' }}</span>
          </div>
          <div class="report-card" (click)="loadReport('aging')">
            <div class="report-title">Aging Report</div>
            <div class="report-desc">Assets approaching end-of-life or overdue maintenance</div>
            <span class="report-status" [class]="agingData() ? 'loaded' : 'pending'">{{ agingData() ? 'Loaded' : 'Click to load' }}</span>
          </div>
          <div class="report-card" (click)="loadReport('orphan')">
            <div class="report-title">Orphan Report</div>
            <div class="report-desc">Assets with no linked controls, risks, or owners</div>
            <span class="report-status" [class]="orphanData() ? 'loaded' : 'pending'">{{ orphanData() ? 'Loaded' : 'Click to load' }}</span>
          </div>
          <div class="report-card" (click)="loadReport('dashboard')">
            <div class="report-title">Dashboard Summary</div>
            <div class="report-desc">Aggregated asset governance dashboard data</div>
            <span class="report-status" [class]="dashboardData() ? 'loaded' : 'pending'">{{ dashboardData() ? 'Loaded' : 'Click to load' }}</span>
          </div>
        </div>
      }
    </div>
  `
})
export class AssetReportsComponent {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(false);
  coverageData = signal<Record<string, unknown> | null>(null);
  agingData = signal<Record<string, unknown> | null>(null);
  orphanData = signal<Record<string, unknown> | null>(null);
  dashboardData = signal<Record<string, unknown> | null>(null);

  loadReport(type: string): void {
    const apiMap: Record<string, () => ReturnType<typeof this.api.getCoverageReport>> = {
      coverage: () => this.api.getCoverageReport(),
      aging: () => this.api.getAgingReport(),
      orphan: () => this.api.getOrphanReport(),
      dashboard: () => this.api.getDashboardSummary(),
    };
    const signalMap: Record<string, typeof this.coverageData> = {
      coverage: this.coverageData,
      aging: this.agingData,
      orphan: this.orphanData,
      dashboard: this.dashboardData,
    };
    apiMap[type]().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => signalMap[type].set(data),
      error: () => {},
    });
  }
}
