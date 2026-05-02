/**
 * Maturity Dashboard Component — GRC maturity score, trend chart, phase progress,
 * executive summary, and regression alerts.
 *
 * Orchestrator that delegates rendering to child presentational components:
 * - MaturityScoreGaugeComponent (score gauge + component breakdown)
 * - MaturityPhaseProgressComponent (phase bars + trend chart)
 * - MaturityExecutiveSummaryComponent (bilingual executive summary)
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.7
 */

import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '../../../core/utils/dev-logger';
import {
  JourneyService,
  MaturityScore,
  MaturityComponent,
  ExecutiveSummary,
  GRCRoadmap,
} from '@app/core/services/user-account/journey.service';
import { MaturityScoreGaugeComponent } from './components/maturity-dashboard-score-gauge.component';
import { MaturityPhaseProgressComponent, PhaseCompletionData } from './components/maturity-dashboard-phase-progress.component';
import { MaturityExecutiveSummaryComponent } from './components/maturity-dashboard-executive-summary.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-dashboard',
    imports: [
        CommonModule,
        MaturityScoreGaugeComponent,
        MaturityPhaseProgressComponent,
        MaturityExecutiveSummaryComponent,
    ],
    template: `
    <div class="maturity-dashboard">
      <!-- Header -->
      <div class="maturity-header">
        <div class="maturity-icon">
          <i class="pi pi-chart-bar"></i>
        </div>
        <h1>{{ i18n.translate('maturityDashboard.title') }}</h1>
        <p class="maturity-desc">
          {{ i18n.translate('maturityDashboard.description') }}
        </p>
      </div>

      <!-- Loading state -->
      @if (loading()) {
        <div class="state-message" role="status">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ i18n.translate('maturityDashboard.loadingData') }}</span>
        </div>
      }

      <!-- Error state -->
      @if (error()) {
        <div class="state-message error" role="alert">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
          <button class="btn-retry" (click)="loadData()">
            {{ i18n.translate('maturityDashboard.retry') }}
          </button>
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && !error() && !maturityScore()) {
        <div class="state-message">
          <i class="pi pi-chart-line"></i>
          <span>{{ i18n.translate('maturityDashboard.noDataYet') }}</span>
        </div>
      }

      <!-- Dashboard content -->
      @if (maturityScore() && !loading()) {
        <!-- Regression alerts -->
        @if (regressions().length > 0) {
          <div class="regression-alerts" role="alert">
            <div class="regression-header">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ i18n.translate('maturityDashboard.regressionAlerts') }}</span>
            </div>
            @for (reg of regressions(); track reg.name) {
              <div class="regression-item">
                <span class="regression-name">{{ i18n.localize(reg.name, reg.nameAr) }}</span>
                <span class="regression-detail">
                  {{ i18n.translate('maturityDashboard.decreasedBy') }}
                  {{ reg.score }} {{ i18n.translate('maturityDashboard.points') }}
                </span>
              </div>
            }
          </div>
        }

        <!-- Score gauge + component breakdown -->
        <app-maturity-score-gauge [score]="maturityScore()!" />

        <!-- Phase progress + trend chart -->
        <app-maturity-phase-progress
          [phaseCompletions]="phaseCompletions()"
          [trendPoints]="maturityScore()!.trend" />

        <!-- Executive summary -->
        <app-maturity-executive-summary
          [summary]="executiveSummary()"
          [loadingSummary]="loadingSummary()"
          [summaryError]="summaryError()"
          (generate)="generateSummary()" />
      }
    </div>
  `,
    styles: [`
    .maturity-dashboard {
      padding: var(--space-lg) 0;
    }

    /* -- Header -- */
    .maturity-header {
      text-align: center;
      margin-bottom: var(--space-xl);
    }

    .maturity-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-ice);
      border: 2px solid var(--border-primary);
      color: var(--primary);
      font-size: var(--font-size-2xl);
      margin-bottom: var(--space-md);
    }

    .maturity-header h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-black);
      color: var(--text-heading);
      margin: 0 0 var(--space-sm);
    }

    .maturity-desc {
      color: var(--text-muted);
      font-size: var(--font-size-base);
      max-width: 480px;
      margin: 0 auto;
    }

    /* -- State messages (loading / error / empty) -- */
    .state-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      min-height: 300px;
      color: var(--text-muted);
      font-size: var(--font-size-base);
    }

    .state-message .pi {
      font-size: var(--font-size-4xl);
      color: var(--primary);
      opacity: 0.5;
    }

    .state-message.error { color: var(--danger); }
    .state-message.error .pi { color: var(--danger); opacity: 1; }

    .btn-retry {
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius);
      border: none;
      background: var(--primary);
      color: var(--text-on-primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      cursor: pointer;
      margin-top: var(--space-sm);
    }

    /* -- Regression alerts -- */
    .regression-alerts {
      background: rgba(var(--module-accent-red-rgb), 0.06);
      border: 1px solid rgba(var(--module-accent-red-rgb), 0.25);
      border-radius: var(--radius);
      padding: var(--space-md);
      margin-bottom: var(--space-lg);
      animation: fadeSlideIn 300ms ease;
    }

    .regression-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--danger);
      font-weight: var(--font-bold);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-sm);
    }

    .regression-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-xs) var(--space-sm);
      background: rgba(var(--module-accent-red-rgb), 0.04);
      border-radius: var(--radius-sm);
      margin-bottom: 4px;
    }

    .regression-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-medium);
      color: var(--text-heading);
    }

    .regression-detail {
      font-size: var(--font-size-xs);
      color: var(--danger);
      font-weight: var(--font-medium);
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class MaturityDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private journeyService = inject(JourneyService);

  // -- State signals --
  maturityScore = signal<MaturityScore | null>(null);
  roadmap = signal<GRCRoadmap | null>(null);
  executiveSummary = signal<ExecutiveSummary | null>(null);
  loading = signal(false);
  error = signal('');
  loadingSummary = signal(false);
  summaryError = signal('');

  // -- Computed --
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  /** Detect regressions by comparing current trend to previous point */
  regressions = computed((): MaturityComponent[] => {
    const score = this.maturityScore();
    if (!score || score.trend.length < 2) return [];

    const trend = score.trend;
    const latest = trend[trend.length - 1].score;
    const previous = trend[trend.length - 2].score;

    if (latest >= previous) return [];

    return score.components.filter(c => c.score.score < 50);
  });

  /** Phase completion data derived from roadmap */
  phaseCompletions = computed((): PhaseCompletionData[] => {
    const rm = this.roadmap();
    if (!rm) return [];

    return rm.phases.map(phase => {
      const totalTasks = phase.milestones.reduce((sum, m) => sum + (m.tasks?.length ?? 0), 0);
      const completedTasks = phase.milestones.reduce(
        (sum, m) => sum + (m.tasks?.filter(t => t.status === 'completed').length ?? 0), 0
      );
      const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        type: phase.type,
        nameEn: phase.nameEn,
        nameAr: phase.nameAr,
        completionPercent,
        totalTasks,
        completedTasks,
      };
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  // -- Data loading --

  loadData(): void {
    this.loading.set(true);
    this.error.set('');

    this.journeyService.getMaturityScore().subscribe({
      next: (score) => {
        this.maturityScore.set(score);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          this.isAr()
            ? 'فشل في تحميل بيانات النضج. يرجى المحاولة مرة أخرى.'
            : 'Failed to load maturity data. Please try again.'
        );
        devError('Maturity load error:', err);
      },
    });

    this.journeyService.getRoadmap().subscribe({
      next: (roadmap) => this.roadmap.set(roadmap),
      error: (err) => devError('Roadmap load error:', err),
    });
  }

  // -- Executive summary --

  generateSummary(): void {
    this.loadingSummary.set(true);
    this.summaryError.set('');

    this.journeyService.getExecutiveSummary().subscribe({
      next: (summary) => {
        this.executiveSummary.set(summary);
        this.loadingSummary.set(false);
      },
      error: (err) => {
        this.loadingSummary.set(false);
        this.summaryError.set(
          this.isAr()
            ? 'فشل في إنشاء الملخص التنفيذي. يرجى المحاولة مرة أخرى.'
            : 'Failed to generate executive summary. Please try again.'
        );
        devError('Summary generation error:', err);
      },
    });
  }
}
