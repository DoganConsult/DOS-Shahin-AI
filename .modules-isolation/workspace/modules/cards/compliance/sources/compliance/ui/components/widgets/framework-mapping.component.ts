import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FrameworkMappingComponent — compliance signature widget for
 * `/compliance/frameworks`, `/compliance/regulator`, `/compliance/ksa`.
 *
 * Spec ref: §32.3 (Framework Mapping View), §35.3. Renders cross-framework
 * crosswalks (e.g. NCA ↔ ISO27001 ↔ SAMA) as a sankey-style flow OR a
 * simple two-column mapping list. This stub uses the list form; the sankey
 * version is a follow-up.
 */

export interface FrameworkMappingPair {
  sourceFrameworkCode: string;
  sourceControlCode: string;
  sourceControlTitle?: string;
  targetFrameworkCode: string;
  targetControlCode: string;
  targetControlTitle?: string;
  confidence: number; // 0..1
  validatedBy?: 'ai' | 'human' | 'auto';
}

@Component({
  selector: 'compliance-framework-mapping',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fm" aria-label="Framework Mapping">
      <header class="fm__head">
        <h3 class="fm__title">{{ titleKey }}</h3>
        <span class="fm__count">{{ pairs.length }} crosswalks</span>
      </header>
      <ul class="fm__list">
        <li
          *ngFor="let p of pairs; trackBy: trackP"
          class="fm__pair"
          [attr.data-confidence]="confidenceTier(p.confidence)"
          (click)="pairClick.emit(p)"
        >
          <div class="fm__src">
            <strong>{{ p.sourceFrameworkCode }}</strong> · {{ p.sourceControlCode }}
            <small *ngIf="p.sourceControlTitle">{{ p.sourceControlTitle }}</small>
          </div>
          <span class="fm__arrow" aria-hidden="true">→</span>
          <div class="fm__tgt">
            <strong>{{ p.targetFrameworkCode }}</strong> · {{ p.targetControlCode }}
            <small *ngIf="p.targetControlTitle">{{ p.targetControlTitle }}</small>
          </div>
          <span class="fm__conf">{{ (p.confidence * 100) | number: '1.0-0' }}%<small *ngIf="p.validatedBy"> · {{ p.validatedBy }}</small></span>
        </li>
      </ul>
      <p *ngIf="pairs.length === 0" class="fm__empty">{{ emptyKey || 'No crosswalks defined.' }}</p>
    </section>
  `,
  styles: [`
    .fm { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); }
    .fm__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .fm__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .fm__count { font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .fm__list { list-style: none; padding: 0; margin: 0; }
    .fm__pair { display: grid; grid-template-columns: 1fr auto 1fr auto; gap: 0.5rem; padding: 0.5rem 0.75rem; align-items: center; cursor: pointer; border-bottom: 1px solid var(--cds-border-subtle-01, #e0e0e0); }
    .fm__pair:hover { background: var(--cds-layer-hover-01, #e8e8e8); }
    .fm__pair[data-confidence="low"]    { border-left: 3px solid var(--cds-support-warning, #f1c21b); }
    .fm__pair[data-confidence="high"]   { border-left: 3px solid var(--cds-support-success, #24a148); }
    .fm__src strong, .fm__tgt strong { font-size: 0.875rem; }
    .fm__src small, .fm__tgt small { display: block; color: var(--cds-text-secondary, #525252); font-size: 0.75rem; }
    .fm__arrow { color: var(--cds-text-secondary, #525252); }
    .fm__conf { font-size: 0.75rem; font-variant-numeric: tabular-nums; }
    .fm__empty { color: var(--cds-text-secondary, #525252); font-style: italic; }
  `],
})
export class FrameworkMappingComponent {
  @Input() titleKey = 'Framework Mapping';
  @Input() emptyKey?: string;
  @Input() pairs: FrameworkMappingPair[] = [];

  @Output() pairClick = new EventEmitter<FrameworkMappingPair>();

  confidenceTier(c: number): 'low' | 'medium' | 'high' {
    if (c < 0.5) return 'low';
    if (c < 0.85) return 'medium';
    return 'high';
  }

  trackP = (_: number, p: FrameworkMappingPair) =>
    `${p.sourceFrameworkCode}:${p.sourceControlCode}->${p.targetFrameworkCode}:${p.targetControlCode}`;
}
