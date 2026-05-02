import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleCrudApiService, CrudCapability } from '@app/core/modules/module-crud-api.service';
import type { ModuleFormFieldDefinition } from '../../../contracts/module-shell-definition';
import { MODULE_CREATE_FORM_FIELDS } from '../../../contracts/module-form-fields';
import { MODULE_SHELL_REGISTRY } from '../../../contracts/module-shell-registry';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-generic-module-create-dialog',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, InputTextarea, DropdownModule, CalendarModule, InputNumberModule, InputSwitchModule, MultiSelectModule, TooltipModule],
    template: `
    <div class="gmc-form" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      <div class="gmc-header">
        <div class="gmc-icon" [style.background]="accentBg">
          <i [class]="'pi ' + moduleIcon" [style.color]="accentColor"></i>
        </div>
        <div class="gmc-title-block">
          <h2 class="gmc-title">{{ isAr ? ('إنشاء ' + moduleNameAr) : ('Create ' + moduleNameEn) }}</h2>
          <span class="gmc-subtitle">{{ isAr ? 'أدخل المعلومات المطلوبة' : 'Fill in the required information' }}</span>
        </div>
        @if (!capability() || !capability()?.canCreate) {
          <span class="gmc-readonly-badge"><i class="pi pi-lock"></i> {{ isAr ? 'للقراءة فقط' : 'Read-only' }}</span>
        }
      </div>

      @if (serverError()) {
        <div class="gmc-error">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ serverError() }}</span>
          <button pButton icon="pi pi-times" [text]="true" size="small" (click)="serverError.set('')"></button>
        </div>
      }

      <div class="gmc-grid">
        @for (field of fields(); track field.id) {
          <div class="gmc-field" [class.gmc-span-2]="field.span === 2">
            <label class="gmc-label" [class.gmc-required]="field.required">
              {{ isAr ? field.labelAr : field.labelEn }}
            </label>
            @switch (field.type) {
              @case ('text') {
                <input pInputText [(ngModel)]="formData[field.id]" class="w-full"
                       [placeholder]="isAr ? (field.placeholderAr || '') : (field.placeholder || '')"
                       [class.ng-invalid]="submitted() && field.required && !formData[field.id]" />
              }
              @case ('textarea') {
                <textarea pInputTextarea [(ngModel)]="formData[field.id]" [rows]="4" class="w-full"
                          [placeholder]="isAr ? (field.placeholderAr || '') : (field.placeholder || '')"
                          [class.ng-invalid]="submitted() && field.required && !formData[field.id]"></textarea>
              }
              @case ('rich-text') {
                <textarea pInputTextarea [(ngModel)]="formData[field.id]" [rows]="6" class="w-full"></textarea>
              }
              @case ('select') {
                <p-dropdown [options]="getOptions(field)" [(ngModel)]="formData[field.id]"
                            [optionLabel]="isAr ? 'labelAr' : 'labelEn'" optionValue="value"
                            [placeholder]="isAr ? 'اختر...' : 'Select...'" styleClass="w-full" [showClear]="true"
                            [class.ng-invalid]="submitted() && field.required && !formData[field.id]" />
              }
              @case ('multiselect') {
                <p-multiSelect [options]="getOptions(field)" [(ngModel)]="formData[field.id]"
                               [optionLabel]="isAr ? 'labelAr' : 'labelEn'" optionValue="value"
                               [placeholder]="isAr ? 'اختر...' : 'Select...'" styleClass="w-full" />
              }
              @case ('date') {
                <p-calendar [(ngModel)]="formData[field.id]" styleClass="w-full" [showIcon]="true" dateFormat="yy-mm-dd" />
              }
              @case ('number') {
                <p-inputNumber [(ngModel)]="formData[field.id]" styleClass="w-full" />
              }
              @case ('toggle') {
                <p-inputSwitch [(ngModel)]="formData[field.id]" />
              }
            }
            @if (submitted() && field.required && !formData[field.id]) {
              <small class="gmc-field-error">{{ isAr ? 'هذا الحقل مطلوب' : 'This field is required' }}</small>
            }
          </div>
        }
      </div>

      <div class="gmc-actions">
        <button pButton [label]="isAr ? 'إلغاء' : 'Cancel'" severity="secondary" [outlined]="true" (click)="cancel()"></button>
        <button pButton [label]="isAr ? 'إنشاء' : 'Create'" icon="pi pi-plus" (click)="submit()" [loading]="saving()"
                [disabled]="!canCreate()" [pTooltip]="!canCreate() ? (isAr ? 'ليس لديك صلاحية الإنشاء' : 'No create permission') : ''"></button>
      </div>
    </div>
  `,
    styles: [`
    .gmc-form { min-width: 500px; max-width: 720px; }
    .gmc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--surface-border); }
    .gmc-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .gmc-icon i { font-size: var(--font-size-xl); }
    .gmc-title-block { display: flex; flex-direction: column; flex: 1; }
    .gmc-title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; }
    .gmc-subtitle { font-size: var(--font-size-sm); color: var(--text-muted); }
    .gmc-readonly-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: var(--radius-sm); background: var(--surface-100); font-size: var(--font-size-2xs); font-weight: 700; color: var(--text-muted); }
    .gmc-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-sm); background: var(--red-50, #fef2f2); color: var(--red-600, #dc2626); font-size: var(--font-size-xs-plus); margin-bottom: 16px; }
    .gmc-error i { font-size: var(--font-size-md); }
    .gmc-error span { flex: 1; }
    .gmc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .gmc-span-2 { grid-column: span 2; }
    .gmc-field { display: flex; flex-direction: column; gap: 6px; }
    .gmc-label { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: var(--text-muted); }
    .gmc-required::after { content: ' *'; color: var(--red-500, #ef4444); }
    .gmc-field-error { color: var(--red-500, #ef4444); font-size: var(--font-size-2xs); }
    .gmc-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 16px; border-top: 1px solid var(--surface-border); }
    @media (max-width: 640px) { .gmc-form { min-width: auto; } .gmc-grid { grid-template-columns: 1fr; } .gmc-span-2 { grid-column: span 1; } }
  `]
})
export class GenericModuleCreateDialogComponent implements OnInit {
  private i18n = inject(I18nService);
  private ref = inject(DynamicDialogRef);
  private dialogConfig = inject(DynamicDialogConfig);
  private crudApi = inject(ModuleCrudApiService);

