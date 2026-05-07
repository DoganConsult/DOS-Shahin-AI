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
  caseId: string;
  titleEn: string;
  titleAr?: string;
  caseType?: 'governance' | 'audit' | 'incident' | 'exception' | 'third-party';
  originRef?: string;
  decision?: 'approve' | 'reject' | 'accept-risk' | 'escalate' | 'defer';
  decisionOwner?: string;
  decisionAt?: string;
  signoffStatus?: 'pending' | 'partial' | 'complete' | 'rejected';
  evidenceUrl?: string;
  rationaleEn?: string;
  rationaleAr?: string;
  nextReviewAt?: string;
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
            @for (c of cases; track c.caseId) {
              <div class="dos-case-row" [attr.data-case-id]="c.caseId">
                <strong>{{ c.titleEn }}</strong>
                @if (c.caseType) { <cds-tag type="cool-gray">{{ c.caseType }}</cds-tag> }
                @if (c.status) { <cds-tag [type]="statusTone(c.status)">{{ c.status }}</cds-tag> }
                @if (c.signoffStatus) {
                  <cds-tag [type]="signoffTone(c.signoffStatus)">sign-off: {{ c.signoffStatus }}</cds-tag>
                }
                @if (c.decision) { <cds-tag type="purple">{{ c.decision }}</cds-tag> }
                @if (c.decisionOwner) { <span class="dos-case-owner">{{ c.decisionOwner }}</span> }
                @if (c.evidenceUrl) {
                  <a [attr.href]="c.evidenceUrl" target="_blank" rel="noopener">evidence</a>
                }
              </div>
            } @empty {
              <p class="dos-case-empty">No cases in this view yet.</p>
            }
          </cds-structured-list>
        </cds-tab>
        <cds-tab heading="Rationale">
          @for (c of cases; track c.caseId) {
            @if (c.rationaleEn) {
              <p><strong>{{ c.caseId }}:</strong> {{ c.rationaleEn }}</p>
            }
          }
        </cds-tab>
      </cds-tabs>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-case-row {
      display: flex; flex-wrap: wrap;
      gap: var(--cds-spacing-03);
      align-items: center; padding: var(--cds-spacing-03) 0;
    }
    .dos-case-owner { color: var(--cds-text-secondary); }
    .dos-case-empty { padding: var(--cds-spacing-05); color: var(--cds-text-secondary); }

    /* Mobile-first responsive polish — stack badges/labels at narrow
       viewports so the case row remains readable without horizontal
       scroll. Aligned with the workspace shell breakpoint policy. */
    @media (max-width: 672px) {
      .dos-case-row { flex-direction: column; align-items: flex-start; gap: var(--cds-spacing-02); }
      .dos-case-row > strong { font-size: 1rem; }
      .dos-case-empty { padding: var(--cds-spacing-04); }
    }
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
  signoffTone(s: CaseFinalizationRow['signoffStatus']): string {
    return s === 'complete' ? 'green'
         : s === 'partial'  ? 'teal'
         : s === 'rejected' ? 'red'
         : 'gray';
  }
}
