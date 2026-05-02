/**
 * Roadmap View Component — Phase timeline visualization with milestones and tasks.
 *
 * Orchestrator that delegates rendering to child presentational components:
 * - RoadmapNextActionComponent (overall progress + next action copilot)
 * - RoadmapPhaseTimelineComponent (expandable phase sections with tasks)
 *
 * Requirements: 2.1, 2.10, 3.3
 */

import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '../../../core/utils/dev-logger';
import {
  JourneyService,
  GRCRoadmap,
  RoadmapPhase,
  RoadmapTask,
  NextActionResponse,
} from '@app/core/services/user-account/journey.service';
import { RoadmapNextActionComponent } from './components/roadmap-view-next-action.component';
import { RoadmapPhaseTimelineComponent } from './components/roadmap-view-phase-timeline.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-roadmap-view',
    imports: [CommonModule, RoadmapNextActionComponent, RoadmapPhaseTimelineComponent],
    template: `
    <div class="roadmap-view">
      <!-- Header -->
      <div class="roadmap-header">
        <div class="roadmap-icon">
          <i class="pi pi-map"></i>
        </div>
        <h1>{{ isAr() ? 'خارطة طريق الحوكمة والمخاطر والامتثال' : 'GRC Roadmap' }}</h1>
        <p class="roadmap-desc">
          {{ isAr()
            ? 'خطة التنفيذ المخصصة لشركتك مع المراحل والمعالم والمهام.'
            : 'Your personalized implementation plan with phases, milestones, and tasks.' }}
        </p>
      </div>

      <!-- Overall progress + Next action -->
      @if (roadmap()) {
        <app-roadmap-next-action
          [overallCompletion]="overallCompletion()"
          [nextAction]="nextAction()"
          [loadingNext]="loadingNext()"
          (fetchNext)="fetchNextAction()"
          (navigateToTask)="navigateToTask($event)" />
      }

      <!-- Loading state -->
      @if (loading()) {
        <div class="roadmap-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ isAr() ? 'جارٍ تحميل خارطة الطريق...' : 'Loading roadmap...' }}</span>
        </div>
      }

      <!-- Error state -->
      @if (error()) {
        <div class="roadmap-error" role="alert">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
          <button class="btn-retry" (click)="loadRoadmap()">
            {{ isAr() ? 'إعادة المحاولة' : 'Retry' }}
          </button>
        </div>
      }

      <!-- Phase timeline -->
      @if (roadmap() && !loading()) {
        <app-roadmap-phase-timeline
          [phases]="roadmap()!.phases"
          [expandedPhases]="expandedPhases()"
          [showSecondaryLang]="true"
          (togglePhase)="togglePhase($event)" />
      }

      <!-- Empty state -->
      @if (!roadmap() && !loading() && !error()) {
        <div class="roadmap-empty">
          <i class="pi pi-sitemap"></i>
          <span>{{ isAr() ? 'لم يتم إنشاء خارطة الطريق بعد. أكمل إعداد الشركة أولاً.' : 'No roadmap generated yet. Complete company setup first.' }}</span>
          <button class="btn-primary" (click)="goToSetup()">
            {{ isAr() ? 'الذهاب إلى الإعداد' : 'Go to Setup' }}
          </button>
        </div>
      }
    </div>
  `,
    styles: [`
    .roadmap-view { padding: var(--space-lg) 0; }

    /* -- Header -- */
    .roadmap-header { text-align: center; margin-bottom: var(--space-xl); }

    .roadmap-icon {
      width: 56px; height: 56px;
      border-radius: var(--radius-pill);
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--surface-ice);
      border: 2px solid var(--border-primary);
      color: var(--primary);
      font-size: var(--font-size-2xl);
      margin-bottom: var(--space-md);
    }

    .roadmap-header h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-black);
      color: var(--text-heading);
      margin: 0 0 var(--space-sm);
    }

    .roadmap-desc {
      color: var(--text-muted);
      font-size: var(--font-size-base);
      max-width: 480px;
      margin: 0 auto;
    }

    /* -- States -- */
    .roadmap-loading, .roadmap-error, .roadmap-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      min-height: 300px;
      color: var(--text-muted);
      font-size: var(--font-size-base);
    }

    .roadmap-loading .pi, .roadmap-empty .pi {
      font-size: var(--font-size-4xl);
      color: var(--primary);
      opacity: 0.5;
    }

    .roadmap-error { color: var(--danger); }
    .roadmap-error .pi { font-size: var(--font-size-4xl); }

    .btn-retry, .btn-primary {
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
  `]
})
export class RoadmapViewComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private journeyService = inject(JourneyService);
  private router = inject(Router);

  // -- State signals --
  roadmap = signal<GRCRoadmap | null>(null);
  loading = signal(false);
  error = signal<string>('');
  expandedPhases = signal<Set<string>>(new Set());
  nextAction = signal<NextActionResponse | null>(null);
  loadingNext = signal(false);

  // -- Computed --
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  overallCompletion = computed(() => {
    const rm = this.roadmap();
    if (!rm || !rm.phases.length) return 0;
    const totalTasks = rm.phases.reduce((sum, p) => this.getTotalTaskCount(p) + sum, 0);
    if (totalTasks === 0) return 0;
    const completedTasks = rm.phases.reduce((sum, p) => this.getCompletedTaskCount(p) + sum, 0);
    return Math.round((completedTasks / totalTasks) * 100);
  });

  ngOnInit(): void {
    this.loadRoadmap();
  }

  // -- Data loading --

  loadRoadmap(): void {
    this.loading.set(true);
    this.error.set('');

    this.journeyService.getRoadmap().subscribe({
      next: (roadmap) => {
        this.roadmap.set(roadmap);
        this.loading.set(false);

        // Auto-expand the first active (incomplete) phase
        if (roadmap.phases.length > 0) {
          const activePhase = roadmap.phases.find(p => this.getPhaseCompletion(p) < 100)
            || roadmap.phases[0];
          this.expandedPhases.set(new Set([activePhase.phaseId]));
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          this.isAr()
            ? 'فشل في تحميل خارطة الطريق. يرجى المحاولة مرة أخرى.'
            : 'Failed to load roadmap. Please try again.'
        );
        devError('Roadmap load error:', err);
      },
    });
  }

  // -- "What should I do next?" --

  fetchNextAction(): void {
    this.loadingNext.set(true);
    this.nextAction.set(null);

    this.journeyService.getNextAction().subscribe({
      next: (response) => {
        this.nextAction.set(response);
        this.loadingNext.set(false);
      },
      error: (err) => {
        this.loadingNext.set(false);
        this.nextAction.set({
          actionId: '',
          title: '',
          description: '',
          priority: '',
          moduleCode: '',
          task: null,
          message: this.isAr()
            ? 'تعذر الحصول على الإجراء التالي. حاول مرة أخرى.'
            : 'Could not fetch next action. Please try again.',
        });
        devError('Next action error:', err);
      },
    });
  }

  // -- Phase expand/collapse --

  togglePhase(phaseId: string): void {
    const current = new Set(this.expandedPhases());
    if (current.has(phaseId)) {
      current.delete(phaseId);
    } else {
      current.add(phaseId);
    }
    this.expandedPhases.set(current);
  }

  // -- Navigation --

  navigateToTask(task: RoadmapTask): void {
    if (task.targetModule) {
      this.router.navigateByUrl(task.targetModule);
    }
  }

  goToSetup(): void {
    this.router.navigate(['/journey/setup']);
  }

  // -- Private helpers --

  private getPhaseCompletion(phase: RoadmapPhase): number {
    const total = this.getTotalTaskCount(phase);
    if (total === 0) return 0;
    return Math.round((this.getCompletedTaskCount(phase) / total) * 100);
  }

  private getTotalTaskCount(phase: RoadmapPhase): number {
    return phase.milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0);
  }

  private getCompletedTaskCount(phase: RoadmapPhase): number {
    return phase.milestones.reduce(
      (sum, m) => sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
    );
  }
}
