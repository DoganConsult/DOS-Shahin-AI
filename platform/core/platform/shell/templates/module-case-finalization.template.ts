/**
 * Template T32 — Case Finalization
 * Selector: dos-case-finalization
 * component_key: module.case_finalization.page
 *
 * Story: "Here is everything needed to close this case."
 * Answers: Decision? Owner? Sign-off status? Linked evidence? Rationale?
 *
 * Carbon-only: composes IBM Carbon `tabs` primitive + structured-list +
 * tag + button. No PrimeNG. No raw HTML chrome.
 */
import {
  Component, Input,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import type { ModuleInsightPillars } from './module-template.types';

export interface CaseFinalizationRow {
  case_id: string;
  title_en: string;
  title_ar?: string;
  case_type?: 'governance' | 'audit' | 'incident' | 'exception' | 'third-party';
  origin_ref?: string;
  decision?: 'approve' | 'reject' | 'accept-risk' | 'escalate' | 'defer';
  decision_owner?: string;
  decision_at?: string;
  signoff_status?: 'pending' | 'partial' | 'complete' | 'rejected';
  evidence_uri?: string;
  rationale_en?: string;
  rationale_ar?: string;
  next_review_at?: string;
  status?: 'open' | 'in-review' | 'finalized' | 'reopened';
}

@Component({
  selector: 'dos-case-finalization',
  standalone: true,
  imports: [CommonModule, DosInsightBarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-case-finalization" data-testid="dos-case-finalization">
      <dos-insight-bar [pillars]="pillars" archetype="case-finalization"></dos-insight-bar>

      <cds-tabs>
        <cds-tab heading="Cases">
          <cds-structured-list>
            @for (c of cases; track c.case_id) {
              <div class="dos-case-row" [attr.data-case-id]="c.case_id">
                <strong>{{ c.title_en }}</strong>
                @if (c.case_type) { <cds-tag type="cool-gray">{{ c.case_type }}</cds-tag> }
                @if (c.status) { <cds-tag [type]="statusTone(c.status)">{{ c.status }}</cds-tag> }
                @if (c.signoff_status) {
                  <cds-tag [type]="signoffTone(c.signoff_status)">sign-off: {{ c.signoff_status }}</cds-tag>
                }
                @if (c.decision) { <cds-tag type="purple">{{ c.decision }}</cds-tag> }
                @if (c.decision_owner) { <span class="dos-case-owner">{{ c.decision_owner }}</span> }
                @if (c.evidence_uri) {
                  <a [attr.href]="c.evidence_uri" target="_blank" rel="noopener">evidence</a>
                }
              </div>
            } @empty {
              <p class="dos-case-empty">No cases in this view yet.</p>
            }
          </cds-structured-list>
        </cds-tab>
        <cds-tab heading="Rationale">
          @for (c of cases; track c.case_id) {
            @if (c.rationale_en) {
              <p><strong>{{ c.case_id }}:</strong> {{ c.rationale_en }}</p>
            }
          }
        </cds-tab>
      </cds-tabs>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-case-row { display: flex; gap: .5rem; align-items: center; padding: .5rem 0; }
    .dos-case-owner { color: var(--cds-text-secondary, #6f6f6f); }
    .dos-case-empty { padding: 1rem; color: var(--cds-text-secondary, #6f6f6f); }
  `],
})
export class CaseFinalizationTemplateComponent {
  @Input() cases: CaseFinalizationRow[] = [];
  @Input() pillars: ModuleInsightPillars = {
    whatChanged: 'Cases pending finalization.',
    evidence: 'Sign-off ledger + linked evidence per case.',
  };

  statusTone(s: CaseFinalizationRow['status']): string {
    return s === 'finalized' ? 'green'
         : s === 'in-review' ? 'blue'
         : s === 'reopened'  ? 'magenta'
         : 'gray';
  }
  signoffTone(s: CaseFinalizationRow['signoff_status']): string {
    return s === 'complete' ? 'green'
         : s === 'partial'  ? 'teal'
         : s === 'rejected' ? 'red'
         : 'gray';
  }
}
