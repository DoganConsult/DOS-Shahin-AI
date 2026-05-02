/**
 * Roadmap View Phase Timeline — Expandable phase sections with milestones and tasks.
 *
 * Presentational child of RoadmapViewComponent.
 */
import { GrcRecord } from '@app/core/models/shared.types';

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  JourneyService,
  RoadmapPhase,
  TaskStatus,
} from '@app/core/services/user-account/journey.service';

/** Phase icon mapping */
const PHASE_ICONS: Record<string, string> = {
  foundation: 'pi-building',
  assessment: 'pi-search',
  implementation: 'pi-wrench',
  operations: 'pi-sync',
  continuous_improvement: 'pi-chart-line',
};

/** Task status icon mapping */
const STATUS_ICONS: Record<TaskStatus, string> = {
  not_started: 'pi-circle',
  pending: 'pi-circle',
  in_progress: 'pi-spin pi-spinner',
  completed: 'pi-check-circle',
  blocked: 'pi-ban',
  skipped: 'pi-minus-circle',
};

/** Priority color mapping */
const PRIORITY_CLASSES: Record<string, string> = {
  critical: 'priority-critical',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-roadmap-phase-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phase-timeline">
      @for (phase of phases; track phase.phaseId; let idx = $index) {
        <div class="phase-section"
             [class.expanded]="expandedPhases.has(phase.phaseId)"
             [class.completed]="getPhaseCompletion(phase) === 100"
             [class.active]="getPhaseCompletion(phase) > 0 && getPhaseCompletion(phase) < 100">

          <!-- Phase header (clickable to expand/collapse) -->
          <button class="phase-header"
                  (click)="togglePhase.emit(phase.phaseId)"
                  [attr.aria-expanded]="expandedPhases.has(phase.phaseId)"
                  [attr.aria-controls]="'phase-content-' + phase.phaseId">
            <div class="phase-indicator">
              <div class="phase-number" [class.completed]="getPhaseCompletion(phase) === 100">
                @if (getPhaseCompletion(phase) === 100) {
                  <i class="pi pi-check"></i>
                } @else {
                  {{ idx + 1 }}
                }
              </div>
              @if (idx < phases.length - 1) {
                <div class="phase-line"
                     [class.completed]="getPhaseCompletion(phase) === 100"></div>
              }
            </div>

            <div class="phase-info">
              <div class="phase-title-row">
                <i class="pi" [ngClass]="getPhaseIcon(phase.type)"></i>
                <h2 class="phase-name">{{ resolveBilingual(phase, 'name') }}</h2>
                <span class="phase-weeks">
                  {{ phase.estimatedWeeks }}
                  {{ isAr() ? 'أسابيع' : 'weeks' }}
                </span>
              </div>

              <div class="phase-progress">
                <div class="phase-progress-track">
                  <div class="phase-progress-fill"
                       [style.width.%]="getPhaseCompletion(phase)"
                       [class.complete]="getPhaseCompletion(phase) === 100"></div>
                </div>
                <span class="phase-progress-text">
                  {{ getPhaseCompletion(phase) }}%
                  · {{ getCompletedTaskCount(phase) }}/{{ getTotalTaskCount(phase) }}
                  {{ isAr() ? 'مهام' : 'tasks' }}
                </span>
              </div>
            </div>

            <i class="pi expand-icon"
               [ngClass]="expandedPhases.has(phase.phaseId) ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
          </button>

          <!-- Phase content (expandable) -->
          @if (expandedPhases.has(phase.phaseId)) {
            <div class="phase-content" [id]="'phase-content-' + phase.phaseId">
              <div class="phase-description">
                <p class="phase-desc-primary">{{ resolveBilingual(phase, 'description') }}</p>
                @if (showSecondaryLang) {
                  <p class="phase-desc-secondary">{{ getSecondaryText(phase, 'description') }}</p>
                }
              </div>

              @for (milestone of phase.milestones; track milestone.milestoneId) {
                <div class="milestone-card" [class.completed]="milestone.completed">
                  <div class="milestone-header">
                    <div class="milestone-status">
                      @if (milestone.completed) {
                        <i class="pi pi-check-circle milestone-done"></i>
                      } @else {
                        <i class="pi pi-circle milestone-pending"></i>
                      }
                    </div>
                    <div class="milestone-info">
                      <h3 class="milestone-name">{{ resolveBilingual(milestone, 'name') }}</h3>
                      <span class="milestone-est">
                        {{ milestone.estimatedDays }}
                        {{ isAr() ? 'أيام' : 'days' }}
                      </span>
                    </div>
                  </div>

                  @if (milestone.descriptionEn || milestone.descriptionAr) {
                    <p class="milestone-desc">{{ resolveBilingual(milestone, 'description') }}</p>
                  }

                  @if (milestone.tasks && milestone.tasks.length > 0) {
                    <ul class="task-list" role="list">
                      @for (task of milestone.tasks; track task.taskId) {
                        <li class="task-item" [class]="'status-' + task.status">
                          <i class="pi task-status-icon" [ngClass]="getStatusIcon(task.status)"></i>
                          <div class="task-info">
                            <span class="task-title">{{ resolveBilingual(task, 'title') }}</span>
                            <div class="task-meta">
                              <span class="task-priority" [ngClass]="getPriorityClass(task.priority)">
                                {{ task.priority }}
                              </span>
                              @if (task.targetModule) {
                                <span class="task-module">{{ task.targetModule }}</span>
                              }
                              @if (task.frameworkRef) {
                                <span class="task-framework">{{ task.frameworkRef }}</span>
                              }
                            </div>
                          </div>
                          <span class="task-status-label" [class]="'label-' + task.status">
                            {{ getStatusLabel(task.status) }}
                          </span>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* -- Phase timeline -- */
    .phase-timeline { display: flex; flex-direction: column; gap: 0; }
    .phase-section { position: relative; }

    .phase-header {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      cursor: pointer;
      text-align: start;
      transition: all 200ms ease;
      margin-bottom: 2px;
    }

    .phase-header:hover { border-color: var(--primary); box-shadow: var(--shadow-sm); }

    .phase-section.expanded .phase-header {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-color: var(--primary);
    }

    /* -- Phase indicator -- */
    .phase-indicator { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }

    .phase-number {
      width: 32px; height: 32px;
      border-radius: var(--radius-pill);
      display: flex; align-items: center; justify-content: center;
      font-weight: var(--font-black); font-size: var(--font-size-sm);
      border: 2px solid var(--border-subtle);
      background: var(--surface); color: var(--text-muted);
      transition: all 200ms ease;
    }

    .phase-section.active .phase-number { border-color: var(--primary); background: var(--surface-ice); color: var(--primary); }
    .phase-number.completed { border-color: var(--success); background: var(--success); color: var(--text-on-primary); }

    .phase-line { width: 2px; height: 24px; background: var(--border-subtle); margin-top: 4px; }
    .phase-line.completed { background: var(--success); }

    /* -- Phase info -- */
    .phase-info { flex: 1; min-width: 0; }

    .phase-title-row { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs); }
    .phase-title-row .pi { color: var(--primary); font-size: var(--font-size-md); }
    .phase-name { margin: 0; font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading); flex: 1; }

    .phase-weeks {
      font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap;
      padding: 2px 8px; background: var(--surface-sunken); border-radius: var(--radius-md);
    }

    .phase-progress { display: flex; align-items: center; gap: var(--space-sm); }

    .phase-progress-track {
      flex: 1; height: 4px; background: var(--border-subtle);
      border-radius: var(--radius-xs); overflow: hidden;
    }

    .phase-progress-fill {
      height: 100%; background: var(--primary);
      border-radius: var(--radius-xs); transition: width 400ms ease;
    }
    .phase-progress-fill.complete { background: var(--success); }

    .phase-progress-text { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; }

    .expand-icon { color: var(--text-muted); font-size: var(--font-size-base); flex-shrink: 0; margin-top: 8px; }

    /* -- Phase content -- */
    .phase-content {
      background: var(--surface);
      border: 1px solid var(--primary);
      border-top: none;
      border-bottom-left-radius: var(--radius);
      border-bottom-right-radius: var(--radius);
      padding: var(--space-md) var(--space-lg);
      margin-bottom: 2px;
      animation: fadeSlideIn 200ms ease;
    }

    .phase-description {
      margin-bottom: var(--space-md);
      padding: var(--space-sm) var(--space-md);
      background: var(--surface-ice);
      border-radius: var(--radius-sm);
      border-inline-start: 3px solid var(--primary);
    }

    .phase-desc-primary { margin: 0; font-size: var(--font-size-sm); color: var(--text-body); line-height: 1.6; }
    .phase-desc-secondary { margin: var(--space-xs) 0 0; font-size: var(--font-size-xs); color: var(--text-muted); font-style: italic; line-height: 1.5; }

    /* -- Milestone cards -- */
    .milestone-card {
      background: var(--surface-sunken);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: var(--space-md);
      margin-bottom: var(--space-sm);
    }
    .milestone-card.completed { border-color: var(--success); opacity: 0.85; }

    .milestone-header { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs); }
    .milestone-status { flex-shrink: 0; }
    .milestone-done { color: var(--success); font-size: var(--font-size-lg); }
    .milestone-pending { color: var(--text-muted); font-size: var(--font-size-lg); }

    .milestone-info { flex: 1; display: flex; align-items: center; gap: var(--space-sm); }
    .milestone-name { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); flex: 1; }
    .milestone-est { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; }
    .milestone-desc { margin: 0 0 var(--space-sm); font-size: var(--font-size-xs); color: var(--text-muted); padding-inline-start: 30px; }

    /* -- Task list -- */
    .task-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .task-item {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm);
      transition: background 150ms ease;
    }
    .task-item:hover { background: var(--surface); }

    .task-status-icon { font-size: var(--font-size-base); flex-shrink: 0; }
    .status-pending .task-status-icon { color: var(--text-muted); }
    .status-in_progress .task-status-icon { color: var(--primary); }
    .status-completed .task-status-icon { color: var(--success); }
    .status-skipped .task-status-icon { color: var(--text-muted); opacity: 0.5; }

    .task-info { flex: 1; min-width: 0; }
    .task-title { font-size: var(--font-size-sm); color: var(--text-body); display: block; }
    .status-completed .task-title { text-decoration: line-through; opacity: 0.7; }
    .status-skipped .task-title { text-decoration: line-through; opacity: 0.5; }

    .task-meta { display: flex; align-items: center; gap: var(--space-xs); margin-top: 2px; }

    .task-priority {
      font-size: var(--font-size-xs); padding: 1px 6px; border-radius: var(--radius);
      font-weight: var(--font-medium); text-transform: uppercase;
    }

    .priority-critical { background: rgba(239, 68, 68, 0.12); color: var(--danger); }
    .priority-high { background: rgba(245, 158, 11, 0.12); color: var(--warning); }
    .priority-medium { background: rgba(59, 130, 246, 0.12); color: var(--info); }
    .priority-low { background: rgba(148, 163, 184, 0.12); color: var(--text-muted); }

    .task-module, .task-framework { font-size: var(--font-size-xs); color: var(--text-muted); }

    .task-status-label {
      font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-md);
      font-weight: var(--font-medium); white-space: nowrap; flex-shrink: 0;
    }

    .label-pending { background: var(--surface-sunken); color: var(--text-muted); }
    .label-in_progress { background: rgba(14, 165, 233, 0.12); color: var(--primary); }
    .label-completed { background: rgba(34, 197, 94, 0.12); color: var(--success); }
    .label-skipped { background: var(--surface-sunken); color: var(--text-muted); opacity: 0.6; }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .phase-header { padding: var(--space-sm) var(--space-md); gap: var(--space-sm); }
      .phase-content { padding: var(--space-sm) var(--space-md); }
      .phase-title-row { flex-wrap: wrap; }
      .task-item { flex-wrap: wrap; }
      .task-status-label { margin-inline-start: 26px; }
    }
  `],
})
export class RoadmapPhaseTimelineComponent {
  readonly i18n = inject(I18nService);
  private journeyService = inject(JourneyService);

  @Input({ required: true }) phases: RoadmapPhase[] = [];
  @Input({ required: true }) expandedPhases: Set<string> = new Set();
  @Input() showSecondaryLang = true;

  @Output() togglePhase = new EventEmitter<string>();

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  // -- Completion calculations --

  getPhaseCompletion(phase: RoadmapPhase): number {
    const total = this.getTotalTaskCount(phase);
    if (total === 0) return 0;
    return Math.round((this.getCompletedTaskCount(phase) / total) * 100);
  }

  getTotalTaskCount(phase: RoadmapPhase): number {
    return phase.milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0);
  }

  getCompletedTaskCount(phase: RoadmapPhase): number {
    return phase.milestones.reduce(
      (sum, m) => sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
    );
  }

  // -- Bilingual helpers --

  resolveBilingual(record: Record<string, any>, fieldBase: string): string {
    return this.journeyService.resolveBilingual(record, fieldBase);
  }

  getSecondaryText(record: Record<string, any>, fieldBase: string): string {
    const pair = this.journeyService.getBilingualPair(record, fieldBase);
    return this.isAr() ? pair.en : pair.ar;
  }

  // -- Icon/label helpers --

  getPhaseIcon(phaseType: string): string {
    return PHASE_ICONS[phaseType] || 'pi-circle';
  }

  getStatusIcon(status: TaskStatus): string {
    return STATUS_ICONS[status] || 'pi-circle';
  }

  getPriorityClass(priority: string): string {
    return PRIORITY_CLASSES[priority] || 'priority-medium';
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, { en: string; ar: string }> = {
      not_started: { en: 'Not Started', ar: 'لم يبدأ' },
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
      completed: { en: 'Completed', ar: 'مكتمل' },
      blocked: { en: 'Blocked', ar: 'محظور' },
      skipped: { en: 'Skipped', ar: 'تم التخطي' },
    };
    const label = labels[status];
    return this.isAr() ? label.ar : label.en;
  }
}
