import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AssessmentCockpitComponent — compliance signature widget for `/compliance/assessments`.
 *
 * Spec ref: §32.3, §35.3. Renders the active assessment with progress,
 * remaining controls, evidence checklist, and a "Submit for review" action.
 * Composes with `dos-workflow-canvas` for the lifecycle strip and
 * `dos-decision-preview-panel` for risky writes (approve / reject).
 */

export interface AssessmentSummary {
  assessmentId: string;
  frameworkCode: string;
  scope?: string;
  totalControls: number;
  completedControls: number;
  evidenceProvided: number;
  evidenceRequired: number;
  status: 'draft' | 'in-progress' | 'pending-review' | 'approved' | 'rejected';
  dueDate?: string;
}

@Component({
  selector: 'compliance-assessment-cockpit',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ac" aria-label="Assessment Cockpit">
      <header class="ac__head">
        <div>
          <h3 class="ac__title">{{ titleKey }}</h3>
          <small *ngIf="summary?.frameworkCode">{{ summary?.frameworkCode }}<span *ngIf="summary?.scope"> · {{ summary?.scope }}</span></small>
        </div>
        <span class="ac__status" [attr.data-status]="summary?.status || 'draft'">{{ summary?.status || 'draft' }}</span>
      </header>
      <div class="ac__metrics" *ngIf="summary">
        <div class="ac__metric">
          <span class="ac__metric-label">Controls</span>
          <strong>{{ summary.completedControls }} / {{ summary.totalControls }}</strong>
        </div>
        <div class="ac__metric">
          <span class="ac__metric-label">Evidence</span>
          <strong>{{ summary.evidenceProvided }} / {{ summary.evidenceRequired }}</strong>
        </div>
        <div class="ac__metric" *ngIf="summary.dueDate">
          <span class="ac__metric-label">Due</span>
          <strong>{{ summary.dueDate }}</strong>
        </div>
      </div>
      <div class="ac__progress" *ngIf="summary && summary.totalControls > 0">
        <div class="ac__progress-bar" [style.width.%]="(summary.completedControls / summary.totalControls) * 100"></div>
      </div>
      <footer class="ac__foot" *ngIf="summary">
        <button *ngIf="canSubmit" type="button" class="ac__submit" (click)="submitForReview.emit(summary)">Submit for review</button>
        <button *ngIf="canApprove" type="button" class="ac__approve" (click)="approve.emit(summary)">Approve</button>
      </footer>
      <p *ngIf="!summary" class="ac__empty">{{ emptyKey || 'No active assessment.' }}</p>
    </section>
  `,
  styles: [`
    .ac { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); display: flex; flex-direction: column; gap: 0.5rem; }
    .ac__head { display: flex; justify-content: space-between; align-items: flex-start; }
    .ac__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .ac__head small { color: var(--cds-text-secondary, #525252); font-size: 0.75rem; }
    .ac__status { padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; background: var(--cds-tag-background-gray, #e0e0e0); }
    .ac__status[data-status="approved"]      { background: var(--cds-support-success-inverse, #defbe6); color: #0e6027; }
    .ac__status[data-status="rejected"]      { background: var(--cds-support-error-inverse, #fff1f1); color: #a51a23; }
    .ac__status[data-status="pending-review"]{ background: var(--cds-support-warning-inverse, #fdf6dd); color: #8a6116; }
    .ac__metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem; }
    .ac__metric { background: var(--cds-layer-02, #fff); padding: 0.5rem; border-radius: 4px; }
    .ac__metric-label { font-size: 0.75rem; color: var(--cds-text-secondary, #525252); display: block; }
    .ac__progress { height: 6px; background: var(--cds-layer-02, #fff); border-radius: 3px; overflow: hidden; }
    .ac__progress-bar { height: 100%; background: var(--cds-support-info, #0f62fe); transition: width 0.3s; }
    .ac__foot { display: flex; gap: 0.5rem; }
    .ac__submit, .ac__approve { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; }
    .ac__submit { background: var(--cds-button-primary, #0f62fe); color: #fff; }
    .ac__approve { background: var(--cds-support-success, #24a148); color: #fff; }
    .ac__empty { color: var(--cds-text-secondary, #525252); font-style: italic; }
  `],
})
export class AssessmentCockpitComponent {
  @Input() titleKey = 'Assessment Cockpit';
  @Input() emptyKey?: string;
  @Input() summary?: AssessmentSummary;
  @Input() canSubmit = false;
  @Input() canApprove = false;

  @Output() submitForReview = new EventEmitter<AssessmentSummary>();
  @Output() approve = new EventEmitter<AssessmentSummary>();
}
