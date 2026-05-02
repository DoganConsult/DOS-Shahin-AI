/**
 * Stage Detail Component — Renders stage-specific content for each GRC stage.
 *
 * Handles Company Setup, Team Building, Policy Lifecycle, Risk Assessment,
 * and other stages with appropriate UI for each.
 *
 * Requirements: 1.1, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2
 */

import { Component, inject, signal, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  JourneyService,
  RoadmapPhase,
  RoadmapTask,
  GRCRoadmap,
  TaskStatus,
} from '@app/core/services/user-account/journey.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stage-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stage-detail" [attr.dir]="i18n.direction()">
      @if (phase()) {
        <div class="stage-header">
          <button class="btn-back" (click)="goBack()" aria-label="Back">
            <i class="pi pi-arrow-left"></i>
          </button>
          <h2>{{ resolveName(phase()!) }}</h2>
          <span class="stage-badge">{{ getCompletion() }}%</span>
        </div>

        <p class="stage-description">{{ resolveDescription(phase()!) }}</p>

        <!-- Milestones & Tasks -->
        @for (milestone of phase()!.milestones; track milestone.milestoneId) {
          <div class="milestone-card">
            <div class="milestone-header">
              <i class="pi" [ngClass]="milestone.completed ? 'pi-check-circle' : 'pi-circle'"></i>
              <span>{{ resolveMilestoneName(milestone) }}</span>
            </div>
            <div class="task-list">
              @for (task of milestone.tasks; track task.taskId) {
                <div class="task-item" [class.completed]="task.status === 'completed'">
                  <button
                    class="task-status-btn"
                    (click)="toggleTask(task)"
                    [attr.aria-label]="'Toggle ' + resolveTaskName(task)"
                  >
                    <i class="pi" [ngClass]="getStatusIcon(task.status)"></i>
                  </button>
                  <div class="task-info">
                    <span class="task-title">{{ resolveTaskName(task) }}</span>
                    <span class="task-module">{{ task.targetModule }}</span>
                  </div>
                  <span class="task-priority" [ngClass]="'priority-' + task.priority">
                    {{ task.priority }}
                  </span>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="loading" aria-live="polite">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
      }
    </div>
  `,
  styles: [`
    .stage-detail { padding: var(--space-lg); }
    .stage-header { display: flex; align-items: center; gap: var(--space-md); margin-block-end: var(--space-md); }
    .btn-back { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--text-secondary); }
    .stage-badge {
      margin-inline-start: auto;
      background: var(--primary);
      color: white;
      padding: 2px 10px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.85rem;
    }
    .stage-description { color: var(--text-secondary); margin-block-end: var(--space-lg); line-height: 1.6; }
    .milestone-card {
      background: var(--surface-card);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      margin-block-end: var(--space-md);
    }
    .milestone-header { display: flex; align-items: center; gap: var(--space-sm); font-weight: 600; margin-block-end: var(--space-sm); }
    .milestone-header .pi-check-circle { color: var(--green-500); }
    .task-list { display: flex; flex-direction: column; gap: var(--space-xs); }
    .task-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      transition: background 0.15s;
    }
    .task-item:hover { background: var(--surface-hover); }
    .task-item.completed { opacity: 0.7; }
    .task-status-btn { background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-secondary); }
    .task-item.completed .task-status-btn { color: var(--green-500); }
    .task-info { flex: 1; display: flex; flex-direction: column; }
    .task-title { font-weight: 500; }
    .task-module { font-size: 0.8rem; color: var(--text-secondary); }
    .task-priority { font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radius-xs); text-transform: uppercase; font-weight: 600; }
    .priority-critical { background: var(--red-100); color: var(--red-700); }
    .priority-high { background: var(--orange-100); color: var(--orange-700); }
    .priority-medium { background: var(--yellow-100); color: var(--yellow-700); }
    .priority-low { background: var(--green-100); color: var(--green-700); }
    .loading { text-align: center; padding: var(--space-xl); font-size: 2rem; color: var(--primary); }
  `],
})
export class StageDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private journeyService = inject(JourneyService);
  i18n = inject(I18nService);

  phase = signal<RoadmapPhase | null>(null);

  ngOnInit() {
    const stageType = this.route.snapshot.paramMap.get('stageId');
    this.journeyService.getRoadmap().subscribe({
      next: (rm: GRCRoadmap) => {
        const found = rm.phases.find(p => p.type === stageType);
        if (found) this.phase.set(found);
      },
    });
  }

  resolveName(phase: RoadmapPhase): string {
    return this.journeyService.resolveBilingual(phase, 'name');
  }

  resolveDescription(phase: RoadmapPhase): string {
    return this.journeyService.resolveBilingual(phase, 'description');
  }

  resolveMilestoneName(ms: Record<string, any>): string {
    return this.journeyService.resolveBilingual(ms, 'name');
  }

  resolveTaskName(task: RoadmapTask): string {
    return this.journeyService.resolveBilingual(task, 'title');
  }

  getCompletion(): number {
    const p = this.phase();
    if (!p) return 0;
    const tasks = p.milestones.flatMap(m => m.tasks);
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'pi-circle',
      in_progress: 'pi-spin pi-spinner',
      completed: 'pi-check-circle',
      skipped: 'pi-minus-circle',
    };
    return icons[status] ?? 'pi-circle';
  }

  toggleTask(task: RoadmapTask) {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    this.journeyService.updateTaskStatus(task.taskId, newStatus).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        task.status = newStatus;
        this.phase.set({ ...this.phase()! });
      },
    });
  }

  goBack() {
    this.router.navigate(['/journey']);
  }
}