  saving = signal(false);
  submitted = signal(false);
  serverError = signal('');
  capability = signal<CrudCapability | null>(null);
  formData: Record<string, unknown> = {};

  private moduleDef = MODULE_SHELL_REGISTRY[this.moduleCode];

  get moduleCode(): string { return this.dialogConfig.data?.moduleCode ?? ''; }
  get moduleNameEn(): string { return this.moduleDef?.moduleName?.en ?? this.moduleCode; }
  get moduleNameAr(): string { return this.moduleDef?.moduleName?.ar ?? this.moduleCode; }
  get moduleIcon(): string { return this.moduleDef?.moduleIcon ?? 'pi-box'; }
  get accentColor(): string { return `var(--module-accent-${this.moduleDef?.moduleAccentToken ?? 'gray'})`; }
  get accentBg(): string { return `rgba(var(--module-accent-${this.moduleDef?.moduleAccentToken ?? 'gray'}-rgb, 111,111,111), 0.08)`; }
  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  canCreate = computed(() => {
    const cap = this.capability();
    return cap === null || cap.canCreate;
  });

  fields = computed(() => {
    const custom = this.dialogConfig.data?.fields as ModuleFormFieldDefinition[] | undefined;
    if (custom?.length) return custom;
    return MODULE_CREATE_FORM_FIELDS[this.moduleCode] ?? [];
  });

  isValid = computed(() => {
    const requiredFields = this.fields().filter(f => f.required);
    return requiredFields.every(f => {
      const v = this.formData[f.id];
      return v !== undefined && v !== null && v !== '';
    });
  });

  ngOnInit(): void {
    this.crudApi.getModuleCapability(this.moduleCode).subscribe(cap => {
      if (cap) this.capability.set(cap);
    });
  }

  getOptions(field: ModuleFormFieldDefinition): Array<{ value: string; labelEn: string; labelAr: string }> {
    return field.options ?? [];
  }

  cancel(): void { this.ref.close(); }

  submit(): void {
    this.submitted.set(true);
    this.serverError.set('');

    if (!this.isValid()) return;

    this.saving.set(true);
    const cap = this.capability();
    const apiBase = cap?.apiBase;

    if (apiBase) {
      this.crudApi.createRecord(apiBase, { ...this.formData }).subscribe({
        next: (record) => {
          this.saving.set(false);
          this.ref.close({ moduleCode: this.moduleCode, data: record, saved: true });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.error ?? err?.error?.message ?? err?.message ?? 'Creation failed';
          this.serverError.set(msg);
        },
      });
    } else {
      this.saving.set(false);
      this.ref.close({ moduleCode: this.moduleCode, data: { ...this.formData }, saved: false });
    }
  }
}
