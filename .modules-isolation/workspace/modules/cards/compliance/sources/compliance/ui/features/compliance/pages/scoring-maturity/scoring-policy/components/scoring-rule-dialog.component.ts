/**
 * ScoringRuleDialogComponent — Dumb presentational component
 * Create/Edit dialog for a scoring policy with weight domain management
 * and delete confirmation dialog.
 * Parent: ScoringPolicyComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule, DialogModule, InputModule, NumberModule, TooltipModule } from 'carbon-components-angular';

export interface WeightEntry {
  domain: string;
  value: number;
}

@Component({
  selector: 'app-scoring-rule-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, FormsModule, DialogModule, ButtonModule, InputModule, NumberModule, TooltipModule],
  template: `
    <!-- Create / Edit Dialog -->
    <cds-modal
      [header]="isEditing ? i18n.translate('scoringPolicy.editPolicy') : i18n.translate('scoringPolicy.newPolicyDialog')"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '620px' }"
      [closable]="true"
      (onHide)="closed.emit()"
    >
      <div class="dialog-form">
        <!-- Name -->
        <div class="field">
          <label for="policyName">{{ i18n.translate('scoringPolicy.policyName') }}</label>
          <input id="policyName" pInputText [(ngModel)]="formName"
                 [placeholder]="i18n.translate('scoringPolicy.namePlaceholder')" class="w-full" />
        </div>

        <!-- Default Toggle -->
        <div class="field-row-inline">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="formIsDefault" />
            Set as default policy
          </label>
        </div>

        <!-- Weights Section -->
        <div class="weights-section">
          <div class="weights-header">
            <label class="section-label">Weight Domains</label>
            <button cdsButton [label]="i18n.translate('scoringPolicy.addDomain')" icon=""
                      severity="secondary" [outlined]="true" size="small" (onClick)="addWeightRow()" />
          </div>

          <div class="weight-row" *ngFor="let w of formWeights; let idx = index; trackBy: trackByIndex">
            <div class="weight-domain">
              <input pInputText [(ngModel)]="w.domain" [placeholder]="i18n.translate('scoringPolicy.domainPlaceholder')" class="w-full" />
            </div>
            <div class="weight-value">
              <cds-number [(ngModel)]="w.value" [min]="0" [max]="1" [step]="0.05"
                             [minFractionDigits]="2" [maxFractionDigits]="2" mode="decimal"
                             inputStyleClass="w-full" styleClass="w-full" />
            </div>
            <button class="icon-btn delete-btn" (click)="removeWeightRow(idx)" [cdsTooltip]="Remove" aria-label="Remove weight row">
              <i class=""></i>
            </button>
          </div>

          <div *ngIf="formWeights.length === 0" class="no-weights-msg">
            No weight domains defined. Click "Add Domain" to begin.
          </div>

          <!-- Weight total indicator -->
          <div class="weight-total" *ngIf="formWeights.length > 0">
            <span>Total:</span>
            <span [class.weight-valid]="isFormWeightSumValid()" [class.weight-invalid]="!isFormWeightSumValid()">
              {{ formWeightSum() | number:'1.2-2' }}
            </span>
            <span class="weight-hint" *ngIf="!isFormWeightSumValid()">(weights must sum to 1.00)</span>
            <span class="weight-hint weight-ok" *ngIf="isFormWeightSumValid()">
              <i class=""></i> Valid
            </span>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button cdsButton [label]="i18n.translate('common.cancel')" icon="" severity="secondary" [text]="true" (onClick)="closed.emit()" />
        <button cdsButton [label]="isEditing ? i18n.translate('common.update') : i18n.translate('common.create')"
                  icon="" (onClick)="saved.emit({ name: formName, weights: formWeights, isDefault: formIsDefault })"
                  [disabled]="!formName.trim() || formWeights.length === 0" />
      </ng-template>
    </cds-modal>

    <!-- Delete Confirmation Dialog -->
    <cds-modal [header]="i18n.translate('scoringPolicy.confirmDelete')" [(visible)]="showDeleteDialog"
              [modal]="true" [style]="{ width: '420px' }" [closable]="true" (onHide)="deleteClose.emit()">
      <div class="delete-confirm">
        <i class=" delete-warn-icon"></i>
        <p>Are you sure you want to delete the policy <strong>"{{ deletingPolicyName }}"</strong>? This action cannot be undone.</p>
      </div>
      <ng-template pTemplate="footer">
        <button cdsButton [label]="i18n.translate('common.cancel')" icon="" severity="secondary" [text]="true" (onClick)="deleteClose.emit()" />
        <button cdsButton [label]="i18n.translate('common.delete')" icon="" severity="danger" (onClick)="deleteConfirmed.emit()" />
      </ng-template>
    </cds-modal>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm, 0.875rem); font-weight: 600; color: var(--text-muted, #94a3b8); }
    .w-full { width: 100%; }
    .field-row-inline { display: flex; align-items: center; gap: 8px; }
    .checkbox-label {
      display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-heading, #1e293b); cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] { cursor: pointer; }

    .weights-section {
      border: 1px solid var(--border-subtle, #e2e8f0); border-radius: var(--radius-md, 8px);
      padding: 16px; background: var(--surface-ice, #f8fafc);
    }
    .weights-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .section-label { font-size: var(--font-size-sm, 0.875rem); font-weight: 700; color: var(--text-heading, #1e293b); }
    .weight-row { display: grid; grid-template-columns: 1fr 140px 36px; gap: 8px; align-items: center; margin-bottom: 8px; }
    .weight-domain { flex: 1; }
    .weight-value { width: 140px; }
    .no-weights-msg { text-align: center; color: var(--text-muted, #94a3b8); font-size: var(--font-size-sm, 0.875rem); padding: 16px; }
    .weight-total {
      display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px;
      border-top: 1px solid var(--border-subtle, #e2e8f0); font-size: var(--font-size-sm, 0.875rem); font-weight: 600;
    }
    .weight-valid { color: #16a34a; font-weight: 600; }
    .weight-invalid { color: #dc2626; font-weight: 600; }
    .weight-hint { font-weight: 400; font-size: var(--font-size-xs, 0.75rem); color: #dc2626; }
    .weight-hint.weight-ok { color: #16a34a; }

    .icon-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted, #94a3b8);
      padding: 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base, 1rem);
    }
    .icon-btn.delete-btn:hover { background: #fee2e2; color: #dc2626; }

    .delete-confirm { display: flex; gap: 12px; align-items: flex-start; }
    .delete-warn-icon { font-size: var(--font-size-2xl); color: #f59e0b; flex-shrink: 0; margin-top: 2px; }
  `],
})
export class ScoringRuleDialogComponent {
  i18n = inject(I18nService);

  /** Create/Edit dialog visibility */
  @Input() visible = false;
  @Input() isEditing = false;
  @Input() formName = '';
  @Input() formIsDefault = false;
  @Input() formWeights: WeightEntry[] = [];

  /** Delete dialog */
  @Input() showDeleteDialog = false;
  @Input() deletingPolicyName = '';

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ name: string; weights: WeightEntry[]; isDefault: boolean }>();
  @Output() deleteClose = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<void>();

  addWeightRow(): void {
    this.formWeights = [...this.formWeights, { domain: '', value: 0 }];
  }

  removeWeightRow(index: number): void {
    this.formWeights = this.formWeights.filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  formWeightSum(): number {
    return this.formWeights.reduce((sum, w) => sum + (w.value ?? 0), 0);
  }

  isFormWeightSumValid(): boolean {
    return Math.abs(this.formWeightSum() - 1.0) < 0.005;
  }
}
