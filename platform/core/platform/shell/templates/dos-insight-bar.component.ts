/**
 * Universal Insight Bar — renders the 5 mandatory content pillars
 * on every module page.
 *
 * Information → Decision → Action → Evidence
 *
 * Pillars:
 *   1. What changed?       (change signal — "dropped 12 pts")
 *   2. Why it matters?     (business impact — "board review in 8 days")
 *   3. Risk / Opportunity? (exposure — "3 unmitigated critical risks")
 *   4. What should I do?   (next action CTA)
 *   5. What's the proof?   (evidence basis — "based on 47 records")
 *
 * IBM Carbon used (active): notification · tag · button · tiles · ai-label · structured-list
 */
import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TilesModule, TagModule, ButtonModule, NotificationModule,
  StructuredListModule, LinkModule, IconModule
} from 'carbon-components-angular';
import { ModuleInsightPillars } from './module-template.types';

@Component({
  selector: 'dos-insight-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    TilesModule, TagModule, ButtonModule, NotificationModule,
    StructuredListModule, LinkModule, IconModule,
  ],
  template: `
    @if (pillars && hasAnyPillar()) {
      <div class="dib-root" [attr.data-archetype]="archetype">

        <!-- Pillar 1: What Changed? -->
        @if (pillars.whatChanged) {
          <div class="dib-pillar dib-pillar--change">
            <span class="dib-pillar-label">What changed?</span>
            <cds-ai-label kind="inline" size="sm" class="dib-ai-badge">AI</cds-ai-label>
            <p class="dib-pillar-value">{{ pillars.whatChanged }}</p>
          </div>
        }

        <!-- Pillar 2: Why It Matters? -->
        @if (pillars.whyItMatters) {
          <div class="dib-pillar dib-pillar--why">
            <span class="dib-pillar-label">Why it matters</span>
            <p class="dib-pillar-value dib-value--warning">{{ pillars.whyItMatters }}</p>
          </div>
        }

        <!-- Pillar 3: Risk / Opportunity -->
        @if (pillars.riskOrOpportunity) {
          <div class="dib-pillar dib-pillar--risk">
            <span class="dib-pillar-label">Risk / Opportunity</span>
            <p class="dib-pillar-value dib-value--critical">{{ pillars.riskOrOpportunity }}</p>
          </div>
        }

        <!-- Pillar 4: Next Action (CTA) -->
        @if (pillars.nextAction) {
          <div class="dib-pillar dib-pillar--action">
            <span class="dib-pillar-label">What should I do?</span>
            <button cdsButton="primary" size="sm"
              class="dib-cta-btn"
              (click)="pillars!.nextAction!.action?.(); actionClick.emit(pillars!.nextAction)">
              {{ pillars.nextAction.label }}
            </button>
          </div>
        }

        <!-- Pillar 5: Evidence Basis -->
        @if (pillars.evidence) {
          <div class="dib-pillar dib-pillar--evidence">
            <span class="dib-pillar-label">Evidence basis</span>
            <p class="dib-pillar-value dib-value--muted">{{ pillars.evidence }}</p>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .dib-root {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0;
      background: var(--cds-layer);
      border-top: 1px solid var(--cds-border-subtle);
      border-bottom: 3px solid var(--cds-interactive);
      margin-bottom: 1rem;
    }

    .dib-pillar {
      padding: 1rem 1.25rem;
      border-right: 1px solid var(--cds-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .dib-pillar:last-child { border-right: none; }

    /* Left border accent per pillar */
    .dib-pillar--change  { border-left: 3px solid var(--cds-support-info); }
    .dib-pillar--why     { border-left: 3px solid var(--cds-support-warning); }
    .dib-pillar--risk    { border-left: 3px solid var(--cds-support-error); }
    .dib-pillar--action  { border-left: 3px solid var(--cds-interactive); }
    .dib-pillar--evidence { border-left: 3px solid var(--cds-support-success); }

    .dib-pillar-label {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--cds-text-secondary);
      font-weight: 600;
      line-height: 1;
    }

    .dib-pillar-value {
      font-size: 0.8125rem;
      line-height: 1.4;
      margin: 0;
      font-weight: 400;
    }

    .dib-value--warning  { color: var(--cds-support-warning-inverse, #f1c21b); font-weight: 500; }
    .dib-value--critical { color: var(--cds-support-error); font-weight: 500; }
    .dib-value--muted    { color: var(--cds-text-secondary); font-size: 0.75rem; }

    .dib-ai-badge { margin-bottom: 0.25rem; }
    .dib-cta-btn  { margin-top: 0.25rem; align-self: flex-start; }

    /* Collapse to 2-col on tablet, stacked on mobile */
    @media (max-width: 1200px) {
      .dib-root { grid-template-columns: repeat(3, 1fr); }
      .dib-pillar { border-right: 1px solid var(--cds-border-subtle); }
    }
    @media (max-width: 768px) {
      .dib-root { grid-template-columns: 1fr 1fr; }
      .dib-pillar--action { grid-column: 1 / -1; }
    }
    @media (max-width: 480px) {
      .dib-root { grid-template-columns: 1fr; }
    }
  `]
})
export class DosInsightBarComponent {
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() archetype = '';
  @Output() actionClick = new EventEmitter<unknown>();

  hasAnyPillar(): boolean {
    return !!(this.pillars?.whatChanged || this.pillars?.whyItMatters ||
      this.pillars?.riskOrOpportunity || this.pillars?.nextAction || this.pillars?.evidence);
  }
}
