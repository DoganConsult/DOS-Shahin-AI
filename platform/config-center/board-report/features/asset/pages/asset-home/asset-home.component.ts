import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, AssetHomeKpis } from '../../services/asset-api.service';
import { SkeletonLoaderComponent, EmptyStateComponent } from '@app/shared/components';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-home',
    imports: [CommonModule, SkeletonLoaderComponent, EmptyStateComponent, ModuleOverviewKitComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--cyan-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--cyan-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; text-align: center; }
    .kpi-value { font-size: var(--font-size-4xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { background: var(--surface-card); border-radius: var(--radius-lg); border: 1px solid var(--surface-border); padding: 20px; margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }
    .dist-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-base); }
    .dist-row:last-child { border-bottom: none; }
    .dist-label { text-transform: capitalize; }
    .dist-value { font-weight: 600; }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="icon-wrap"><i class="pi pi-server"></i></div>
        <div><h1>Assets & IT Governance</h1><p class="subtitle">Enterprise asset truth layer — systems, services, dependencies</p></div>
      </header>

      @if (loading()) {
        <app-skeleton-loader [rows]="4" />
      } @else if (kpis()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ kpis()!.totalAssets }}</div><div class="kpi-label">Total Assets</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ kpis()!.totalApplications }}</div><div class="kpi-label">Applications</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ kpis()!.totalServices }}</div><div class="kpi-label">Business Services</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ kpis()!.criticalAssets }}</div><div class="kpi-label">Critical Assets</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--orange-500)">{{ kpis()!.unownedAssets }}</div><div class="kpi-label">Unowned</div></div>
        </div>

        <div class="section">
          <h3 class="section-title">Criticality Breakdown</h3>
          @for (entry of objectEntries(kpis()!.criticalityBreakdown); track entry[0]) {
            <div class="dist-row"><span class="dist-label">{{ entry[0] }}</span><span class="dist-value">{{ entry[1] }}</span></div>
          }
        </div>

        <div class="section">
          <h3 class="section-title">Classification Distribution</h3>
          @for (entry of objectEntries(kpis()!.classificationDistribution); track entry[0]) {
            <div class="dist-row"><span class="dist-label">{{ entry[0] }}</span><span class="dist-value">{{ entry[1] }}</span></div>
          }
        </div>

        <div class="section">
          <h3 class="section-title">Lifecycle Distribution</h3>
          @for (entry of objectEntries(kpis()!.lifecycleDistribution); track entry[0]) {
            <div class="dist-row"><span class="dist-label">{{ entry[0] }}</span><span class="dist-value">{{ entry[1] }}</span></div>
          }
        </div>
      } @else {
        <app-empty-state title="No Data" message="No asset data available yet." icon="pi-server" />
      }

      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `
})
export class AssetHomeComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  readonly assetAgents: AgentInfo[] = [];

  readonly assetTransitions = [
    { from: 'discovered', to: 'classified' },
    { from: 'classified', to: 'managed' },
    { from: 'managed', to: 'review_due' },
    { from: 'review_due', to: 'managed' },
    { from: 'managed', to: 'decommissioning' },
    { from: 'decommissioning', to: 'decommissioned' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'asset',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 168,
    transitions: this.assetTransitions,
    currentStatus: 'managed',
    agents: this.assetAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  loading = signal(true);
  kpis = signal<AssetHomeKpis | null>(null);

  ngOnInit(): void {
    this.api.getHomeKpis().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { this.kpis.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  objectEntries(obj: Record<string, number>): [string, number][] {
    return Object.entries(obj || {});
  }
}
