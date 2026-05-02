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
import { InputSwitchModule } from 'primeng/toggleswitch';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface RuleFormData {
  rule_name: string;
  description: string;
  enabled: boolean;
  trigger_condition_text: string;
  channels_text: string;
}

export interface KsFormData {
  asset_name: string;
  asset_type: string;
  kill_switch_type: string;
  trigger_method: string;
  fallback_procedure: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-alert-config-dialog',
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        InputTextModule,
        InputTextarea,
        InputSwitchModule,
        DropdownModule,
        ButtonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Alert Rule Create/Edit Dialog -->
    <p-dialog
      [header]="isEditing
        ? (i18n.translate('aiGov.alerts.editRule') || 'Edit Alert Rule')
        : (i18n.translate('aiGov.alerts.createRule') || 'New Alert Rule')"
      [visible]="ruleVisible"
      (visibleChange)="ruleClose.emit()"
      [modal]="true"
      [style]="{width:'520px'}"
      [closable]="true">

      <div class="detail-grid dialog-grid-top">
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.alerts.field.name') || 'Rule Name' }} *</label>
          <input pInputText [(ngModel)]="ruleForm.rule_name" class="w-full" />
        </div>
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.alerts.field.description') || 'Description' }}</label>
          <textarea pInputTextarea [(ngModel)]="ruleForm.description" rows="3" class="w-full"></textarea>
        </div>
        <div class="detail-field">
          <label class="detail-label">{{ i18n.translate('aiGov.alerts.field.enabled') || 'Enabled' }}</label>
          <p-inputSwitch [(ngModel)]="ruleForm.enabled"></p-inputSwitch>
        </div>
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.alerts.field.trigger') || 'Trigger Condition (JSON)' }}</label>
          <textarea pInputTextarea [(ngModel)]="ruleForm.trigger_condition_text" rows="3" class="json-editor"></textarea>
        </div>
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.alerts.field.channels') || 'Channels (JSON)' }}</label>
          <textarea pInputTextarea [(ngModel)]="ruleForm.channels_text" rows="2" class="json-editor"></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton
          [label]="i18n.translate('common.cancel') || 'Cancel'"
          class="p-button-text"
          (click)="ruleClose.emit()">
        </button>
        <button pButton
          [label]="isEditing ? (i18n.translate('common.save') || 'Save') : (i18n.translate('common.create') || 'Create')"
          icon="pi pi-check"
          [loading]="ruleSaving"
          [disabled]="!ruleForm.rule_name"
          (click)="ruleSaved.emit(ruleForm)">
        </button>
      </ng-template>
    </p-dialog>

    <!-- Kill Switch Register Dialog -->
    <p-dialog
      [header]="i18n.translate('aiGov.killswitch.registerTitle') || 'Register Kill Switch'"
      [visible]="ksVisible"
      (visibleChange)="ksClose.emit()"
      [modal]="true"
      [style]="{width:'480px'}"
      [closable]="true">

      <div class="detail-grid dialog-grid-top">
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.killswitch.field.name') || 'Asset Name' }} *</label>
          <input pInputText [(ngModel)]="ksForm.asset_name" class="w-full" />
        </div>
        <div class="detail-field">
          <label class="detail-label">{{ i18n.translate('aiGov.killswitch.field.type') || 'Asset Type' }} *</label>
          <p-dropdown
            [options]="ksTypeOptions"
            [(ngModel)]="ksForm.asset_type"
            optionLabel="label"
            optionValue="value"
            [placeholder]="i18n.translate('common.select') || 'Select...'"
            styleClass="w-full" />
        </div>
        <div class="detail-field">
          <label class="detail-label">{{ i18n.translate('aiGov.killswitch.field.switchType') || 'Kill Switch Type' }}</label>
          <p-dropdown
            [options]="ksSwitchTypeOptions"
            [(ngModel)]="ksForm.kill_switch_type"
            optionLabel="label"
            optionValue="value"
            [placeholder]="i18n.translate('common.select') || 'Select...'"
            styleClass="w-full" />
        </div>
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.killswitch.field.triggerMethod') || 'Trigger Method' }}</label>
          <textarea pInputTextarea [(ngModel)]="ksForm.trigger_method" rows="2" class="w-full"></textarea>
        </div>
        <div class="detail-field col-full">
          <label class="detail-label">{{ i18n.translate('aiGov.killswitch.field.fallback') || 'Fallback Procedure' }}</label>
          <textarea pInputTextarea [(ngModel)]="ksForm.fallback_procedure" rows="2" class="w-full"></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton
          [label]="i18n.translate('common.cancel') || 'Cancel'"
          class="p-button-text"
          (click)="ksClose.emit()">
        </button>
        <button pButton
          [label]="i18n.translate('common.create') || 'Create'"
          icon="pi pi-check"
          [loading]="ksSaving"
          [disabled]="!ksForm.asset_name || !ksForm.asset_type"
          (click)="ksSaved.emit(ksForm)">
        </button>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; margin-bottom:16px; }
    .detail-field { display:flex; flex-direction:column; gap:2px; }
    .detail-label { font-size:var(--font-size-xs); font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted); }
    .col-full { grid-column:1/-1; }
    .w-full { width:100%; }
    .json-editor { width:100%; font-family:monospace; }
    .dialog-grid-top { margin-top:12px; }
  `]
})
export class AiAlertConfigDialogComponent {
  readonly i18n = inject(I18nService);

  // ── Rule dialog ─────────────────────────────────────────────────────────────

  /** Whether the rule dialog is visible. */
  @Input() ruleVisible = false;

  /** Whether editing an existing rule (vs creating). */
  @Input() isEditing = false;

  /** Whether the rule is being saved. */
  @Input() ruleSaving = false;

  /** Rule form data. */
  @Input() ruleForm: RuleFormData = { rule_name: '', description: '', enabled: true, trigger_condition_text: '', channels_text: '' };

  /** Emitted when the rule dialog closes. */
  @Output() ruleClose = new EventEmitter<void>();

  /** Emitted when the rule form is submitted. */
  @Output() ruleSaved = new EventEmitter<RuleFormData>();

  // ── Kill switch dialog ──────────────────────────────────────────────────────

  /** Whether the kill switch dialog is visible. */
  @Input() ksVisible = false;

  /** Whether the kill switch is being saved. */
  @Input() ksSaving = false;

  /** Kill switch form data. */
  @Input() ksForm: KsFormData = { asset_name: '', asset_type: '', kill_switch_type: '', trigger_method: '', fallback_procedure: '' };

  /** Kill switch type dropdown options. */
  @Input() ksTypeOptions: { label: string; value: string }[] = [];

  /** Kill switch switch type dropdown options. */
  @Input() ksSwitchTypeOptions: { label: string; value: string }[] = [];

  /** Emitted when the kill switch dialog closes. */
  @Output() ksClose = new EventEmitter<void>();

  /** Emitted when the kill switch form is submitted. */
  @Output() ksSaved = new EventEmitter<KsFormData>();
}
