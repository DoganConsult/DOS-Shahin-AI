import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/**
 * Dumb component: renders the KPI summary cards row and the KSA compliance
 * posture row at the top of the AGRC-OS dashboard.
 */
@Component({
  selector: 'app-dashboard-stats-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- KPI Summary Cards -->
    <div class="kpi-row">
      <a routerLink="/frameworks" class="kpi-card kpi-sky">
        <div class="kpi-icon-ring"><i class="pi pi-sitemap"></i></div>
        <div class="kpi-value">{{ i18n.formatNumber(totalFrameworks) }}</div>
        <div class="kpi-label">{{ i18n.translate('dashboard.totalFrameworks') }}</div>
      </a>
      <a routerLink="/risks" class="kpi-card kpi-red">
        <div class="kpi-icon-ring"><i class="pi pi-exclamation-triangle"></i></div>
        <div class="kpi-value">{{ i18n.formatNumber(totalRisks) }}</div>
        <div class="kpi-label">{{ i18n.translate('dashboard.totalRisks') }}</div>
      </a>
      <a routerLink="/controls" class="kpi-card kpi-green">
        <div class="kpi-icon-ring"><i class="pi pi-lock"></i></div>
        <div class="kpi-value">{{ i18n.formatNumber(totalControls) }}</div>
        <div class="kpi-label">{{ i18n.translate('dashboard.totalControls') }}</div>
      </a>
      <a routerLink="/policies" class="kpi-card kpi-purple">
        <div class="kpi-icon-ring"><i class="pi pi-file"></i></div>
        <div class="kpi-value">{{ i18n.formatNumber(totalPolicies) }}</div>
        <div class="kpi-label">{{ i18n.translate('dashboard.totalPolicies') }}</div>
      </a>
    </div>

    <!-- KSA Compliance Posture Row -->
    <div class="section-title"><i class="pi pi-shield"></i> {{ i18n.translate('dashboard.ksaCompliancePosture') }}</div>
    <div class="ksa-posture-row">
      <a routerLink="/nca-assessment" class="ksa-card ksa-nca">
        <div class="ksa-icon"><i class="pi pi-shield"></i></div>
        <div class="ksa-value">{{ ncaScore }}%</div>
        <div class="ksa-label">{{ i18n.translate('dashboard.ncaEccScore') }}</div>
      </a>
      <a routerLink="/regulator-heatmap" class="ksa-card ksa-reg">
        <div class="ksa-icon"><i class="pi pi-chart-bar"></i></div>
        <div class="ksa-value">{{ regulatorsAssessed }}/{{ regulatorsTotal }}</div>
        <div class="ksa-label">{{ i18n.translate('dashboard.regulators') }}</div>
      </a>
      <a routerLink="/framework-mapping" class="ksa-card ksa-fw">
        <div class="ksa-icon"><i class="pi pi-sitemap"></i></div>
        <div class="ksa-value">{{ efficiencyRatio }}x</div>
        <div class="ksa-label">{{ i18n.translate('dashboard.frameworkEfficiency') }}</div>
      </a>
      <a routerLink="/dpia" class="ksa-card ksa-dpia">
        <div class="ksa-icon"><i class="pi pi-file-edit"></i></div>
        <div class="ksa-value">{{ dpiaCount }}</div>
        <div class="ksa-label">{{ i18n.translate('dashboard.dpiaAssessments') }}</div>
      </a>
    </div>
  `,
  styles: [`
    .kpi-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .kpi-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: var(--space-lg); border-radius: var(--radius); text-decoration: none; color: inherit;
      background: var(--surface); border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card); position: relative; overflow: hidden;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kpi-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: var(--accent-color, var(--primary));
    }
    .kpi-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .kpi-sky::before { background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
    .kpi-red::before { background: linear-gradient(90deg, var(--error), #f87171); }
    .kpi-green::before { background: linear-gradient(90deg, var(--success), var(--success)); }
    .kpi-purple::before { background: linear-gradient(90deg, var(--secondary, #8b5cf6), #a78bfa); }
    .kpi-icon-ring {
      width: 52px; height: 52px; border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
      backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      -webkit-backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      box-shadow: var(--glass-icon-shadow);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kpi-card:hover .kpi-icon-ring {
      box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(var(--color-white-rgb), 0.5);
      transform: scale(1.12);
      backdrop-filter: blur(16px) saturate(1.8);
    }
    .kpi-sky .kpi-icon-ring { background: rgba(var(--module-accent-sky-rgb), 0.12); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.22); color: var(--primary); }
    .kpi-red .kpi-icon-ring { background: rgba(var(--module-accent-red-rgb), 0.10); border: 1px solid rgba(var(--module-accent-red-rgb), 0.20); color: var(--error); }
    .kpi-green .kpi-icon-ring { background: rgba(var(--module-accent-green-rgb), 0.10); border: 1px solid rgba(var(--module-accent-green-rgb), 0.20); color: var(--success); }
    .kpi-purple .kpi-icon-ring { background: rgba(var(--module-accent-violet-rgb), 0.10); border: 1px solid rgba(var(--module-accent-violet-rgb), 0.20); color: var(--secondary, #8b5cf6); }
    .kpi-icon-ring .pi { font-size: var(--font-size-2xl); }
    .kpi-value { font-size: var(--font-size-4xl); font-weight: var(--font-black); color: var(--text-heading); letter-spacing: -0.02em; line-height: 1; margin-bottom: 6px; }
    .kpi-label { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

    /* KSA Posture Row */
    .ksa-posture-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .ksa-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: var(--space-lg); border-radius: var(--radius); text-decoration: none; color: inherit;
      background: var(--surface); border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card); position: relative; overflow: hidden;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ksa-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
    .ksa-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .ksa-nca::before { background: linear-gradient(90deg, var(--primary-dark), var(--primary)); }
    .ksa-reg::before { background: linear-gradient(90deg, var(--success), var(--success)); }
    .ksa-fw::before { background: linear-gradient(90deg, #7c3aed, #a855f7); }
    .ksa-dpia::before { background: linear-gradient(90deg, #9333ea, #c084fc); }
    .ksa-icon {
      width: 44px; height: 44px; border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
      backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      -webkit-backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      box-shadow: var(--glass-icon-shadow);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ksa-card:hover .ksa-icon {
      box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(var(--color-white-rgb), 0.5);
      transform: scale(1.12);
      backdrop-filter: blur(16px) saturate(1.8);
    }
    .ksa-nca .ksa-icon { background: rgba(var(--color-deep-blue-rgb), 0.12); border: 1px solid rgba(var(--color-deep-blue-rgb), 0.22); color: var(--primary-dark); }
    .ksa-reg .ksa-icon { background: rgba(var(--module-accent-green-rgb), 0.10); border: 1px solid rgba(var(--module-accent-green-rgb), 0.20); color: var(--success); }
    .ksa-fw .ksa-icon { background: rgba(var(--color-violet-600-rgb), 0.10); border: 1px solid rgba(var(--color-violet-600-rgb), 0.20); color: #7c3aed; }
    .ksa-dpia .ksa-icon { background: rgba(var(--color-purple-600-rgb), 0.10); border: 1px solid rgba(var(--color-purple-600-rgb), 0.20); color: #9333ea; }
    .ksa-icon .pi { font-size: var(--font-size-xl); }
    .ksa-value { font-size: var(--font-size-xl); font-weight: var(--font-black); color: var(--text-heading); line-height: 1; margin-bottom: var(--space-xs); }
    .ksa-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

    /* Section Title */
    .section-title {
      font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-heading);
      margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);
      letter-spacing: -0.01em;
    }
    .section-title .pi {
      color: var(--primary); font-size: var(--font-size-lg); width: 36px; height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md); background: var(--glass-icon-bg);
      backdrop-filter: blur(var(--glass-icon-blur)); -webkit-backdrop-filter: blur(var(--glass-icon-blur));
      border: 1px solid var(--glass-icon-border); box-shadow: var(--glass-icon-shadow);
    }

    @media (max-width: 1200px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .kpi-row { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardStatsBannerComponent {
  readonly i18n = inject(I18nService);

  @Input() totalFrameworks = 0;
  @Input() totalRisks = 0;
  @Input() totalControls = 0;
  @Input() totalPolicies = 0;

  @Input() ncaScore = 0;
  @Input() regulatorsAssessed = 0;
  @Input() regulatorsTotal = 0;
  @Input() efficiencyRatio = '0';
  @Input() dpiaCount = 0;
}
