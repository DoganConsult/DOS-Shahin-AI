import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

/** Form model for quick risk scoring */
export interface ScoringFormData {
  riskId: string;
  likelihood: number;
  impact: number;
  controlEffectiveness: number;
  notes: string;
}

/**
 * Presentational component: Quick-score dialog for adding a risk assessment.
 * Includes risk ID dropdown, likelihood/impact scales, control effectiveness, and notes.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-scoring-dialog',
    imports: [CommonModule, FormsModule, DialogModule, InputTextModule, TextareaModule, SelectModule, ButtonModule],
    template: `
    <p-dialog [header]="labels.assessRisk" [(visible)]="visible" [modal]="true" [style]="{width:'520px'}" (onHide)="closed.emit()">
      <div class="dialog-form">
        <div class="field">
          <label>{{ labels.riskId }}</label>
          <p-select [(ngModel)]="form.riskId" [options]="riskOptions" optionLabel="label" optionValue="value"
                      [placeholder]="labels.riskIdPlaceholder" styleClass="w-full" appendTo="body" [filter]="true" filterBy="label" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ labels.likelihood }} (1\u20135)</label>
            <p-select [(ngModel)]="form.likelihood" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>{{ labels.impact }} (1\u20135)</label>
            <p-select [(ngModel)]="form.impact" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div class="field">
          <label>{{ labels.controlEff }} (0\u2013100%)</label>
          <input pInputText type="number" [(ngModel)]="form.controlEffectiveness" class="w-full" min="0" max="100" />
        </div>
        <div class="field">
          <label>{{ labels.notes }}</label>
          <textarea pTextarea [(ngModel)]="form.notes" [rows]="3" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="labels.cancel" severity="secondary" [text]="true" (onClick)="closed.emit()" />
        <p-button [label]="labels.submit" icon="pi pi-check" (onClick)="saved.emit(form)" [disabled]="!form.riskId" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md, 12px); }
    .w-full { width: 100%; }
  `]
})
export class RiskScoringDialogComponent {
  public i18n = inject(I18nService);

  /** Dialog visibility */
  @Input() visible = false;

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Risk ID dropdown options */
  @Input() riskOptions: Array<{ label: string; value: string }> = [];

  /** Form data */
  @Input() form: ScoringFormData = { riskId: '', likelihood: 3, impact: 3, controlEffectiveness: 50, notes: '' };

  /** Scale options (1-5) */
  scaleOptions = [1, 2, 3, 4, 5].map(v => ({ label: String(v), value: v }));

  /** Emitted when dialog is closed */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when form is saved */
  @Output() saved = new EventEmitter<ScoringFormData>();
}
