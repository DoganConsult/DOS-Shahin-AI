import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DraftForm {
  asset_id: string;
  provider: string;
  provider_model_id: string;
  config: string;
  change_summary: string;
  notes: string;
}

export interface AssetDropdownOption {
  label: string;
  value: string;
}

export interface RollbackVersionOption {
  label: string;
  value: string;
}

/** Events emitted from the dialogs component. */
export interface DraftSaveEvent {
  form: DraftForm;
  isEdit: boolean;
}

export interface RejectConfirmEvent {
  notes: string;
}

export interface SuspendConfirmEvent {
  notes: string;
}

export interface RetireConfirmEvent {
  notes: string;
}

export interface RollbackConfirmEvent {
  targetVersionId: string;
  notes: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Presentational component that encapsulates all AI model dialogs:
 * - Create / Edit Draft
 * - Reject
 * - Suspend
 * - Retire
 * - Rollback
 */
@Component({
    selector: 'app-ai-model-dialogs',
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputTextarea,
        DropdownModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Create / Edit Draft Dialog -->
    <p-dialog
      [header]="isEditing ? i18n.translate('ai.models.editDraft') : i18n.translate('ai.models.createDraft')"
      [(visible)]="draftDialogVisible"
      (visibleChange)="draftDialogVisibleChange.emit($event)"
      [modal]="true"
      [style]="{width: '520px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <!-- Asset selector -->
        <div class="field">
          <label>{{ i18n.translate('ai.models.asset') }}</label>
          <p-dropdown
            [options]="assetDropdownOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="draftForm.asset_id"
            [placeholder]="i18n.translate('ai.models.selectAssetDropdown')"
            [disabled]="isEditing"
            styleClass="w-full" />
        </div>
        <!-- Provider -->
        <div class="field">
          <label>{{ i18n.translate('ai.models.provider') }}</label>
          <input pInputText type="text" [(ngModel)]="draftForm.provider"
            [placeholder]="'e.g. anthropic, openai'" class="w-full" />
        </div>
        <!-- Provider Model ID -->
        <div class="field">
          <label>{{ i18n.translate('ai.models.modelId') }}</label>
          <input pInputText type="text" [(ngModel)]="draftForm.provider_model_id"
            [placeholder]="'e.g. claude-sonnet-4-20250514'" class="w-full" />
        </div>
        <!-- Config JSON -->
        <div class="field">
          <label>{{ i18n.translate('ai.models.config') }}</label>
          <textarea pInputTextarea [(ngModel)]="draftForm.config"
            [placeholder]="'{}'" rows="4" class="w-full config-textarea"></textarea>
        </div>
        <!-- Change Summary -->
        <div class="field">
          <label>{{ i18n.translate('ai.models.changeSummary') }}</label>
          <textarea pInputTextarea [(ngModel)]="draftForm.change_summary"
            rows="2" class="w-full"></textarea>
        </div>
        <!-- Notes -->
        <div class="field">
          <label>{{ i18n.translate('ai.models.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="draftForm.notes"
            rows="2" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton
          [label]="i18n.translate('common.cancel')"
          class="p-button-text"
          (click)="draftDialogVisibleChange.emit(false)"></button>
        <button pButton
          [label]="isEditing ? i18n.translate('common.save') : i18n.translate('common.create')"
          icon="pi pi-check"
          [loading]="draftSaving"
          [disabled]="!isDraftFormValid()"
          (click)="saveDraft.emit({ form: draftForm, isEdit: isEditing })"></button>
      </ng-template>
    </p-dialog>

    <!-- Reject Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.models.rejectTitle')"
      [(visible)]="rejectDialogVisible"
      (visibleChange)="rejectDialogVisibleChange.emit($event)"
      [modal]="true"
      [style]="{width: '420px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.models.rejectionNotes') }} *</label>
          <textarea pInputTextarea [(ngModel)]="rejectNotes"
            rows="3" class="w-full"
            [placeholder]="i18n.translate('ai.models.rejectionNotesPlaceholder')"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="rejectDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.models.reject')" icon="pi pi-times"
          class="p-button-danger"
          [loading]="actionLoading"
          [disabled]="!rejectNotes.trim()"
          (click)="confirmReject.emit({ notes: rejectNotes.trim() })"></button>
      </ng-template>
    </p-dialog>

    <!-- Suspend Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.models.suspendTitle')"
      [(visible)]="suspendDialogVisible"
      (visibleChange)="suspendDialogVisibleChange.emit($event)"
      [modal]="true"
      [style]="{width: '420px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.models.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="suspendNotes"
            rows="3" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="suspendDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.models.suspend')" icon="pi pi-pause"
          class="p-button-warning"
          [loading]="actionLoading"
          (click)="confirmSuspend.emit({ notes: suspendNotes.trim() })"></button>
      </ng-template>
    </p-dialog>

    <!-- Retire Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.models.retireTitle')"
      [(visible)]="retireDialogVisible"
      (visibleChange)="retireDialogVisibleChange.emit($event)"
      [modal]="true"
      [style]="{width: '420px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.models.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="retireNotes"
            rows="3" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="retireDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.models.retire')" icon="pi pi-ban"
          class="p-button-secondary"
          [loading]="actionLoading"
          (click)="confirmRetire.emit({ notes: retireNotes.trim() })"></button>
      </ng-template>
    </p-dialog>

    <!-- Rollback Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.models.rollbackTitle')"
      [(visible)]="rollbackDialogVisible"
      (visibleChange)="rollbackDialogVisibleChange.emit($event)"
      [modal]="true"
      [style]="{width: '460px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.models.targetVersion') }}</label>
          <p-dropdown
            [options]="rollbackVersionOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="rollbackTargetVersionId"
            [placeholder]="i18n.translate('ai.models.selectVersion')"
            styleClass="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.models.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="rollbackNotes"
            rows="3" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="rollbackDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.models.rollback')" icon="pi pi-replay"
          class="p-button-warning"
          [loading]="actionLoading"
          [disabled]="!rollbackTargetVersionId"
          (click)="confirmRollback.emit({ targetVersionId: rollbackTargetVersionId, notes: rollbackNotes.trim() })"></button>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .dialog-form .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .dialog-form .field label {
      font-size: var(--font-size-tag);
      font-weight: 500;
      color: var(--text-color);
    }

    .config-textarea {
      font-family: var(--font-family-monospace, monospace);
      font-size: var(--font-size-tag);
    }
  `]
})
export class AiModelDialogsComponent {
  // ── Injected services ────────────────────────────────────────────────────────
  constructor(readonly i18n: I18nService) {}

  // ── Draft dialog inputs ──────────────────────────────────────────────────────
  @Input() draftDialogVisible = false;
  @Input() isEditing = false;
  @Input() draftSaving = false;
  @Input() draftForm: DraftForm = { asset_id: '', provider: '', provider_model_id: '', config: '{}', change_summary: '', notes: '' };
  @Input() assetDropdownOptions: AssetDropdownOption[] = [];

  @Output() draftDialogVisibleChange = new EventEmitter<boolean>();
  @Output() saveDraft = new EventEmitter<DraftSaveEvent>();

  // ── Reject dialog inputs ─────────────────────────────────────────────────────
  @Input() rejectDialogVisible = false;
  @Output() rejectDialogVisibleChange = new EventEmitter<boolean>();
  @Output() confirmReject = new EventEmitter<RejectConfirmEvent>();
  rejectNotes = '';

  // ── Suspend dialog inputs ────────────────────────────────────────────────────
  @Input() suspendDialogVisible = false;
  @Output() suspendDialogVisibleChange = new EventEmitter<boolean>();
  @Output() confirmSuspend = new EventEmitter<SuspendConfirmEvent>();
  suspendNotes = '';

  // ── Retire dialog inputs ─────────────────────────────────────────────────────
  @Input() retireDialogVisible = false;
  @Output() retireDialogVisibleChange = new EventEmitter<boolean>();
  @Output() confirmRetire = new EventEmitter<RetireConfirmEvent>();
  retireNotes = '';

  // ── Rollback dialog inputs ───────────────────────────────────────────────────
  @Input() rollbackDialogVisible = false;
  @Input() rollbackVersionOptions: RollbackVersionOption[] = [];
  @Output() rollbackDialogVisibleChange = new EventEmitter<boolean>();
  @Output() confirmRollback = new EventEmitter<RollbackConfirmEvent>();
  rollbackTargetVersionId = '';
  rollbackNotes = '';

  // ── Shared loading flag ──────────────────────────────────────────────────────
  @Input() actionLoading = false;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Validate draft form has required fields. */
  isDraftFormValid(): boolean {
    return !!(
      this.draftForm.asset_id &&
      this.draftForm.provider.trim() &&
      this.draftForm.provider_model_id.trim()
    );
  }
}
