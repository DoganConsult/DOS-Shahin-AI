/**
 * Journey Dashboard Component — Main GRC roadmap overview.
 *
 * Displays the GRC roadmap with stages, progress bars, current stage highlight,
 * overall completion percentage, and recommended next step.
 *
 * Requirements: 1.4, 12.3, 10.4
 */

import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  JourneyService,
  GRCRoadmap,
  RoadmapPhase,
  RoadmapTask,
  MaturityScore,
} from '@app/core/services/user-account/journey.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface PhaseProgress {
  phase: RoadmapPhase;
  completionPercent: number;
  totalTasks: number;
  completedTasks: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-journey-dashboard',
    imports: [CommonModule],
    template: `
    <div class="journey-dashboard" [attr.dir]="i18n.direction()">
      <!-- Overall Progress -->
      <div class="overall-progress-card">
        <h2>{{ i18n.translate('journey.dashboard.title') }}</h2>
        <div class="progress-ring-container">
          <div class="progress-value">{{ overallCompletion() }}%</div>
          <div class="progress-label">{{ i18n.translate('journey.dashboard.overallProgress') }}</div>
        </div>
      </div>

      <!-- Phase Cards -->
      <div class="phase-grid">
        @for (pp of phaseProgress(); track pp.phase.phaseId) {
          <div
            class="phase-card"
            [class.active]="isCurrentPhase(pp.phase)"
            (click)="navigateToPhase(pp.phase)"
            role="button"
            [attr.aria-label]="resolveName(pp.phase)"
            tabindex="0"
            (keydown.enter)="navigateToPhase(pp.phase)"
          >
            <div class="phase-header">
              <i class="pi" [ngClass]="getPhaseIcon(pp.phase.type)"></i>
              <span class="phase-name">{{ resolveName(pp.phase) }}</span>
            </div>
            <div class="phase-progress-bar">
              <div class="phase-progress-fill" [style.width.%]="pp.completionPercent"></div>
            </div>
            <div class="phase-stats">
              {{ pp.completedTasks }}/{{ pp.totalTasks }} {{ i18n.translate('journey.dashboard.tasks') }}
              · {{ pp.completionPercent }}%
            </div>
          </div>
        }
      </div>

      <!-- Next Recommended Step -->
      @if (nextAction()) {
        <div class="next-action-card">
          <h3>{{ i18n.translate('journey.dashboard.nextStep') }}</h3>
          <div class="next-action-content">
            <span class="next-action-title">{{ resolveTaskName(nextAction()!) }}</span>
            <button class="btn-start" (click)="startNextAction()">
              {{ i18n.translate('journey.dashboard.start') }}
            </button>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading-overlay" aria-live="polite">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
      }
    </div>
  `,
    styles: [`
    .journey-dashboard { padding: var(--space-lg); }
    .overall-progress-card {
      background: var(--surface-card);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      margin-block-end: var(--space-lg);
      text-align: center;
    }
    .progress-value { font-size: var(--font-size-5xl); font-weight: 700; color: var(--primary); }
    .progress-label { color: var(--text-secondary); margin-block-start: var(--space-xs); }
    .phase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-md);
      margin-block-end: var(--space-lg);
    }
    .phase-card {
      background: var(--surface-card);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
      border: 2px solid transparent;
    }
    .phase-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .phase-card.active { border-color: var(--primary); }
    .phase-header { display: flex; align-items: center; gap: var(--space-sm); margin-block-end: var(--space-sm); }
    .phase-name { font-weight: 600; }
    .phase-progress-bar {
      height: 6px;
      background: var(--surface-hover);
      border-radius: var(--radius-xs);
      overflow: hidden;
      margin-block-end: var(--space-xs);
    }
    .phase-progress-fill { height: 100%; background: var(--primary); border-radius: var(--radius-xs); transition: width 0.3s; }
    .phase-stats { font-size: var(--font-size-tag); color: var(--text-secondary); }
    .next-action-card {
      background: var(--surface-card);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      border-inline-start: 4px solid var(--primary);
    }
    .next-action-content { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); }
    .next-action-title { font-weight: 500; }
    .btn-start {
      background: var(--primary);
      color: white;
      border: none;
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
    }
    .btn-start:hover { opacity: 0.9; }
    .loading-overlay { text-align: center; padding: var(--space-xl); font-size: var(--font-size-4xl); color: var(--primary); }
  `]
})
export class JourneyDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private journeyService = inject(JourneyService);
  private router = inject(Router);
  i18n = inject(I18nService);

  roadmap = signal<GRCRoadmap | null>(null);
  nextAction = signal<RoadmapTask | null>(null);
  maturity = signal<MaturityScore | null>(null);
  loading = signal(true);

  phaseProgress = computed<PhaseProgress[]>(() => {
    const rm = this.roadmap();
    if (!rm) return [];
    return rm.phases.map(phase => {
      const tasks = phase.milestones.flatMap(m => m.tasks);
      const completed = tasks.filter(t => t.status === 'completed').length;
      return {
        phase,
        completionPercent: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
        totalTasks: tasks.length,
        completedTasks: completed,
      };
    });
  });

  overallCompletion = computed(() => {
    const pp = this.phaseProgress();
    if (pp.length === 0) return 0;
    const total = pp.reduce((s, p) => s + p.totalTasks, 0);
    const done = pp.reduce((s, p) => s + p.completedTasks, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.journeyService.getRoadmap().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rm => { this.roadmap.set(rm); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.journeyService.getNextAction().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.nextAction.set(res.task),
    });
    this.journeyService.getMaturityScore().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ms => this.maturity.set(ms),
    });
  }

  resolveName(phase: RoadmapPhase): string {
    return this.journeyService.resolveBilingual(phase, 'name');
  }

  resolveTaskName(task: RoadmapTask): string {
    return this.journeyService.resolveBilingual(task, 'title');
  }

  isCurrentPhase(phase: RoadmapPhase): boolean {
    const pp = this.phaseProgress();
    const incomplete = pp.find(p => p.completionPercent < 100);
    return incomplete?.phase.phaseId === phase.phaseId;
  }

  getPhaseIcon(type: string): string {
    const icons: Record<string, string> = {
      foundation: 'pi-building',
      assessment: 'pi-search',
      implementation: 'pi-wrench',
      operations: 'pi-sync',
      continuous_improvement: 'pi-chart-line',
    };
    return icons[type] ?? 'pi-circle';
  }

  navigateToPhase(phase: RoadmapPhase) {
    this.router.navigate(['/journey/roadmap'], { queryParams: { phase: phase.type } });
  }

  startNextAction() {
    const task = this.nextAction();
    if (task?.targetModule) {
      this.router.navigate(['/' + task.targetModule]);
    }
  }
}
