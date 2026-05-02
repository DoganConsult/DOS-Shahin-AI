import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

/** Form model for KRI create/edit */
export interface KriFormData {
  name: string;
  linkedCategory: string;
  owner: string;
  thresholdRed: number;
  thresholdAmber: number;
  thresholdGreen: number;
  currentValue: number;
}

/**
 * Presentational component: Create/Edit KRI dialog with threshold inputs,
 * linked category dropdown, owner, and current value fields.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-kri-create-edit-dialog',
    imports: [CommonModule, FormsModule, DialogModule, InputTextModule, DropdownModule, ButtonModule],
    template: `
    <p-dialog [header]="dialogTitle" [(visible)]="visible" [modal]="true" [style]="{width:'500px'}" (onHide)="closed.emit()">
      <div class="dialog-form">
        <div class="field">
          <label>{{ i18n.translate('risk.name') }}</label>
          <input pInputText [(ngModel)]="form.name" class="w-full" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ i18n.translate('risk.linkedRisk') }}</label>
            <p-dropdown [(ngModel)]="form.linkedCategory" [options]="categoryOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('risk.owner') }}</label>
            <input pInputText [(ngModel)]="form.owner" class="w-full" />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ i18n.translate('risk.thresholdRed') }}</label>
            <input pInputText type="number" [(ngModel)]="form.thresholdRed" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('risk.thresholdAmber') }}</label>
            <input pInputText type="number" [(ngModel)]="form.thresholdAmber" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('risk.thresholdGreen') }}</label>
            <input pInputText type="number" [(ngModel)]="form.thresholdGreen" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>{{ i18n.translate('risk.currentValue') }}</label>
          <input pInputText type="number" [(ngModel)]="form.currentValue" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('risk.cancel')" severity="secondary" [text]="true" (onClick)="closed.emit()" />
        <p-button [label]="i18n.translate('risk.save')" icon="pi pi-check" (onClick)="saved.emit(form)" [disabled]="!form.name" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-md, 12px); }
    .w-full { width: 100%; }
  `]
})
export class KriCreateEditDialogComponent {
  public i18n = inject(I18nService);

  /** Dialog visibility */
  @Input() visible = false;

  /** Dialog title (localized) */
  @Input() dialogTitle = '';

  /** Category dropdown options */
  @Input() categoryOptions: Array<{ label: string; value: string }> = [];

  /** Form data - passed from parent, mutated via ngModel */
  @Input() form: KriFormData = { name: '', linkedCategory: '', owner: '', thresholdRed: 90, thresholdAmber: 70, thresholdGreen: 50, currentValue: 0 };

  /** Emitted when dialog is closed */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when form is saved */
  @Output() saved = new EventEmitter<KriFormData>();
}
