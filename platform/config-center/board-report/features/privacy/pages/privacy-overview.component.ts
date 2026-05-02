import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

interface PrivacyKpi {
  totalRecords: number;
  dpiaCount: number;
  activeBreaches: number;
  consentRate: number;
  dataSubjectRequests: number;
  processingActivities: number;
}

@Component({
    selector: 'app-privacy-overview',
    imports: [CommonModule, RouterModule, ModuleOverviewKitComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.overview') || 'Privacy Program Overview' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.overviewDesc') || 'PDPL & GDPR compliance posture, data processing activities, and privacy risk dashboard.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" routerLink="/privacy/processing-register">
          <span class="kpi-value">{{ kpis().processingActivities }}</span>
          <span class="kpi-label">{{ i18n.translate('privacy.processingActivities') || 'Processing Activities' }}</span>
        </div>
        <div class="kpi-card" routerLink="/privacy/dpia">
          <span class="kpi-value">{{ kpis().dpiaCount }}</span>
          <span class="kpi-label">{{ i18n.translate('privacy.dpias') || 'DPIAs' }}</span>
        </div>
        <div class="kpi-card kpi-danger" routerLink="/privacy/breach-notification">
          <span class="kpi-value">{{ kpis().activeBreaches }}</span>
          <span class="kpi-label">{{ i18n.translate('privacy.activeBreaches') || 'Active Breaches' }}</span>
        </div>
        <div class="kpi-card kpi-info" routerLink="/privacy/data-subjects">
          <span class="kpi-value">{{ kpis().dataSubjectRequests }}</span>
          <span class="kpi-label">{{ i18n.translate('privacy.dsrRequests') || 'DSR Requests' }}</span>
        </div>
        <div class="kpi-card kpi-success" routerLink="/privacy/consent">
          <span class="kpi-value">{{ kpis().consentRate }}%</span>
          <span class="kpi-label">{{ i18n.translate('privacy.consentRate') || 'Consent Rate' }}</span>
        </div>
      </div>

      <div class="section-grid">
        <div class="section-card">
          <h3>{{ i18n.translate('privacy.quickActions') || 'Quick Actions' }}</h3>
          <div class="action-list">
            <a routerLink="/privacy/processing-register" class="action-link"><i class="pi pi-list"></i> {{ i18n.translate('privacy.viewRegister') || 'View Processing Register' }}</a>
            <a routerLink="/privacy/dpia" class="action-link"><i class="pi pi-shield"></i> {{ i18n.translate('privacy.startDpia') || 'Start New DPIA' }}</a>
            <a routerLink="/privacy/breach-notification" class="action-link"><i class="pi pi-exclamation-triangle"></i> {{ i18n.translate('privacy.reportBreach') || 'Report Breach' }}</a>
            <a routerLink="/privacy/data-subjects" class="action-link"><i class="pi pi-users"></i> {{ i18n.translate('privacy.manageDsr') || 'Manage DSR' }}</a>
            <a routerLink="/privacy/consent" class="action-link"><i class="pi pi-check-circle"></i> {{ i18n.translate('privacy.manageConsent') || 'Manage Consent' }}</a>
          </div>
        </div>
        <div class="section-card">
          <h3>{{ i18n.translate('privacy.complianceFrameworks') || 'Compliance Frameworks' }}</h3>
          <div class="framework-list">
            <div class="framework-item"><span class="fw-name">PDPL (KSA)</span><span class="fw-badge fw-active">Active</span></div>
            <div class="framework-item"><span class="fw-name">GDPR (EU)</span><span class="fw-badge fw-active">Active</span></div>
            <div class="framework-item"><span class="fw-name">CCPA (US)</span><span class="fw-badge fw-pending">Pending</span></div>
          </div>
        </div>
      </div>

      <app-module-overview-kit [config]="moduleKitConfig()" />
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; }
    .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 1.25rem; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-card:hover { box-shadow: var(--shadow-sm); border-color: var(--primary-200, #93c5fd); transform: translateY(-1px); }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500, #3b82f6); }
    .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-danger .kpi-value { color: var(--red-500, #ef4444); }
    .kpi-info .kpi-value { color: var(--blue-500, #3b82f6); }
    .kpi-success .kpi-value { color: var(--green-500, #22c55e); }
    .section-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 1.25rem; }
    .section-card h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); font-weight: 600; color: var(--text-color); }
    .action-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .action-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md, 8px); color: var(--text-color); text-decoration: none; transition: background 0.15s; font-size: var(--font-size-base); }
    .action-link:hover { background: var(--surface-hover); }
    .action-link i { color: var(--primary-500, #3b82f6); font-size: var(--font-size-md); }
    .framework-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .framework-item { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-radius: var(--radius-md, 8px); background: var(--surface-ground); }
    .fw-name { font-size: var(--font-size-base); font-weight: 500; color: var(--text-color); }
    .fw-badge { font-size: var(--font-size-sm); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; }
    .fw-active { background: var(--green-50, #f0fdf4); color: var(--green-700, #15803d); }
    .fw-pending { background: var(--yellow-50, #fefce8); color: var(--yellow-700, #a16207); }
  `]
})
export class PrivacyOverviewComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly kpis = signal<PrivacyKpi>({ totalRecords: 0, dpiaCount: 0, activeBreaches: 0, consentRate: 0, dataSubjectRequests: 0, processingActivities: 0 });

  ngOnInit(): void {
    this.http.get<any>('/api/privacy/kpis').subscribe({
      next: (data) => this.kpis.set(data),
      error: () => {},
    });
  }

  readonly privacyAgents: AgentInfo[] = [
    { id: 'A11', name: 'Privacy Guardian', nameAr: 'حارس الخصوصية', icon: 'pi-lock', color: '#14b8a6', domain: 'Privacy', domainAr: 'الخصوصية', autonomyLevel: 'hybrid', status: 'active' },
  ];

  readonly privacyTransitions = [
    { from: 'draft', to: 'in_progress' },
    { from: 'in_progress', to: 'review' },
    { from: 'review', to: 'approved', requiresApproval: true },
    { from: 'review', to: 'rejected' },
    { from: 'approved', to: 'active' },
    { from: 'active', to: 'review_due' },
    { from: 'review_due', to: 'in_progress' },
    { from: 'rejected', to: 'draft' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'privacy',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 720,
    transitions: this.privacyTransitions,
    currentStatus: 'active',
    agents: this.privacyAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));
}
