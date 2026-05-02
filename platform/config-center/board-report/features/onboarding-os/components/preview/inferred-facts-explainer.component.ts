import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import type { InferredFact } from '../../models/onboarding.models';
import { FactNamePipe } from '../shared/fact-name.pipe';

/**
 * InferredFactsExplainerComponent
 *
 * Shows each inferred fact with WHY Shahin inferred it — linking
 * back to the source question codes that triggered the inference.
 * Users can confirm or dispute each fact.
 *
 * This is explainable AI for governance — a market differentiator.
 */
@Component({
    selector: 'app-inferred-facts-explainer',
    imports: [CommonModule, ButtonModule, TagModule, FactNamePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="facts" [class.rtl]="lang === 'ar'">
      <div class="facts-header">
        <h4>
          <i class="pi pi-bolt"></i>
          {{ lang === 'ar' ? 'لماذا استنتج شاهين هذا؟' : 'Why Did Shahin Infer This?' }}
        </h4>
        <p class="facts-sub">{{ lang === 'ar'
          ? 'كل استنتاج قابل للتتبع — يمكنك رؤية الأسئلة المصدرية وتأكيد أو تعديل أي استنتاج.'
          : 'Every inference is traceable — you can see source questions and confirm or adjust any finding.' }}</p>
      </div>

      <div *ngIf="facts.length === 0" class="facts-empty">
        {{ lang === 'ar' ? 'لم يستنتج شاهين حقائق بعد — أجب على المزيد من الأسئلة.' : 'Shahin has not inferred any facts yet — answer more questions.' }}
      </div>

      <div *ngFor="let fact of facts; let i = index" class="fact-card" [style.animation-delay]="(i * 50) + 'ms'">
        <div class="fact-top">
          <span class="fact-name">{{ fact.fact_code | factName:lang }}</span>
          <div class="fact-badges">
            <p-tag [value]="fact.inference_method === 'rule' ? (lang === 'ar' ? 'قاعدة' : 'Rule') : (lang === 'ar' ? 'افتراضي' : 'Default')"
              [severity]="fact.inference_method === 'rule' ? 'info' : 'warning'" [rounded]="true" />
            <span class="fact-confidence" [class.high]="fact.confidence >= 0.8" [class.medium]="fact.confidence >= 0.5 && fact.confidence < 0.8" [class.low]="fact.confidence < 0.5">
              {{ (fact.confidence * 100) | number:'1.0-0' }}%
            </span>
          </div>
        </div>

        <!-- Source questions (the "why") -->
        <div class="fact-sources" *ngIf="fact.source_question_codes?.length > 0">
          <span class="fact-sources-label">
            <i class="pi pi-link"></i>
            {{ lang === 'ar' ? 'بسبب إجاباتك على:' : 'Because you answered:' }}
          </span>
          <div class="fact-source-list">
            <span *ngFor="let qCode of fact.source_question_codes" class="fact-source-tag">{{ formatQuestionCode(qCode) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="fact-actions">
          <button *ngIf="!fact.is_confirmed" pButton class="p-button-sm p-button-outlined p-button-success"
            [label]="lang === 'ar' ? 'تأكيد' : 'Confirm'"
            icon="pi pi-check" (click)="factConfirmed.emit(fact.fact_code)"></button>
          <span *ngIf="fact.is_confirmed" class="fact-confirmed">
            <i class="pi pi-check-circle"></i> {{ lang === 'ar' ? 'مؤكد' : 'Confirmed' }}
          </span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .facts { }
    .facts.rtl { direction: rtl; }

    .facts-header { margin-bottom: 1rem; }
    .facts-header h4 {
      font-size: var(--font-size-body-sm); font-weight: 700; color: var(--text-heading, #161616);
      display: flex; align-items: center; gap: 0.4rem; margin: 0 0 0.3rem;
    }
    .facts-header h4 i { color: var(--primary, #0f62fe); }
    .facts-sub { font-size: var(--font-size-caption); color: var(--text-muted, #6f6f6f); margin: 0; line-height: 1.5; }

    .facts-empty {
      font-size: var(--font-size-tag); color: var(--text-muted); font-style: italic; padding: 1rem 0;
    }

    .fact-card {
      padding: 0.85rem 1rem; margin-bottom: 0.5rem;
      background: var(--surface, #fff);
      border: 1px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.06));
      border-radius: var(--radius-md, 10px);
      animation: factIn 0.3s ease both;
    }

    .fact-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.35rem;
    }
    .fact-name { font-size: 0.88rem; font-weight: 600; color: var(--text-heading); }
    .fact-badges { display: flex; align-items: center; gap: 0.4rem; }

    .fact-confidence {
      font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.45rem;
      border-radius: var(--radius-pill, 20px);
    }
    .fact-confidence.high { background: var(--status-success-bg, #defbe6); color: var(--status-success, #24a148); }
    .fact-confidence.medium { background: var(--status-warning-bg, #fcf4d6); color: #946800; }
    .fact-confidence.low { background: var(--status-danger-bg, #fff1f1); color: var(--status-danger, #da1e28); }

    .fact-sources { margin-top: 0.35rem; }
    .fact-sources-label {
      font-size: var(--font-size-sm); color: var(--text-body, #525252); font-weight: 500;
      display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.25rem;
    }
    .fact-sources-label i { font-size: var(--font-size-2xs); color: var(--primary); }

    .fact-source-list { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .fact-source-tag {
      font-size: 0.68rem; padding: 0.12rem 0.4rem;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      border-radius: var(--radius-pill, 20px);
      color: var(--text-body, #525252); font-weight: 500;
    }

    .fact-actions { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .fact-confirmed {
      font-size: var(--font-size-caption); color: var(--status-success, #24a148);
      display: flex; align-items: center; gap: 0.25rem; font-weight: 600;
    }

    @keyframes factIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .fact-card { animation: none !important; }
    }
  `]
})
export class InferredFactsExplainerComponent {
  @Input() facts: InferredFact[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() factConfirmed = new EventEmitter<string>();

  /** Converts question_code like 'org.industry' to 'Industry' */
  formatQuestionCode(code: string): string {
    const parts = code.split('.');
    const last = parts[parts.length - 1];
    return last.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
