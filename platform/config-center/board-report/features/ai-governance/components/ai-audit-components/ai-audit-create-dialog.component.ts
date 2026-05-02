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
import { InputTextarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Dialog for rejecting an AI audit recommendation with a reason.
 * Re-used as the "create dialog" concept from the audit page (the only
 * user-initiated dialog is the reject-with-reason flow).
 */
@Component({
    selector: 'app-ai-audit-create-dialog',
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        InputTextarea,
        ButtonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <p-dialog
      [header]="i18n.translate('ai.audit.rejectReason')"
      [visible]="visible"
      (visibleChange)="closed.emit()"
      [modal]="true"
      [style]="{ width: '450px' }"
      [dismissableMask]="true">

      <div class="reject-form">
        <label>{{ i18n.translate('ai.audit.reason') }}</label>
        <textarea
          pInputTextarea
          [(ngModel)]="reason"
          [rows]="4"
          class="w-full mt-2">
        </textarea>
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          [label]="i18n.translate('ai.audit.cancel')"
          class="p-button-text"
          (click)="closed.emit()">
        </button>
        <button
          pButton
          [label]="i18n.translate('ai.audit.confirmReject')"
          class="p-button-danger"
          [loading]="saving"
          (click)="saved.emit(reason)">
        </button>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .reject-form label { font-weight: 600; }
    .w-full { width: 100%; }
    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class AiAuditCreateDialogComponent {
  readonly i18n = inject(I18nService);

  /** Whether the dialog is visible. */
  @Input() visible = false;

  /** Whether a save/reject operation is in progress. */
  @Input() saving = false;

  /** Emitted when the dialog should close. */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when the user confirms the rejection with a reason string. */
  @Output() saved = new EventEmitter<string>();

  /** The rejection reason text. */
  reason = '';
}
