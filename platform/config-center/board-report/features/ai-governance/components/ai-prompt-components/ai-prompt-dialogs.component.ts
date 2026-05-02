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

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PromptVersion {
  id: string;
  asset_id: string;
  version_number: number;
  template_text: string;
  variables?: Record<string, unknown>;
  linked_model_asset_id?: string;
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  deployment_status?: 'active' | 'suspended' | 'retired' | 'inactive';
  is_active: boolean;
  change_summary?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

/** Draft form model used by the create/edit draft dialog. */
export interface DraftForm {
  asset_id: string;
  template_text: string;
  variables: string;
  linked_model_asset_id: string;
  change_summary: string;
  notes: string;
}

/** Asset dropdown option for the draft dialog. */
export interface AssetDropdownOption {
  label: string;
  value: string;
}

/** Linked model asset option for the model dropdown. */
export interface ModelAssetOption {
  label: string;
  value: string;
}

/** Rollback version dropdown option. */
export interface RollbackVersionOption {
  label: string;
  value: string;
}

/**
 * Presentational component encapsulating all five dialogs used in the AI Prompts page:
 * draft create/edit, reject, suspend, retire, and rollback.
 * Each dialog emits a confirm event; the parent handles the API calls.
 */
@Component({
    selector: 'app-ai-prompt-dialogs',
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        DialogModule,
        InputTextarea,
        DropdownModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Create / Edit Draft Dialog -->
    <p-dialog
      [header]="editingVersion ? i18n.translate('ai.prompts.editDraft') : i18n.translate('ai.prompts.createDraft')"
      [(visible)]="draftDialogVisible"
      [modal]="true"
      [style]="{width: '600px'}"
      [draggable]="false"
      [resizable]="false"
      (onHide)="draftDialogVisibleChange.emit(false)">
      <div class="dialog-form">
        <!-- Asset selector -->
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.asset') }}</label>
          <p-dropdown
            [options]="assetDropdownOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="draftForm.asset_id"
            [placeholder]="i18n.translate('ai.prompts.selectAssetDropdown')"
            [disabled]="!!editingVersion"
            styleClass="w-full" />
        </div>
        <!-- Template Text (monospace, required) -->
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.templateText') }} *</label>
          <textarea pInputTextarea [(ngModel)]="draftForm.template_text"
            rows="8" class="w-full template-textarea"
            [placeholder]="i18n.translate('ai.prompts.templateTextPlaceholder')"></textarea>
        </div>
        <!-- Variables JSON -->
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.variables') }}</label>
          <textarea pInputTextarea [(ngModel)]="draftForm.variables"
            [placeholder]="'{}'" rows="3" class="w-full json-textarea"></textarea>
        </div>
        <!-- Linked Model Asset -->
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.linkedModel') }}</label>
          <p-dropdown
            [options]="modelAssetOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="draftForm.linked_model_asset_id"
            [placeholder]="i18n.translate('ai.prompts.selectModel')"
            [showClear]="true"
            styleClass="w-full" />
        </div>
        <!-- Change Summary -->
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.changeSummary') }}</label>
          <textarea pInputTextarea [(ngModel)]="draftForm.change_summary"
            rows="2" class="w-full"></textarea>
        </div>
        <!-- Notes -->
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.notes') }}</label>
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
          [label]="editingVersion ? i18n.translate('common.save') : i18n.translate('common.create')"
          icon="pi pi-check"
          [loading]="draftSaving"
          [disabled]="!isDraftFormValid()"
          (click)="saveDraft.emit()"></button>
      </ng-template>
    </p-dialog>

    <!-- Reject Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.prompts.rejectTitle')"
      [(visible)]="rejectDialogVisible"
      [modal]="true"
      [style]="{width: '420px'}"
      [draggable]="false"
      [resizable]="false"
      (onHide)="rejectDialogVisibleChange.emit(false)">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.rejectionNotes') }} *</label>
          <textarea pInputTextarea [(ngModel)]="rejectNotes"
            rows="3" class="w-full"
            [placeholder]="i18n.translate('ai.prompts.rejectionNotesPlaceholder')"
            (ngModelChange)="rejectNotesChange.emit($event)"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="rejectDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.prompts.reject')" icon="pi pi-times"
          class="p-button-danger"
          [loading]="actionLoading"
          [disabled]="!rejectNotes.trim()"
          (click)="confirmReject.emit()"></button>
      </ng-template>
    </p-dialog>

    <!-- Suspend Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.prompts.suspendTitle')"
      [(visible)]="suspendDialogVisible"
      [modal]="true"
      [style]="{width: '420px'}"
      [draggable]="false"
      [resizable]="false"
      (onHide)="suspendDialogVisibleChange.emit(false)">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="suspendNotes"
            rows="3" class="w-full"
            (ngModelChange)="suspendNotesChange.emit($event)"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="suspendDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.prompts.suspend')" icon="pi pi-pause"
          class="p-button-warning"
          [loading]="actionLoading"
          (click)="confirmSuspend.emit()"></button>
      </ng-template>
    </p-dialog>

    <!-- Retire Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.prompts.retireTitle')"
      [(visible)]="retireDialogVisible"
      [modal]="true"
      [style]="{width: '420px'}"
      [draggable]="false"
      [resizable]="false"
      (onHide)="retireDialogVisibleChange.emit(false)">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="retireNotes"
            rows="3" class="w-full"
            (ngModelChange)="retireNotesChange.emit($event)"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="retireDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.prompts.retire')" icon="pi pi-ban"
          class="p-button-secondary"
          [loading]="actionLoading"
          (click)="confirmRetire.emit()"></button>
      </ng-template>
    </p-dialog>

    <!-- Rollback Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.prompts.rollbackTitle')"
      [(visible)]="rollbackDialogVisible"
      [modal]="true"
      [style]="{width: '460px'}"
      [draggable]="false"
      [resizable]="false"
      (onHide)="rollbackDialogVisibleChange.emit(false)">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.targetVersion') }}</label>
          <p-dropdown
            [options]="rollbackVersionOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="rollbackTargetVersionId"
            [placeholder]="i18n.translate('ai.prompts.selectVersion')"
            styleClass="w-full"
            (ngModelChange)="rollbackTargetVersionIdChange.emit($event)" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.prompts.notes') }}</label>
          <textarea pInputTextarea [(ngModel)]="rollbackNotes"
            rows="3" class="w-full"
            (ngModelChange)="rollbackNotesChange.emit($event)"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel')" class="p-button-text"
          (click)="rollbackDialogVisibleChange.emit(false)"></button>
        <button pButton [label]="i18n.translate('ai.prompts.rollback')" icon="pi pi-replay"
          class="p-button-warning"
          [loading]="actionLoading"
          [disabled]="!rollbackTargetVersionId"
          (click)="confirmRollback.emit()"></button>
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

    .template-textarea {
      font-family: var(--font-family-monospace, monospace);
      font-size: var(--font-size-tag);
    }

    .json-textarea {
      font-family: var(--font-family-monospace, monospace);
      font-size: var(--font-size-tag);
    }
  `]
})
export class AiPromptDialogsComponent {
  readonly i18n = inject(I18nService);

  // ── Draft dialog ──────────────────────────────────────────────────────────
  @Input() draftDialogVisible = false;
  @Output() draftDialogVisibleChange = new EventEmitter<boolean>();
  @Input() editingVersion: PromptVersion | null = null;
  @Input() draftSaving = false;
  @Input() draftForm: DraftForm = { asset_id: '', template_text: '', variables: '{}', linked_model_asset_id: '', change_summary: '', notes: '' };
  @Input() assetDropdownOptions: AssetDropdownOption[] = [];
  @Input() modelAssetOptions: ModelAssetOption[] = [];
  @Output() saveDraft = new EventEmitter<void>();

  // ── Reject dialog ─────────────────────────────────────────────────────────
  @Input() rejectDialogVisible = false;
  @Output() rejectDialogVisibleChange = new EventEmitter<boolean>();
  @Input() rejectNotes = '';
  @Output() rejectNotesChange = new EventEmitter<string>();
  @Output() confirmReject = new EventEmitter<void>();

  // ── Suspend dialog ────────────────────────────────────────────────────────
  @Input() suspendDialogVisible = false;
  @Output() suspendDialogVisibleChange = new EventEmitter<boolean>();
  @Input() suspendNotes = '';
  @Output() suspendNotesChange = new EventEmitter<string>();
  @Output() confirmSuspend = new EventEmitter<void>();

  // ── Retire dialog ─────────────────────────────────────────────────────────
  @Input() retireDialogVisible = false;
  @Output() retireDialogVisibleChange = new EventEmitter<boolean>();
  @Input() retireNotes = '';
  @Output() retireNotesChange = new EventEmitter<string>();
  @Output() confirmRetire = new EventEmitter<void>();

  // ── Rollback dialog ───────────────────────────────────────────────────────
  @Input() rollbackDialogVisible = false;
  @Output() rollbackDialogVisibleChange = new EventEmitter<boolean>();
  @Input() rollbackTargetVersionId = '';
  @Output() rollbackTargetVersionIdChange = new EventEmitter<string>();
  @Input() rollbackNotes = '';
  @Output() rollbackNotesChange = new EventEmitter<string>();
  @Input() rollbackVersionOptions: RollbackVersionOption[] = [];
  @Output() confirmRollback = new EventEmitter<void>();

  // ── Shared loading flag ───────────────────────────────────────────────────
  @Input() actionLoading = false;

  /** Validate that the draft form has minimum required fields. */
  isDraftFormValid(): boolean {
    return !!(
      this.draftForm.asset_id &&
      this.draftForm.template_text.trim()
    );
  }
}
