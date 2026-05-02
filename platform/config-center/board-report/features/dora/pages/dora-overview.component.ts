import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

interface DoraKpi { ictAssets: number; majorIncidents: number; resilienceTests: number; threatIntelFeeds: number; backupCoverage: number; openFindings: number; }

@Component({
    selector: 'app-dora-overview',
    imports: [CommonModule, RouterModule, ModuleOverviewKitComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.overview') || 'DORA Dashboard' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.overviewDesc') || 'Digital Operational Resilience Act — ICT risk management, incident reporting, resilience testing, and third-party oversight.' }}</p>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card" routerLink="/dora/ict-assets"><span class="kpi-value">{{ kpis().ictAssets }}</span><span class="kpi-label">ICT Assets</span></div>
        <div class="kpi-card kpi-danger" routerLink="/dora/major-incidents"><span class="kpi-value">{{ kpis().majorIncidents }}</span><span class="kpi-label">Major Incidents</span></div>
        <div class="kpi-card kpi-info" routerLink="/dora/resilience-tests"><span class="kpi-value">{{ kpis().resilienceTests }}</span><span class="kpi-label">Resilience Tests</span></div>
        <div class="kpi-card" routerLink="/dora/threat-intel"><span class="kpi-value">{{ kpis().threatIntelFeeds }}</span><span class="kpi-label">Threat Intel Feeds</span></div>
        <div class="kpi-card kpi-success" routerLink="/dora/backups"><span class="kpi-value">{{ kpis().backupCoverage }}%</span><span class="kpi-label">Backup Coverage</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ kpis().openFindings }}</span><span class="kpi-label">Open Findings</span></div>
      </div>
      <div class="section-grid">
        <div class="section-card">
          <h3>{{ i18n.translate('dora.pillars') || 'DORA Pillars' }}</h3>
          <div class="pillar-list">
            <div class="pillar-item"><span class="pillar-num">I</span><span class="pillar-name">ICT Risk Management</span><span class="pillar-badge pillar-active">Active</span></div>
            <div class="pillar-item"><span class="pillar-num">II</span><span class="pillar-name">ICT Incident Reporting</span><span class="pillar-badge pillar-active">Active</span></div>
            <div class="pillar-item"><span class="pillar-num">III</span><span class="pillar-name">Digital Resilience Testing</span><span class="pillar-badge pillar-active">Active</span></div>
            <div class="pillar-item"><span class="pillar-num">IV</span><span class="pillar-name">Third-Party Risk Management</span><span class="pillar-badge pillar-pending">Pending</span></div>
            <div class="pillar-item"><span class="pillar-num">V</span><span class="pillar-name">Information Sharing</span><span class="pillar-badge pillar-pending">Pending</span></div>
          </div>
        </div>
        <div class="section-card">
          <h3>{{ i18n.translate('dora.quickActions') || 'Quick Actions' }}</h3>
          <div class="action-list">
            <a routerLink="/dora/ict-assets" class="action-link"><i class="pi pi-server"></i> Manage ICT Assets</a>
            <a routerLink="/dora/major-incidents" class="action-link"><i class="pi pi-exclamation-triangle"></i> Report Incident</a>
            <a routerLink="/dora/resilience-tests" class="action-link"><i class="pi pi-bolt"></i> Schedule Test</a>
            <a routerLink="/dora/threat-intel" class="action-link"><i class="pi pi-eye"></i> Threat Intelligence</a>
            <a routerLink="/dora/backups" class="action-link"><i class="pi pi-database"></i> Backup Status</a>
          </div>
        </div>
      </div>

      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-danger .kpi-value { color: var(--red-500); } .kpi-info .kpi-value { color: var(--blue-500); }
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-warning .kpi-value { color: var(--yellow-600); }
    .section-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .section-card h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); font-weight: 600; }
    .pillar-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .pillar-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius); background: var(--surface-ground); }
    .pillar-num { font-weight: 700; color: var(--primary-500); min-width: 24px; }
    .pillar-name { flex: 1; font-size: var(--font-size-base); }
    .pillar-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; }
    .pillar-active { background: var(--green-50); color: var(--green-700); }
    .pillar-pending { background: var(--yellow-50); color: var(--yellow-700); }
    .action-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .action-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: var(--radius); color: var(--text-color); text-decoration: none; transition: background 0.15s; font-size: var(--font-size-base); }
    .action-link:hover { background: var(--surface-hover); }
    .action-link i { color: var(--primary-500); }
  `]
})
export class DoraOverviewComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly kpis = signal<DoraKpi>({ ictAssets: 0, majorIncidents: 0, resilienceTests: 0, threatIntelFeeds: 0, backupCoverage: 0, openFindings: 0 });

  readonly doraAgents: AgentInfo[] = [];

  readonly doraTransitions = [
    { from: 'identified', to: 'assessed' },
    { from: 'assessed', to: 'mitigating' },
    { from: 'mitigating', to: 'tested' },
    { from: 'tested', to: 'compliant', requiresApproval: true },
    { from: 'compliant', to: 'review_due' },
    { from: 'review_due', to: 'assessed' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'compliance',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 168,
    transitions: this.doraTransitions,
    currentStatus: 'assessed',
    agents: this.doraAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  ngOnInit(): void {
    this.http.get<any>('/api/dora/kpis').subscribe({ next: (d) => this.kpis.set(d), error: () => {} });
  }
}
