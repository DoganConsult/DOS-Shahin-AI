import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneTemplate } from '../../models/onboarding.models';

@Component({
    selector: 'app-scene-value-preview',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="value-preview" *ngIf="scene?.value_preview_en || scene?.value_preview_ar" [class.rtl]="lang === 'ar'">
      <div class="value-preview-icon"><i class="pi pi-sparkles"></i></div>
      <div class="value-preview-content">
        <span class="value-preview-label">{{ lang === 'ar' ? 'ما سيُمكّنه هذا' : 'What this enables' }}</span>
        <span class="value-preview-text">{{ lang === 'ar' ? (scene?.value_preview_ar || scene?.value_preview_en) : scene?.value_preview_en }}</span>
      </div>
    </div>
  `,
    styles: [`
    .value-preview {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.6rem 0.85rem; margin-top: 0.5rem;
      background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.03) 0%, rgba(var(--color-blue-40-rgb), 0.05) 100%);
      border: 1px solid rgba(var(--primary-rgb), 0.1);
      border-radius: var(--radius, 8px);
      animation: vp-fade 0.4s ease both;
    }
    .value-preview-icon {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .value-preview-icon i { font-size: var(--font-size-xs); color: var(--primary, #0f62fe); }
    .value-preview-content { display: flex; flex-direction: column; gap: 0.15rem; }
    .value-preview-label {
      font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--primary, #0f62fe);
    }
    .value-preview-text {
      font-size: var(--font-size-caption); color: var(--text-body); line-height: 1.45;
    }
    .rtl { direction: rtl; }
    @keyframes vp-fade {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .value-preview { animation: none !important; }
    }
  `]
})
export class SceneValuePreviewComponent {
  @Input() scene: SceneTemplate | null = null;
  @Input() lang: 'en' | 'ar' = 'en';
}
