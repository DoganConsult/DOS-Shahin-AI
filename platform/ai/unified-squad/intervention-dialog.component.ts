import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnifiedSquadService } from '@app/services/unified-squad.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { toErrorMessage } from '@app/shared/utils/error';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-intervention-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div tabindex="0" role="button" (keyup.enter)="close()" class="intervention-overlay" *ngIf="visible" (click)="close()">
      <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="intervention-modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Intervention Dialog">
        <div class="modal-header">
          <h3>{{ i18n.translate('intervention.title') }}</h3>
          <button class="close-btn" (click)="close()" aria-label="Close">&times;</button>
        </div>

        <div class="modal-body">
          <div class="before-state" *ngIf="beforeState">
            <label>Current State</label>
            <div class="state-preview">
              <span>Status: {{ beforeState.status }}</span>
              <span>Assignee: {{ beforeState.assigned_participant_id || 'None' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="intervention-type">Intervention Type</label>
            <select id="intervention-type" [(ngModel)]="interventionType">
              <option value="override_approve">Override — Approve</option>
              <option value="override_reject">Override — Reject</option>
              <option value="reassign">Reassign</option>
              <option value="escalate">Escalate</option>
              <option value="complete_on_behalf">Complete on Behalf</option>
            </select>
          </div>

          <div class="form-group" *ngIf="interventionType === 'reassign' || interventionType === 'escalate'">
            <label for="target-participant">Target Participant</label>
            <select id="target-participant" [(ngModel)]="targetParticipantId">
              <option *ngFor="let p of participants" [value]="p.userId">
                {{ p.displayNameEn }} ({{ p.role }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="justification">Justification (min 10 characters)</label>
            <textarea id="justification" [(ngModel)]="justification" rows="3"
                      [placeholder]="i18n.translate('intervention.justificationPlaceholder')" [attr.aria-label]="i18n.translate('intervention.justificationPlaceholder')"></textarea>
            <span class="char-count" [class.error]="justification.length < 10 && justification.length > 0">
              {{ justification.length }}/10 min
            </span>
          </div>

          <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="close()">Cancel</button>
          <button class="btn-primary" (click)="submit()" [disabled]="justification.length < 10 || submitting">
            {{ submitting ? 'Submitting...' : 'Execute Intervention' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .intervention-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), 0.5); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
    .intervention-modal { background: var(--card-bg, #fff); border-radius: var(--radius-lg); width: 90%; max-width: 520px; box-shadow: var(--shadow-lg); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color, #e0e0e0); }
    .modal-header h3 { margin: 0; font-size: var(--font-size-body-md); }
    .close-btn { background: none; border: none; font-size: var(--font-size-2xl); cursor: pointer; color: var(--text-secondary, #666); }
    .modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-weight: 600; font-size: var(--font-size-tag); }
    .form-group select, .form-group textarea { padding: 0.5rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); font-size: var(--font-size-body-sm); }
    .char-count { font-size: var(--font-size-sm); color: var(--text-secondary, #888); }
    .char-count.error { color: var(--error); }
    .before-state { padding: 0.75rem; background: var(--bg-subtle, #f4f4f4); border-radius: var(--radius-sm); }
    .before-state label { font-weight: 600; font-size: var(--font-size-tag); display: block; margin-bottom: 0.35rem; }
    .state-preview { display: flex; gap: 1rem; font-size: var(--font-size-tag); }
    .error-msg { color: var(--error); font-size: var(--font-size-tag); }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.25rem; border-top: 1px solid var(--border-color, #e0e0e0); }
    .btn-secondary { padding: 0.5rem 1rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
    .btn-primary { padding: 0.5rem 1rem; border: none; border-radius: var(--radius-sm); background: #0f62fe; color: #fff; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class InterventionDialogComponent {
  i18n = inject(I18nService);
  private svc = inject(UnifiedSquadService);

  @Input() visible = false;
  @Input() workflowStepId = '';
  @Input() beforeState: GrcRecord = null;
  @Input() participants: GrcRecord[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() interventionExecuted = new EventEmitter<unknown>();

  interventionType = 'override_approve';
  justification = '';
  targetParticipantId = '';
  submitting = false;
  errorMsg = '';

  close() { this.visible = false; this.closed.emit(); }

  async submit() {
    if (this.justification.length < 10) { this.errorMsg = 'Justification must be at least 10 characters'; return; }
    this.submitting = true;
    this.errorMsg = '';
    try {
      const result = await this.svc.executeIntervention({
        workflowStepId: this.workflowStepId,
        type: this.interventionType,
        justification: this.justification,
        newAssigneeId: this.targetParticipantId || undefined,
        escalationTargetId: this.interventionType === 'escalate' ? this.targetParticipantId : undefined,
      });
      this.interventionExecuted.emit(result);
      this.close();
    } catch (err: unknown) {
      this.errorMsg = (err as GrcRecord)?.error?.error || toErrorMessage(err) || 'Intervention failed';
    } finally { this.submitting = false; }
  }

}
