import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '@app/core/models/shared.types';

/** Form model for creating/editing a policy. */
export interface PolicyFormModel {
  title: string;
  content: string;
  owner: string;
  status: string;
  frameworksStr: string;
  category: string;
  requiresAcknowledgement: boolean;
}

/**
 * Presentational component: create/edit policy dialog.
 * Emits save event with the form data when user submits.
 */
@Component({
    selector: 'app-policy-create-edit-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, ButtonModule],
    template: `
    <p-dialog [header]="editMode ? i18n.translate('policies.editPolicy') : i18n.translate('policies.addPolicy')"
      [(visible)]="visible" [modal]="true" [style]="{width:'600px'}"
      (onHide)="visibleChange.emit(false)">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('policies.titleLabel') }}</label>
          <input pInputText [(ngModel)]="form.title" class="w-full" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('policies.content') }}</label>
          <textarea pInputTextarea [(ngModel)]="form.content" [rows]="5" class="w-full"></textarea>
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ i18n.translate('policies.owner') }}</label>
            <input pInputText [(ngModel)]="form.owner" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('common.status') }}</label>
            <p-dropdown [(ngModel)]="form.status" [options]="statusOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <div class="field">
          <label>{{ i18n.translate('policies.category') }}</label>
          <p-dropdown [options]="categoryOptions" [(ngModel)]="form.category"
            optionLabel="label" optionValue="value" styleClass="w-full"
            [placeholder]="i18n.translate('policies.selectCategory')"
            [showClear]="true" />
        </div>
        <div class="field">
          <label>{{ i18n.translate('policies.frameworksCommaSeparated') }}</label>
          <input pInputText [(ngModel)]="form.frameworksStr" class="w-full" placeholder="ISO 27001, NCA ECC" aria-label="ISO 27001, NCA ECC" />
        </div>
        <div class="field ra-toggle">
          <label class="ra-label">
            <input type="checkbox" [(ngModel)]="form.requiresAcknowledgement" />
            <span>{{ i18n.translate('policies.requireAcknowledge') }}</span>
          </label>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="visibleChange.emit(false)" />
        <p-button [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="save.emit(form)" [disabled]="!form.title || !form.content" />
      </ng-template>
    </p-dialog>

    <!-- Reject Policy Dialog -->
    <p-dialog [header]="i18n.translate('policies.rejectPolicy')" [(visible)]="rejectVisible" [modal]="true" [style]="{width:'440px'}"
      (onHide)="rejectVisibleChange.emit(false)">
      <div class="dialog-form">
        <div class="field"><label>{{ i18n.translate('policies.rejectionReason') }}</label>
          <textarea pInputTextarea [(ngModel)]="rejectReason" [rows]="3" class="w-full"
            [placeholder]="i18n.translate('policies.enterRejectionReason')"
            [attr.aria-label]="i18n.translate('policies.enterRejectionReason')"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="rejectVisibleChange.emit(false)" />
        <p-button [label]="i18n.translate('policies.reject')" icon="pi pi-times" severity="danger" (onClick)="reject.emit(rejectReason)" [disabled]="!rejectReason" />
      </ng-template>
    </p-dialog>

    <!-- Delete Confirmation -->
    <p-dialog [header]="i18n.translate('policies.confirmDelete')" [(visible)]="deleteVisible" [modal]="true" [style]="{width:'400px'}"
      (onHide)="deleteVisibleChange.emit(false)">
      <p>{{ i18n.translate('policies.deleteConfirm') }}</p>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="deleteVisibleChange.emit(false)" />
        <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash" severity="danger" (onClick)="confirmDeleteAction.emit()" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
    .ra-toggle { padding: 8px 0; }
    .ra-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; }
    .ra-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-500, var(--primary)); }
  `]
})
export class PolicyCreateEditDialogComponent {
  @Input() visible = false;
  @Input() editMode = false;
  @Input() form: PolicyFormModel = { title: '', content: '', owner: '', status: 'draft', frameworksStr: '', category: '', requiresAcknowledgement: false };
  @Input() statusOptions: { label: string; value: string }[] = [];
  @Input() categoryOptions: { label: string; value: string }[] = [];

  @Input() rejectVisible = false;
  @Input() deleteVisible = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<PolicyFormModel>();
  @Output() rejectVisibleChange = new EventEmitter<boolean>();
  @Output() reject = new EventEmitter<string>();
  @Output() deleteVisibleChange = new EventEmitter<boolean>();
  @Output() confirmDeleteAction = new EventEmitter<void>();

  rejectReason = '';

  constructor(public i18n: I18nService) {}
}
