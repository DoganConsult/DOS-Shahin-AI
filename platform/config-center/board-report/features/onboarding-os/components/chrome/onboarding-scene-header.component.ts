import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SceneTemplate } from '../../models/onboarding.models';
import { BilingualPipe } from '../shared/bilingual.pipe';

/**
 * OnboardingSceneHeaderComponent
 *
 * Premium glass-morphism header that displays the current AI scene context
 * during the onboarding flow. Shows Shahin's analysis status, the scene's
 * emotional purpose, and the pain point being addressed.
 *
 * Display-only component -- no outputs.
 */
@Component({
    selector: 'app-onboarding-scene-header',
    imports: [CommonModule, BilingualPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="scene-header" *ngIf="scene" [class.rtl]="lang === 'ar'">
      <!-- AI Activity Badge -->
      <div class="scene-badge" [class.computing]="computing" [class.mapped]="!computing && inferredFactCount > 0">
        <span class="scene-badge-dot"></span>
        <span class="scene-badge-text" *ngIf="computing">
          {{ (scene.inference_shown_en ? { en: scene.inference_shown_en, ar: scene.inference_shown_ar } : { en: 'Shahin is learning about your regulatory landscape...', ar: 'شاهين يتعلم عن مشهدك التنظيمي...' }) | bilingual:lang }}
        </span>
        <span class="scene-badge-text" *ngIf="!computing && inferredFactCount > 0">
          {{ { en: 'Shahin has mapped', ar: 'شاهين حدد' } | bilingual:lang }}
          {{ inferredFactCount }} {{ { en: 'insights (frameworks, controls, regulators)', ar: 'استنتاج (أُطر، ضوابط، جهات رقابية)' } | bilingual:lang }}
          <span class="scene-confidence" *ngIf="overallConfidence > 0">&middot; {{ overallConfidence }}% {{ { en: 'confidence', ar: 'ثقة' } | bilingual:lang }}</span>
        </span>
        <span class="scene-badge-text" *ngIf="!computing && inferredFactCount === 0">{{ { en: 'Shahin is ready — your answers will shape your workspace', ar: 'شاهين جاهز — أجب لبدء الاستنتاج' } | bilingual:lang }}</span>
      </div>

      <!-- Scene Purpose -->
      <div class="scene-purpose">
        <i class="pi" [ngClass]="scene.icon_class || 'pi-star'" aria-hidden="true"></i>
        <span>{{ scene | bilingual:lang:'emotional_purpose' }}</span>
      </div>

      <!-- What this affects — pill chips -->
      <div class="scene-affects-pills" *ngIf="scene.affects_en || scene.affects_ar">
        <span class="scene-affects-label">{{ { en: 'This shapes:', ar: 'يؤثر على:' } | bilingual:lang }}</span>
        <span class="scene-affect-pill" *ngFor="let item of getAffectItems()">{{ item }}</span>
      </div>

      <!-- Pain Addressed -->
      <div class="scene-pain" *ngIf="scene.pain_addressed_en">
        <i class="pi pi-heart" aria-hidden="true"></i>
        <span>{{ scene | bilingual:lang:'pain_addressed' }}</span>
      </div>
    </div>
  `,
    styles: [`
    .scene-header {
      background: var(--onb-scene-bg, rgba(var(--color-white-rgb), 0.82));
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(var(--color-gray-carbon-rgb), 0.4));
      border-radius: var(--radius-lg, 12px);
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      animation: premium-fade-down 0.4s ease both;
    }

    .scene-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: var(--font-size-caption);
      font-weight: 600;
      color: var(--primary);
    }

    .scene-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary);
      flex-shrink: 0;
    }

    .scene-badge.computing .scene-badge-dot {
      animation: pulse-ring 1.5s ease infinite;
    }

    .scene-badge.mapped {
      animation: data-flash 0.6s ease;
    }

    .scene-badge.mapped .scene-badge-dot {
      background: var(--success, #24a148);
    }

    .scene-confidence {
      font-weight: 500;
      opacity: 0.8;
    }

    .scene-purpose {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--font-size-body-sm);
      color: var(--text-heading);
      font-weight: 600;
    }

    .scene-purpose i {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      box-shadow: 0 0 8px 2px var(--onb-ai-glow, rgba(var(--primary-rgb), 0.12));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-tag);
      color: var(--primary);
    }

    .scene-badge-text { line-height: 1.4; }

    .scene-affects-pills {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
      font-size: var(--font-size-caption);
      color: var(--text-muted);
    }

    .scene-affects-label {
      font-weight: 600;
      color: var(--text-body, #525252);
    }

    .scene-affect-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-pill, 20px);
      background: rgba(var(--primary-rgb), 0.06);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(var(--primary-rgb), 0.12);
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--primary);
      white-space: nowrap;
    }

    .scene-pain {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: var(--font-size-caption);
      color: var(--text-muted);
    }

    .scene-pain i {
      color: var(--orange-400, #ff8c00);
    }

    .rtl {
      direction: rtl;
    }

    @keyframes premium-fade-down {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse-ring {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.6);
        opacity: 0.4;
      }
    }

    @keyframes data-flash {
      0% { background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.12)); }
      50% { background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.22)); }
      100% { background: transparent; }
    }

    @media (prefers-reduced-motion: reduce) {
      .scene-header { animation: none; }
      .scene-badge-dot { animation: none !important; }
      .scene-badge.mapped { animation: none; }
    }
  `]
})
export class OnboardingSceneHeaderComponent {
  /** Current scene template driving the header display */
  @Input() scene: SceneTemplate | null = null;

  /** Number of governance signals Shahin has inferred so far */
  @Input() inferredFactCount = 0;

  /** Overall AI confidence percentage (0-100) */
  @Input() overallConfidence = 0;

  /** Whether Shahin is actively analyzing */
  @Input() computing = false;

  /** Active language for bilingual label switching */
  @Input() lang: 'en' | 'ar' = 'en';

  /**
   * Splits the affects text on comma, Arabic comma, or middot into individual pill items.
   */
  getAffectItems(): string[] {
    if (!this.scene) return [];
    const raw = this.lang === 'ar'
      ? (this.scene.affects_ar || this.scene.affects_en)
      : this.scene.affects_en;
    if (!raw) return [];
    return raw.split(/[,،·]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }
}
