import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';

import { SceneTemplate } from '../../models/onboarding.models';
import { BilingualPipe } from '../shared/bilingual.pipe';

/**
 * StageItem represents a single onboarding stage within the story rail.
 * Status drives visual treatment: completed (green check), in_progress (primary),
 * or pending (muted).
 */
export interface StageItem {
  stageCode: string;
  labelEn: string;
  labelAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  iconClass?: string;
  status: 'completed' | 'in_progress' | 'pending';
  percent: number;
}

/**
 * OnboardingStoryRailComponent
 *
 * Vertical timeline sidebar for the onboarding flow. Each stage is represented
 * as a dot-and-label pair connected by a timeline connector. Stages beyond
 * `maxReachable` are visually locked. A system readiness mini-gauge appears at
 * the bottom when `overallConfidence` is provided.
 *
 * Emits `stageSelected` when the user clicks or keyboard-activates a reachable stage.
 */
@Component({
    selector: 'app-onboarding-story-rail',
    imports: [CommonModule, TooltipModule, ProgressBarModule, BilingualPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <nav class="story-rail" [class.rtl]="lang === 'ar'">
      <div class="story-stages">
        <div *ngFor="let stage of stages; let idx = index"
             class="story-stage"
             [class.active]="activeIndex === idx"
             [class.completed]="stage.status === 'completed'"
             [class.locked]="idx > maxReachable"
             (click)="idx <= maxReachable && stageSelected.emit(idx)"
             role="button"
             [attr.tabindex]="idx <= maxReachable ? 0 : -1"
             [attr.aria-label]="(lang === 'ar' ? stage.labelAr : stage.labelEn) + ' — ' + (stage.status === 'completed' ? ({ en: 'Complete', ar: 'مكتمل' } | bilingual:lang) : stage.status === 'in_progress' ? ({ en: 'In progress', ar: 'جارٍ' } | bilingual:lang) : ({ en: 'Pending', ar: 'معلّق' } | bilingual:lang))"
             (keydown.enter)="idx <= maxReachable && stageSelected.emit(idx)">

          <!-- Timeline connector line (not on first) -->
          <div class="story-connector" *ngIf="idx > 0"
               [class.filled]="stage.status === 'completed' || activeIndex >= idx"></div>

          <!-- Stage dot/icon -->
          <div class="story-dot">
            <i *ngIf="stage.status === 'completed'" class="pi pi-check"></i>
            <i *ngIf="stage.status !== 'completed' && getSceneForStage(stage.stageCode)?.icon_class"
               class="pi" [ngClass]="getSceneForStage(stage.stageCode)!.icon_class!"></i>
            <span *ngIf="stage.status !== 'completed' && !getSceneForStage(stage.stageCode)?.icon_class">{{ idx + 1 }}</span>
          </div>

          <!-- Stage text -->
          <div class="story-text">
            <span class="story-label">{{ { en: stage.labelEn, ar: stage.labelAr } | bilingual:lang }}</span>
            <span class="story-sub" *ngIf="stage.status === 'completed'">
              <i class="pi pi-check-circle"></i> {{ { en: 'Complete', ar: 'مكتمل' } | bilingual:lang }}
            </span>
            <span class="story-sub narrative-next" *ngIf="stage.status !== 'completed' && idx === maxReachable + 1">
              {{ { en: 'Coming next', ar: 'التالي' } | bilingual:lang }}
            </span>
            <span class="story-sub narrative-ahead" *ngIf="stage.status !== 'completed' && idx > maxReachable + 1">
              {{ { en: 'Ahead', ar: 'لاحقاً' } | bilingual:lang }}
            </span>
            <span class="story-sub" *ngIf="stage.status !== 'completed' && idx <= maxReachable && getSceneForStage(stage.stageCode) as scene">
              {{ lang === 'ar' ? scene.emotional_purpose_ar : scene.emotional_purpose_en }}
            </span>
            <span class="story-sub" *ngIf="stage.status !== 'completed' && idx <= maxReachable && !getSceneForStage(stage.stageCode)">
              {{ stage.percent | number:'1.0-0' }}%
            </span>
          </div>

          <!-- Stage progress bar (active stage only) -->
          <div class="story-stage-progress" *ngIf="activeIndex === idx && stage.status !== 'completed'">
            <div class="story-stage-progress-fill" [style.width.%]="stage.percent"></div>
          </div>
        </div>
      </div>

      <!-- System Readiness mini-gauge at bottom -->
      <div class="story-readiness" *ngIf="overallConfidence > 0">
        <span class="readiness-label">{{ { en: "Shahin's Readiness", ar: 'جاهزية شاهين' } | bilingual:lang }}</span>
        <div class="readiness-bar">
          <div class="readiness-fill" [style.width.%]="overallConfidence"></div>
        </div>
        <span class="readiness-val">{{ overallConfidence }}%</span>
      </div>
    </nav>
  `,
    styles: [`
    .story-rail {
      padding: 1rem 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .story-stages {
      display: flex;
      flex-direction: column;
    }

    .story-stage {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 1rem;
      cursor: pointer;
      position: relative;
      transition: background 200ms;
    }

    .story-stage:hover:not(.locked) {
      background: var(--surface-hover, #e8e8e8);
    }

    .story-stage.active {
      background: rgba(var(--primary-rgb), 0.06);
      border-inline-start: 3px solid var(--primary);
    }

    .story-stage.locked {
      opacity: 0.45;
      cursor: default;
    }

    /* Timeline connector between stages */
    .story-connector {
      position: absolute;
      top: -8px;
      inset-inline-start: 22px;
      width: 2px;
      height: 16px;
      background: var(--border-subtle);
      transition: background 300ms;
    }

    .story-connector.filled {
      background: var(--primary);
    }

    /* Stage dot indicator */
    .story-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: 700;
      flex-shrink: 0;
      background: var(--surface-border, #e0e0e0);
      color: var(--text-color-secondary);
      transition: all 200ms;
    }

    .story-stage.active .story-dot {
      background: var(--primary);
      color: #fff;
      box-shadow: var(--shadow-glow, 0 0 0 3px rgba(var(--primary-rgb), 0.16));
      animation: rail-pulse 2s ease-in-out infinite;
    }

    @keyframes rail-pulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.16); }
      50% { box-shadow: 0 0 0 5px rgba(var(--primary-rgb), 0.08); }
    }

    .story-stage.completed .story-dot {
      background: var(--success, #24a148);
      color: #fff;
      animation: completed-flash 0.5s ease;
    }

    @keyframes completed-flash {
      0% { box-shadow: 0 0 0 0 rgba(var(--success-rgb), 0.5); }
      50% { box-shadow: 0 0 0 8px rgba(var(--success-rgb), 0); }
      100% { box-shadow: none; }
    }

    /* Stage progress bar below active stage */
    .story-stage-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--surface-border, #e0e0e0);
    }

    .story-stage-progress-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 1px;
      transition: width 0.4s ease;
    }

    /* Stage text area */
    .story-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .story-label {
      font-size: var(--font-size-tag);
      font-weight: 600;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .story-sub {
      font-size: var(--font-size-xs);
      color: var(--text-color-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }

    .story-sub.narrative-next {
      color: var(--primary);
      font-weight: 500;
    }

    .story-sub.narrative-ahead {
      color: var(--text-muted);
      font-style: italic;
    }

    .story-sub .pi-check-circle {
      color: var(--success);
      font-size: var(--font-size-2xs);
    }

    /* System Readiness gauge */
    .story-readiness {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-subtle);
    }

    .readiness-label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: block;
      margin-bottom: 0.35rem;
    }

    .readiness-bar {
      height: 4px;
      background: var(--surface-border);
      border-radius: 2px;
      overflow: hidden;
    }

    .readiness-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 2px;
      transition: width 0.5s ease;
    }

    .readiness-val {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--primary);
      float: inline-end;
      margin-top: 0.2rem;
    }

    /* RTL support */
    .rtl {
      direction: rtl;
    }

    @media (prefers-reduced-motion: reduce) {
      .story-stage.active .story-dot { animation: none; }
      .story-stage.completed .story-dot { animation: none; }
    }
  `]
})
export class OnboardingStoryRailComponent {
  /** Ordered list of onboarding stages to render in the rail. */
  @Input() stages: StageItem[] = [];

  /** Index of the currently active (visible) stage. */
  @Input() activeIndex = 0;

  /** Highest stage index the user is allowed to navigate to. */
  @Input() maxReachable = 0;

  /** Scene templates mapped to stage codes, used for icon and purpose text. */
  @Input() scenes: SceneTemplate[] = [];

  /** Overall system readiness confidence (0-100), shown in the bottom gauge. */
  @Input() overallConfidence = 0;

  /** Active language direction. */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Emitted when the user clicks or keyboard-activates a reachable stage. */
  @Output() stageSelected = new EventEmitter<number>();

  /**
   * Finds the SceneTemplate whose `stage_codes` array includes the given stageCode.
   * Returns null if no matching scene exists.
   */
  getSceneForStage(stageCode: string): SceneTemplate | null {
    return this.scenes.find(s => s.stage_codes.includes(stageCode)) ?? null;
  }

}
