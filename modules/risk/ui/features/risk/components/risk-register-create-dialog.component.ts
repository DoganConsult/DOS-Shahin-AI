import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';

/** Form model for risk create/edit */
export interface RiskFormData {
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  owner: string;
  ownerTeamId: string;
  status: string;
  controlEffectiveness: number;
  nextReviewDate: string;
  threatContext: string;
  businessImpact: string;
}

/**
 * Presentational component: Create/Edit risk dialog with full form
 * including title, description, category, owner, team, likelihood/impact
 * sliders, status lifecycle dropdown, and supplementary fields.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-register-create-dialog',
    imports: [CommonModule, FormsModule, DialogModule, InputTextModule, TextareaModule, SelectModule, SliderModule, ButtonModule],
    template: `
    <p-dialog [header]="editMode ? labels.editRisk : labels.createRisk" [(visible)]="visible" [modal]="true" [focusTrap]="true" [style]="{width:'600px'}" (onHide)="closed.emit()">
      <div class="dialog-form">
        <div class="field">
          <label for="risk-title">{{ labels.title }}</label>
          <input id="risk-title" pInputText [(ngModel)]="form.title" class="w-full" />
        </div>
        <div class="field">
          <label for="risk-desc">{{ labels.description }}</label>
          <textarea id="risk-desc" pTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ labels.category }}</label>
            <p-select [(ngModel)]="form.category" [options]="categoryOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>{{ labels.owner }}</label>
            <p-select [options]="userOptions" optionLabel="fullName" optionValue="userId"
                        [(ngModel)]="form.owner" [placeholder]="isAr ? selectOwnerLabelAr : selectOwnerLabelEn" [filter]="true" filterBy="fullName,email"
                        [showClear]="true" styleClass="w-full" appendTo="body">
              <ng-template let-user pTemplate="item">
                <div>
                  <span>{{ user.fullName }}</span>
                  <small class="text-muted" style="margin-inline-start:8px">{{ user.departmentName || '' }}</small>
                </div>
              </ng-template>
            </p-select>
          </div>
        </div>
        <div class="field">
          <label>{{ responsibleTeamLabel }}</label>
          <p-select [options]="teamOptions" optionLabel="name" optionValue="teamId"
                      [(ngModel)]="form.ownerTeamId" [placeholder]="isAr ? selectTeamLabelAr : selectTeamLabelEn" [filter]="true" [showClear]="true"
                      styleClass="w-full" appendTo="body" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ labels.likelihood }}: {{ form.likelihood }}</label>
            <p-slider [(ngModel)]="form.likelihood" [min]="1" [max]="5" [step]="1" />
          </div>
          <div class="field">
            <label>{{ labels.impact }}: {{ form.impact }}</label>
            <p-slider [(ngModel)]="form.impact" [min]="1" [max]="5" [step]="1" />
          </div>
        </div>
        <div class="field">
          <label>{{ labels.status }}</label>
          <p-select [(ngModel)]="form.status"
                      [options]="statusOptions"
                      optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body"
                      [disabled]="editMode && statusOptions.length === 0" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ labels.controlEff }} (0\u2013100%)</label>
            <input pInputText type="number" [(ngModel)]="form.controlEffectiveness" class="w-full" min="0" max="100" />
          </div>
          <div class="field">
            <label>{{ labels.nextReviewDate }}</label>
            <input pInputText type="date" [(ngModel)]="form.nextReviewDate" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>{{ labels.businessImpact }}</label>
          <input pInputText [(ngModel)]="form.businessImpact" class="w-full" />
        </div>
        <div class="field">
          <label>{{ labels.threatContext }}</label>
          <input pInputText [(ngModel)]="form.threatContext" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="labels.cancel" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="closed.emit()" />
        <p-button [label]="labels.save" icon="pi pi-check" (onClick)="saved.emit(form)" [disabled]="!form.title.trim()" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md, 12px); }
    .w-full { width: 100%; }
    .text-muted { color: var(--text-muted); }
  `]
})
export class RiskRegisterCreateDialogComponent {
  public i18n = inject(I18nService);

  /** Dialog visibility */
  @Input() visible = false;

  /** Whether this is edit mode */
  @Input() editMode = false;

  /** Whether the UI is in Arabic */
  @Input() isAr = false;

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Form data */
  @Input() form: RiskFormData = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', ownerTeamId: '', status: 'identified', controlEffectiveness: 50, nextReviewDate: '', threatContext: '', businessImpact: '' };

  /** Category dropdown options */
  @Input() categoryOptions: Array<{ label: string; value: string }> = [];

  /** User dropdown options */
  @Input() userOptions: Array<Record<string, any>> = [];

  /** Team dropdown options */
  @Input() teamOptions: Array<Record<string, any>> = [];

  /** Status dropdown options (lifecycle-aware) */
  @Input() statusOptions: Array<{ label: string; value: string }> = [];

  /** Emitted when dialog is closed */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when form is saved */
  @Output() saved = new EventEmitter<RiskFormData>();

  /** Static label constants */
  readonly selectOwnerLabelEn = 'Select Owner';
  readonly selectOwnerLabelAr = '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0624\u0648\u0644';
  readonly selectTeamLabelEn = 'Select Team';
  readonly selectTeamLabelAr = '\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0631\u064a\u0642';
  readonly responsibleTeamLabel = this.i18n.isAr() ? '\u0627\u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0633\u0624\u0648\u0644' : 'Responsible Team';
}
