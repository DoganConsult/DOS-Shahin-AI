/**
 * ConsultantReportDialogComponent — Dumb presentational component
 * Finding publication form for a selected client, with title, severity,
 * description, framework reference, and recommendation fields.
 * Parent: ConsultantCenterComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Finding, FindingInput } from '@app/core/services/portals/consultant-center.service';

@Component({
  selector: 'app-consultant-report-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <!-- New finding form -->
    <div class="finding-form" *ngIf="clientName">
      <h3>Publish Finding for {{ clientName }}</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Title</label>
          <input type="text" [(ngModel)]="finding.title" class="form-input" placeholder="Finding title..." aria-label="Finding title..." />
        </div>
        <div class="form-group">
          <label>Severity</label>
          <select [(ngModel)]="finding.severity" class="form-select">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea [(ngModel)]="finding.description" rows="3" class="form-textarea"
                  placeholder="Describe the finding..." aria-label="Describe the finding..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Framework Reference</label>
          <input type="text" [(ngModel)]="finding.frameworkRef" class="form-input"
                 placeholder="e.g. ISO 27001 A.8.1" aria-label="e.g. ISO 27001 A.8.1" />
        </div>
        <div class="form-group">
          <label>Recommendation</label>
          <input type="text" [(ngModel)]="finding.recommendation" class="form-input"
                 placeholder="Recommended action..." aria-label="Recommended action..." />
        </div>
      </div>
      <button class="btn-primary" (click)="submitted.emit(finding)"
              [disabled]="publishing || !finding.title.trim() || !finding.description.trim() || !finding.recommendation.trim()">
        {{ publishing ? 'Publishing...' : 'Publish Finding' }}
      </button>
    </div>

    <div *ngIf="!clientName" class="empty-state">
      Select a client from the Portfolio tab first to manage findings.
    </div>

    <!-- Existing findings table -->
    <div *ngIf="clientName && findings.length > 0" class="sub-section">
      <h3>Existing Findings</h3>
      <table [attr.aria-label]="'Findings for ' + clientName + ' table'" class="cc-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Framework</th>
            <th>Recommendation</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let f of findings">
            <td>{{ f.title }}</td>
            <td>
              <span class="severity-badge" [attr.data-severity]="f.severity">{{ f.severity | titlecase }}</span>
            </td>
            <td>{{ f.frameworkRef || '---' }}</td>
            <td class="td-recommendation">{{ f.recommendation }}</td>
            <td>
              <span class="status-badge" [attr.data-status]="f.status">{{ f.status | titlecase }}</span>
            </td>
            <td>{{ f.createdAt | appDate:'medium' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .finding-form {
      background: var(--surface, #fff); border-radius: var(--radius-md, 8px);
      padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);
    }
    .finding-form h3 { margin: 0 0 1rem; font-size: var(--font-size-md); }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .form-group { margin-bottom: 0.75rem; flex: 1; min-width: 200px; }
    .form-group label { display: block; font-size: var(--font-size-tag); font-weight: 500; margin-bottom: 0.25rem; color: var(--text-heading, #1a1a2e); }
    .form-input, .form-select {
      width: 100%; box-sizing: border-box; padding: 0.5rem 0.75rem;
      border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-sm, 6px); font-size: var(--font-size-body-sm);
    }
    .form-textarea {
      width: 100%; box-sizing: border-box; padding: 0.5rem 0.75rem;
      border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-sm, 6px);
      font-size: var(--font-size-body-sm); resize: vertical;
    }
    .btn-primary {
      padding: 0.6rem 1.5rem; background: var(--primary, #4f46e5); color: #fff;
      border: none; border-radius: var(--radius-md, 8px); cursor: pointer; font-size: var(--font-size-body-sm);
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted, var(--text-muted)); }
    .sub-section { margin-top: 1.5rem; }
    .sub-section h3 { font-size: var(--font-size-md); margin: 0 0 0.75rem; color: var(--text-heading, #1a1a2e); }

    .cc-table { width: 100%; border-collapse: collapse; background: var(--surface, #fff); border-radius: var(--radius-md, 8px); overflow: hidden; box-shadow: var(--shadow-sm); }
    .cc-table th { text-align: start; padding: 0.75rem 1rem; font-size: var(--font-size-caption); text-transform: uppercase; color: var(--text-muted, var(--text-muted)); background: var(--surface-alt, #f9fafb); border-bottom: 1px solid var(--border, var(--border-subtle)); }
    .cc-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-light, var(--surface-ice)); font-size: var(--font-size-body-sm); }
    .td-recommendation { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .severity-badge, .status-badge {
      display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-weight: 600;
    }
    [data-severity="critical"] { background: #fee2e2; color: #991b1b; }
    [data-severity="high"] { background: #ffedd5; color: #9a3412; }
    [data-severity="medium"] { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    [data-severity="low"] { background: var(--status-success-bg, #defbe6); color: #166534; }
    [data-status="open"], [data-status="pending"] { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    [data-status="resolved"] { background: #dcfce7; color: #166534; }
    [data-status="closed"] { background: #f3f4f6; color: #4b5563; }
  `],
})
export class ConsultantReportDialogComponent {
  i18n = inject(I18nService);

  @Input() clientName = '';
  @Input() findings: Finding[] = [];
  @Input() publishing = false;

  @Output() submitted = new EventEmitter<FindingInput>();

  /** Form model for new finding */
  finding: FindingInput = { title: '', description: '', severity: 'medium', frameworkRef: '', recommendation: '' };

  /** Reset the form after successful submission */
  resetForm(): void {
    this.finding = { title: '', description: '', severity: 'medium', frameworkRef: '', recommendation: '' };
  }
}
