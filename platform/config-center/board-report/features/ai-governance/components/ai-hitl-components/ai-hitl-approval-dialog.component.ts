import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/textarea';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-hitl-approval-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        TagModule,
        ButtonModule,
        InputTextarea,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <p-dialog
      [header]="i18n.translate('ai.hitl.reviewDialogTitle')"
      [visible]="visible"
      (visibleChange)="closed.emit()"
      [modal]="true"
      [style]="{width: '480px'}"
      [closable]="true">

      <div class="review-form" style="margin-top:12px;">
        <div class="detail-field">
          <label class="detail-label">{{ i18n.translate('ai.hitl.decision') }}</label>
          <p-tag [value]="decision" [severity]="decisionSeverity(decision)" />
        </div>
        <div class="detail-field">
          <label class="detail-label">{{ i18n.translate('ai.hitl.notes') }}</label>
          <textarea
            pInputTextarea
            [(ngModel)]="notes"
            [rows]="3"
            class="w-full"
            [placeholder]="i18n.translate('ai.hitl.notesPlaceholder')">
          </textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          [label]="i18n.translate('common.cancel')"
          icon="pi pi-times"
          class="p-button-text"
          (click)="closed.emit()">
        </button>
        <button
          pButton
          [label]="i18n.translate('ai.hitl.submitReview')"
          icon="pi pi-check"
          [loading]="loading"
          (click)="saved.emit(notes)">
        </button>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .review-form { display:flex; flex-direction:column; gap:12px; }
    .detail-field { display:flex; flex-direction:column; gap:2px; }
    .detail-label { font-size:var(--font-size-xs); font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted); }
    .w-full { width:100%; }
  `]
})
export class AiHitlApprovalDialogComponent {
  readonly i18n = inject(I18nService);

  /** Whether the dialog is visible. */
  @Input() visible = false;

  /** The pre-selected decision (approved/rejected/escalated). */
  @Input() decision = '';

  /** Whether the submit action is loading. */
  @Input() loading = false;

  /** Emitted when the dialog should close. */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when the user submits with notes. */
  @Output() saved = new EventEmitter<string>();

  /** Notes text bound to the textarea. */
  notes = '';

  /** Map decision to PrimeNG tag severity. */
  decisionSeverity(d: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (d) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'escalated': return 'warning';
      default: return 'info';
    }
  }
}
