import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegulatorExplanation } from '../../models/onboarding.models';

@Component({
    selector: 'app-regulator-explainer',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="reg-explainer" *ngIf="explanations.length > 0" [class.rtl]="lang === 'ar'">
      <div class="reg-explainer-header">
        <i class="pi pi-info-circle"></i>
        {{ lang === 'ar' ? 'دليل الجهات الرقابية' : 'Regulator Guide' }}
      </div>
      <div *ngFor="let exp of explanations" class="reg-card">
        <div class="reg-card-head" (click)="toggleExpanded(exp.regulator_code)"
          role="button" tabindex="0" (keydown.enter)="toggleExpanded(exp.regulator_code)"
          (keydown.space)="toggleExpanded(exp.regulator_code); $event.preventDefault()"
          [attr.aria-expanded]="isExpanded(exp.regulator_code)">
          <span class="reg-code-badge">{{ exp.regulator_code }}</span>
          <span class="reg-fw-badge" *ngIf="exp.framework_code">{{ exp.framework_code }}</span>
          <i class="pi" [ngClass]="isExpanded(exp.regulator_code) ? 'pi-chevron-down' : 'pi-chevron-right'"
            style="margin-inline-start:auto;font-size:0.65rem;color:var(--text-muted)"></i>
        </div>
        <div class="reg-card-body" *ngIf="isExpanded(exp.regulator_code)">
          <p>{{ lang === 'ar' ? exp.explanation_ar : exp.explanation_en }}</p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .reg-explainer {
      border-top: 1px solid var(--glass-border, rgba(var(--color-gray-carbon-rgb), 0.4));
      padding: 0.75rem 1rem;
    }
    .reg-explainer-header {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .reg-explainer-header i { font-size: var(--font-size-sm); color: var(--primary); }
    .reg-card {
      border: 1px solid var(--border-subtle); border-radius: var(--radius-sm, 6px);
      margin-bottom: 0.35rem; overflow: hidden;
    }
    .reg-card-head {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.4rem 0.6rem; cursor: pointer;
      transition: background 150ms; font-size: var(--font-size-sm);
    }
    .reg-card-head:hover { background: rgba(var(--color-black-rgb), 0.02); }
    .reg-code-badge {
      font-size: var(--font-size-2xs); font-weight: 700; color: var(--primary);
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      padding: 0.1rem 0.35rem; border-radius: 3px;
    }
    .reg-fw-badge {
      font-size: 0.6rem; color: var(--text-muted);
    }
    .reg-card-body {
      padding: 0 0.6rem 0.5rem;
      animation: reg-expand 0.2s ease;
    }
    .reg-card-body p {
      font-size: var(--font-size-sm); color: var(--text-body); line-height: 1.5; margin: 0;
    }
    .rtl { direction: rtl; }
    @keyframes reg-expand {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 200px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .reg-card-body { animation: none !important; }
    }
  `]
})
export class RegulatorExplainerComponent {
  @Input() explanations: RegulatorExplanation[] = [];
  @Input() lang: 'en' | 'ar' = 'en';

  private expanded = signal<Set<string>>(new Set());

  isExpanded(code: string): boolean {
    return this.expanded().has(code);
  }

  toggleExpanded(code: string): void {
    this.expanded.update(s => {
      const next = new Set(s);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }
}
