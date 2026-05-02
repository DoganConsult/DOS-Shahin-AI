import { Component, inject, computed, ChangeDetectionStrategy} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { QiyasService } from '../../qiyas.service';
import { QiyasDashboardSummary } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-qiyas-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ModuleOverviewKitComponent],
  template: `
    <div class="qiyas-dash">
      <div class="dash-header">
        <h1>{{ i18n.translate('qiyas.title') }}</h1>
        <p class="subtitle">{{ i18n.translate('qiyas.subtitle') }}</p>
      </div>

      <div class="stat-grid" *ngIf="summary()">
        <div class="stat-card">
          <div class="stat-value">{{ summary()!.totalModels }}</div>
          <div class="stat-label">{{ i18n.translate('qiyas.activeModels') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ summary()!.totalAssessments }}</div>
          <div class="stat-label">{{ i18n.translate('qiyas.totalAssessments') }}</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ summary()!.inProgress }}</div>
          <div class="stat-label">{{ i18n.translate('qiyas.inProgress') }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">{{ summary()!.finalized }}</div>
          <div class="stat-label">{{ i18n.translate('qiyas.finalized') }}</div>
        </div>
      </div>

      <div class="quick-actions">
        <a routerLink="/qiyas/models" class="action-btn"><i class="pi pi-list"></i> {{ i18n.translate('qiyas.modelRegistry') }}</a>
        <a routerLink="/qiyas/assessments" class="action-btn"><i class="pi pi-chart-bar"></i> {{ i18n.translate('qiyas.assessments') }}</a>
        <a routerLink="/qiyas/questions" class="action-btn"><i class="pi pi-question-circle"></i> Question Bank</a>
        <a routerLink="/qiyas/scoping" class="action-btn"><i class="pi pi-crosshairs" style="font-size:inherit"></i> Scoping</a>
      </div>
      <div class="quick-actions">
        <a routerLink="/qiyas/recommendations" class="action-btn"><i class="pi pi-lightbulb"></i> Recommendations</a>
        <a routerLink="/qiyas/calibration" class="action-btn"><i class="pi pi-sliders-h"></i> Calibration</a>
        <a routerLink="/qiyas/maturity-heatmap" class="action-btn"><i class="pi pi-th-large"></i> Maturity Heatmap</a>
        <a routerLink="/qiyas/maturity-trends" class="action-btn"><i class="pi pi-chart-line"></i> Maturity Trends</a>
      </div>
      <div class="quick-actions">
        <a routerLink="/qiyas/evidence-scoring" class="action-btn"><i class="pi pi-star-fill"></i> Evidence Scoring</a>
        <a routerLink="/qiyas/benchmarks" class="action-btn"><i class="pi pi-sort-alt"></i> Benchmarks</a>
        <a routerLink="/qiyas/certification" class="action-btn"><i class="pi pi-verified"></i> Certification</a>
        <a routerLink="/qiyas/respondents" class="action-btn"><i class="pi pi-users"></i> Respondents</a>
      </div>

      <div class="recent-section" *ngIf="summary()?.recentAssessments?.length">
        <h3>{{ i18n.translate('qiyas.recentAssessments') }}</h3>
        <div class="recent-list">
          <a *ngFor="let a of summary()!.recentAssessments"
             [routerLink]="['/qiyas/assessments', a.qiyas_assessment_id]"
             class="recent-item">
            <div class="recent-title">{{ a.title_en }}</div>
            <div class="recent-meta">
              <span class="badge" [class]="'badge-' + a.status">{{ a.status }}</span>
              <span class="model-name" *ngIf="a.model_name">{{ a.model_name }}</span>
            </div>
          </a>
        </div>
      </div>

      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `,
  styles: [`
    .qiyas-dash { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .dash-header { margin-bottom: 32px; }
    .dash-header h1 { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 4px; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #fff; border: 1.5px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
    .stat-card.accent { border-color: var(--primary); }
    .stat-card.success { border-color: var(--success); }
    .stat-value { font-size: var(--font-size-4xl); font-weight: 700; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .quick-actions { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 14px 24px; border-radius: var(--radius-md); background: var(--surface-ice); color: var(--text-heading); text-decoration: none; font-weight: 600; transition: background 0.15s; }
    .action-btn:hover { background: var(--border-subtle); }
    .icon { font-size: var(--font-size-lg); }
    .recent-section h3 { font-size: var(--font-size-md); font-weight: 600; margin-bottom: 12px; }
    .recent-list { display: flex; flex-direction: column; gap: 8px; }
    .recent-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius); text-decoration: none; color: var(--text-heading); }
    .recent-item:hover { background: var(--surface-ice); }
    .recent-title { font-weight: 500; }
    .recent-meta { display: flex; gap: 8px; align-items: center; }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-draft { background: var(--surface-ice); color: var(--text-muted); }
    .badge-in_progress { background: #dbeafe; color: #1d4ed8; }
    .badge-finalized { background: #dcfce7; color: var(--success); }
    .badge-under_review { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .model-name { font-size: var(--font-size-sm); color: var(--text-muted); }
    @media (max-width: 768px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class QiyasDashboardComponent {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  readonly qiyasAgents: AgentInfo[] = [];

  readonly qiyasTransitions = [
    { from: 'draft', to: 'in_progress' },
    { from: 'in_progress', to: 'scored' },
    { from: 'scored', to: 'reviewed', requiresApproval: true },
    { from: 'reviewed', to: 'finalized' },
    { from: 'reviewed', to: 'rescoring' },
    { from: 'rescoring', to: 'scored' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'qiyas',
    tier: 'domain',
    automationLevel: 'semi',
    slaHours: 504,
    transitions: this.qiyasTransitions,
    currentStatus: 'in_progress',
    agents: this.qiyasAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  /** One-shot dashboard summary load with fallback on error */
  summary = toSignal<QiyasDashboardSummary | null>(
    this.svc.getDashboard().pipe(
      catchError(() => of({ totalModels: 0, totalAssessments: 0, inProgress: 0, finalized: 0, recentAssessments: [] } as QiyasDashboardSummary))
    ),
    { initialValue: null }
  );
}
