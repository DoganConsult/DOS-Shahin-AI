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
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AssetFormData {
  asset_type: string;
  asset_key: string;
  display_name: string;
  description: string;
  tags: string;
  business_owner: string;
  technical_owner: string;
  governance_owner: string;
  status: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-asset-create-edit-dialog',
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        InputTextModule,
        InputTextarea,
        DropdownModule,
        ButtonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Create Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.assets.createTitle')"
      [visible]="createVisible"
      (visibleChange)="createClose.emit()"
      [modal]="true"
      [style]="{width: '520px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.assets.assetType') }} *</label>
          <p-dropdown
            [options]="assetTypeOptions"
            [(ngModel)]="createForm.asset_type"
            [placeholder]="i18n.translate('ai.assets.selectAssetType')"
            styleClass="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.assetKey') }} *</label>
          <input pInputText type="text" [(ngModel)]="createForm.asset_key"
            placeholder="e.g. my-agent-v1" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.displayName') }} *</label>
          <input pInputText type="text" [(ngModel)]="createForm.display_name"
            class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.description') }}</label>
          <textarea pInputTextarea [(ngModel)]="createForm.description"
            rows="3" class="w-full"></textarea>
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.tags') }}</label>
          <input pInputText type="text" [(ngModel)]="createForm.tags"
            [placeholder]="i18n.translate('ai.assets.tagsHint')" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.businessOwner') }}</label>
          <input pInputText type="text" [(ngModel)]="createForm.business_owner" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.technicalOwner') }}</label>
          <input pInputText type="text" [(ngModel)]="createForm.technical_owner" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.governanceOwner') }}</label>
          <input pInputText type="text" [(ngModel)]="createForm.governance_owner" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton
          [label]="i18n.translate('common.cancel')"
          class="p-button-text"
          (click)="createClose.emit()"></button>
        <button pButton
          [label]="i18n.translate('common.create')"
          icon="pi pi-check"
          [loading]="saving"
          [disabled]="!isCreateFormValid()"
          (click)="createSave.emit(createForm)"></button>
      </ng-template>
    </p-dialog>

    <!-- Edit Dialog -->
    <p-dialog
      [header]="i18n.translate('ai.assets.editTitle')"
      [visible]="editVisible"
      (visibleChange)="editClose.emit()"
      [modal]="true"
      [style]="{width: '520px'}"
      [draggable]="false"
      [resizable]="false">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('ai.assets.displayName') }}</label>
          <input pInputText type="text" [(ngModel)]="editForm.display_name" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.description') }}</label>
          <textarea pInputTextarea [(ngModel)]="editForm.description"
            rows="3" class="w-full"></textarea>
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.status') }}</label>
          <p-dropdown
            [options]="statusOptions"
            [(ngModel)]="editForm.status"
            [placeholder]="i18n.translate('ai.assets.selectStatus')"
            styleClass="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.tags') }}</label>
          <input pInputText type="text" [(ngModel)]="editForm.tags"
            [placeholder]="i18n.translate('ai.assets.tagsHint')" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.businessOwner') }}</label>
          <input pInputText type="text" [(ngModel)]="editForm.business_owner" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.technicalOwner') }}</label>
          <input pInputText type="text" [(ngModel)]="editForm.technical_owner" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('ai.assets.governanceOwner') }}</label>
          <input pInputText type="text" [(ngModel)]="editForm.governance_owner" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton
          [label]="i18n.translate('common.cancel')"
          class="p-button-text"
          (click)="editClose.emit()"></button>
        <button pButton
          [label]="i18n.translate('common.save')"
          icon="pi pi-check"
          [loading]="saving"
          (click)="editSave.emit(editForm)"></button>
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
    .dialog-form .field > label {
      font-size: var(--font-size-caption);
      font-weight: 500;
      color: var(--text-color-secondary);
    }
  `]
})
export class AiAssetCreateEditDialogComponent {
  readonly i18n = inject(I18nService);

  /** Whether the create dialog is visible. */
  @Input() createVisible = false;

  /** Whether the edit dialog is visible. */
  @Input() editVisible = false;

  /** Whether a save operation is in progress. */
  @Input() saving = false;

  /** Create form data (two-way bound internally). */
  @Input() createForm: AssetFormData = this.emptyForm();

  /** Edit form data (two-way bound internally). */
  @Input() editForm: AssetFormData = this.emptyForm();

  /** Dropdown options for asset type. */
  @Input() assetTypeOptions: { label: string; value: string }[] = [];

  /** Dropdown options for status. */
  @Input() statusOptions: { label: string; value: string }[] = [];

  /** Emitted when create dialog is closed. */
  @Output() createClose = new EventEmitter<void>();

  /** Emitted when edit dialog is closed. */
  @Output() editClose = new EventEmitter<void>();

  /** Emitted when create form is submitted. */
  @Output() createSave = new EventEmitter<AssetFormData>();

  /** Emitted when edit form is submitted. */
  @Output() editSave = new EventEmitter<AssetFormData>();

  /** Validate required fields for create form. */
  isCreateFormValid(): boolean {
    return !!(
      this.createForm.asset_type?.trim() &&
      this.createForm.asset_key?.trim() &&
      this.createForm.display_name?.trim()
    );
  }

  /** Return an empty form. */
  private emptyForm(): AssetFormData {
    return {
      asset_type: '', asset_key: '', display_name: '', description: '',
      tags: '', business_owner: '', technical_owner: '', governance_owner: '', status: '',
    };
  }
}
