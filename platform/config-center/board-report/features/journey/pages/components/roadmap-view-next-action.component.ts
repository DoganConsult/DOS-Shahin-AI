/**
 * Roadmap View Next Action — "What should I do next?" copilot button
 * with recommended action card.
 *
 * Presentational child of RoadmapViewComponent.
 */
import { GrcRecord } from '@app/core/models/shared.types';

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { NextActionResponse, RoadmapTask } from '@app/core/services/user-account/journey.service';

/** Priority color mapping */
const PRIORITY_CLASSES: Record<string, string> = {
  critical: 'priority-critical',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-roadmap-next-action',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Overall progress bar -->
    <div class="overall-progress" role="progressbar"
         [attr.aria-valuenow]="overallCompletion"
         aria-valuemin="0" aria-valuemax="100"
         [attr.aria-label]="isAr() ? 'التقدم الإجمالي' : 'Overall progress'">
      <div class="overall-progress-header">
        <span class="overall-label">{{ isAr() ? 'التقدم الإجمالي' : 'Overall Progress' }}</span>
        <span class="overall-percent">{{ overallCompletion }}%</span>
      </div>
      <div class="overall-track">
        <div class="overall-fill" [style.width.%]="overallCompletion"></div>
      </div>
    </div>

    <!-- "What should I do next?" button -->
    <div class="next-action-section">
      <button class="btn-next-action" (click)="fetchNext.emit()" [disabled]="loadingNext">
        @if (loadingNext) {
          <i class="pi pi-spin pi-spinner"></i>
        } @else {
          <i class="pi pi-compass"></i>
        }
        {{ isAr() ? 'ماذا يجب أن أفعل بعد ذلك؟' : 'What should I do next?' }}
      </button>

      @if (nextAction) {
        <div class="next-action-card" role="alert">
          <div class="next-action-header">
            <i class="pi pi-arrow-right"></i>
            <span>{{ isAr() ? 'الإجراء التالي الموصى به' : 'Recommended Next Action' }}</span>
          </div>
          @if (nextAction.task) {
            <div class="next-action-body">
              <span class="next-action-title">
                {{ resolveBilingual(nextAction.task, 'title') }}
              </span>
              <span class="next-action-priority"
                    [ngClass]="getPriorityClass(nextAction.task.priority)">
                {{ nextAction.task.priority }}
              </span>
            </div>
            @if (nextAction.task.descriptionEn || nextAction.task.descriptionAr) {
              <p class="next-action-desc">
                {{ resolveBilingual(nextAction.task, 'description') }}
              </p>
            }
            <button class="btn-go-to-task" (click)="navigateToTask.emit(nextAction.task)">
              <i class="pi pi-external-link"></i>
              {{ isAr() ? 'الانتقال إلى المهمة' : 'Go to Task' }}
            </button>
          } @else {
            <p class="next-action-desc">
              {{ nextAction.message || (isAr() ? 'جميع المهام مكتملة!' : 'All tasks completed!') }}
            </p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* -- Overall progress -- */
    .overall-progress {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--space-md) var(--space-lg);
      margin-bottom: var(--space-md);
    }

    .overall-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-sm);
    }

    .overall-label { font-weight: var(--font-bold); font-size: var(--font-size-sm); color: var(--text-heading); }
    .overall-percent { font-weight: var(--font-black); font-size: var(--font-size-lg); color: var(--primary); }

    .overall-track {
      height: 8px;
      background: var(--border-subtle);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }

    .overall-fill {
      height: 100%;
      background: var(--primary);
      border-radius: var(--radius-xs);
      transition: width 600ms ease;
    }

    /* -- Next action section -- */
    .next-action-section {
      margin-bottom: var(--space-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-md);
    }

    .btn-next-action {
      padding: var(--space-sm) var(--space-xl);
      border-radius: var(--radius);
      border: 2px solid var(--primary);
      background: var(--surface-ice);
      color: var(--primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      transition: all 200ms ease;
    }

    .btn-next-action:hover:not(:disabled) { background: var(--primary); color: var(--text-on-primary); }
    .btn-next-action:disabled { opacity: 0.6; cursor: not-allowed; }

    .next-action-card {
      width: 100%;
      max-width: 600px;
      background: var(--surface);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius);
      padding: var(--space-md);
      animation: fadeSlideIn 300ms ease;
    }

    .next-action-header {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      color: var(--primary);
      font-weight: var(--font-bold);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-sm);
    }

    .next-action-body {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-xs);
    }

    .next-action-title { font-weight: var(--font-bold); font-size: var(--font-size-base); color: var(--text-heading); }
    .next-action-desc { margin: 0 0 var(--space-sm); font-size: var(--font-size-sm); color: var(--text-muted); }

    .next-action-priority {
      font-size: var(--font-size-xs);
      padding: 1px 6px;
      border-radius: var(--radius);
      font-weight: var(--font-medium);
      text-transform: uppercase;
    }

    .priority-critical { background: rgba(239, 68, 68, 0.12); color: var(--danger); }
    .priority-high { background: rgba(245, 158, 11, 0.12); color: var(--warning); }
    .priority-medium { background: rgba(59, 130, 246, 0.12); color: var(--info); }
    .priority-low { background: rgba(148, 163, 184, 0.12); color: var(--text-muted); }

    .btn-go-to-task {
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-sm);
      border: 1px solid var(--primary);
      background: transparent;
      color: var(--primary);
      font-size: var(--font-size-xs);
      font-weight: var(--font-medium);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      transition: all 200ms ease;
    }

    .btn-go-to-task:hover { background: var(--primary); color: var(--text-on-primary); }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .next-action-card { max-width: 100%; }
      .overall-progress { padding: var(--space-sm) var(--space-md); }
    }
  `],
})
export class RoadmapNextActionComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) overallCompletion = 0;
  @Input() nextAction: NextActionResponse | null = null;
  @Input() loadingNext = false;

  @Output() fetchNext = new EventEmitter<void>();
  @Output() navigateToTask = new EventEmitter<RoadmapTask>();

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  resolveBilingual(record: Record<string, any>, fieldBase: string): string {
    const lang = this.isAr() ? 'ar' : 'en';
    const arKey = `${fieldBase}Ar`;
    const enKey = `${fieldBase}En`;
    if (lang === 'ar') return record[arKey] || record[enKey] || '';
    return record[enKey] || record[arKey] || '';
  }

  getPriorityClass(priority: string): string {
    return PRIORITY_CLASSES[priority] || 'priority-medium';
  }
}
