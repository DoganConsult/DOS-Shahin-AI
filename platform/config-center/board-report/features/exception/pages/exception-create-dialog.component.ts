import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { ChipsModule } from 'primeng/chips';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputTextarea, DropdownModule, CalendarModule, ChipsModule],
  template: `
    <div class="exc-create-form">
      <div class="form-grid">
        <div class="form-field span-2">
          <label>{{ isAr ? 'عنوان الاستثناء' : 'Exception Title' }} *</label>
          <input pInputText [(ngModel)]="form.title" class="w-full" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'نوع الاستثناء' : 'Exception Type' }} *</label>
          <p-dropdown [options]="exceptionTypes" [(ngModel)]="form.exceptionType" optionLabel="label" optionValue="value" [placeholder]="isAr ? 'اختر النوع' : 'Select Type'" styleClass="w-full" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'مستوى المخاطر' : 'Risk Level' }} *</label>
          <p-dropdown [options]="riskLevels" [(ngModel)]="form.riskLevel" optionLabel="label" optionValue="value" styleClass="w-full" />
        </div>
        <div class="form-field span-2">
          <label>{{ isAr ? 'الوصف' : 'Description' }}</label>
          <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
        </div>
        <div class="form-field span-2">
          <label>{{ isAr ? 'المبرر التجاري' : 'Business Justification' }} *</label>
          <textarea pInputTextarea [(ngModel)]="form.businessJustification" [rows]="4" class="w-full"></textarea>
        </div>
        <div class="form-field span-2">
          <label>{{ isAr ? 'تحليل الأثر' : 'Impact Analysis' }}</label>
          <textarea pInputTextarea [(ngModel)]="form.impactAnalysis" [rows]="3" class="w-full"></textarea>
        </div>
        <div class="form-field span-2">
          <label>{{ isAr ? 'البدائل المدروسة' : 'Alternatives Considered' }}</label>
          <textarea pInputTextarea [(ngModel)]="alternativesText" [rows]="2" class="w-full" [placeholder]="isAr ? 'سطر واحد لكل بديل' : 'One per line'"></textarea>
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'السياسة المرتبطة' : 'Linked Policy ID' }}</label>
          <input pInputText [(ngModel)]="form.linkedPolicyId" class="w-full" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'الضابط المرتبط' : 'Linked Control ID' }}</label>
          <input pInputText [(ngModel)]="form.linkedControlId" class="w-full" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'المخاطرة المرتبطة' : 'Linked Risk ID' }}</label>
          <input pInputText [(ngModel)]="form.linkedRiskId" class="w-full" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'تاريخ السريان' : 'Effective Date' }}</label>
          <p-calendar [(ngModel)]="effectiveDateValue" styleClass="w-full" [showIcon]="true" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'تاريخ الانتهاء' : 'Expiry Date' }}</label>
          <p-calendar [(ngModel)]="expiryDateValue" styleClass="w-full" [showIcon]="true" />
        </div>
        <div class="form-field">
          <label>{{ isAr ? 'الوسوم' : 'Tags' }}</label>
          <p-chips [(ngModel)]="tags" [placeholder]="isAr ? 'أضف وسوم' : 'Add tags'" styleClass="w-full" />
        </div>
      </div>
      <div class="form-actions">
        <button pButton [label]="isAr ? 'إلغاء' : 'Cancel'" severity="secondary" [outlined]="true" (click)="cancel()"></button>
        <button pButton [label]="isAr ? 'إنشاء الاستثناء' : 'Create Exception'" icon="pi pi-plus" (click)="submit()" [loading]="saving()" [disabled]="!isValid()"></button>
      </div>
    </div>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .span-2 { grid-column: span 2; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: var(--text-muted); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 16px; border-top: 1px solid var(--surface-border); }
  `],
})
export class ExceptionCreateDialogComponent {
  private i18n = inject(I18nService);
  private ref = inject(DynamicDialogRef);

  saving = signal(false);
  form = {
    title: '',
    description: '',
    exceptionType: 'policy' as 'policy' | 'control' | 'compliance' | 'risk_acceptance' | 'process',
    riskLevel: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    businessJustification: '',
    impactAnalysis: '',
    linkedPolicyId: '',
    linkedControlId: '',
    linkedRiskId: '',
  };
  alternativesText = '';
  effectiveDateValue: Date | null = null;
  expiryDateValue: Date | null = null;
  tags: string[] = [];

  exceptionTypes = [
    { label: 'Policy', value: 'policy' },
    { label: 'Control', value: 'control' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Risk Acceptance', value: 'risk_acceptance' },
    { label: 'Process', value: 'process' },
  ];
  riskLevels = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  isValid(): boolean {
    return !!(this.form.title.trim() && this.form.exceptionType && this.form.riskLevel && this.form.businessJustification.trim());
  }

  cancel(): void { this.ref.close(); }

  submit(): void {
    if (!this.isValid()) return;
    this.saving.set(true);
    const alternatives = this.alternativesText.split('\n').map(s => s.trim()).filter(Boolean);
    this.ref.close({
      _intake: true,
      title: this.form.title,
      description: this.form.description || undefined,
      exceptionType: this.form.exceptionType,
      riskLevel: this.form.riskLevel,
      businessJustification: this.form.businessJustification,
      impactAnalysis: this.form.impactAnalysis || undefined,
      alternativesConsidered: alternatives.length > 0 ? alternatives : undefined,
      linkedPolicyId: this.form.linkedPolicyId || undefined,
      linkedControlId: this.form.linkedControlId || undefined,
      linkedRiskId: this.form.linkedRiskId || undefined,
      effectiveDate: this.effectiveDateValue?.toISOString() || undefined,
      expiryDate: this.expiryDateValue?.toISOString() || undefined,
      tags: this.tags.length > 0 ? this.tags : undefined,
    });
  }
}
