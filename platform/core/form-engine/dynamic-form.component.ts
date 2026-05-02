import { Component, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormSchema, FormField, ValidationRule } from './form-schema.types';
import { FormEngineService } from './form-engine.service';

import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/datepicker';
import { InputTextarea } from 'primeng/textarea';
import { PanelModule } from 'primeng/panel';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, 
    InputTextModule, InputNumberModule, CheckboxModule, DropdownModule, ButtonModule,
    MultiSelectModule, CalendarModule, InputTextarea, PanelModule
  ],
  template: `
    <div *ngIf="loading" class="p-4 text-center">Loading form schema...</div>
    <div *ngIf="error" class="p-4 text-red-600">{{ error }}</div>

    <form *ngIf="formGroup && schema" [formGroup]="formGroup" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
      
      <!-- Section Layout -->
      <ng-container *ngIf="schema.layout === 'sections'">
        <p-panel *ngFor="let section of schema.sections" [header]="section.title" [toggleable]="!!section.collapsible" [collapsed]="!!section.defaultCollapsed" styleClass="mb-4">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <ng-container *ngFor="let field of section.fields">
              <div [ngClass]="getColSpanClass(field.span)" *ngIf="!field.showWhen || evaluateCondition(field.showWhen)" class="flex flex-col gap-1">
                <label [for]="field.key" class="font-semibold text-sm">{{ field.label }}</label>
                <ng-container [ngTemplateOutlet]="fieldTemplate" [ngTemplateOutletContext]="{ $implicit: field }"></ng-container>
                <small *ngIf="field.description" class="text-gray-500">{{ field.description }}</small>
                <small *ngIf="isInvalid(field.key)" class="text-red-500">Invalid value for {{ field.label }}</small>
              </div>
            </ng-container>
          </div>
        </p-panel>
      </ng-container>

      <!-- Flat Layout -->
      <ng-container *ngIf="schema.layout !== 'sections' && schema.fields">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <ng-container *ngFor="let field of schema.fields">
            <div [ngClass]="getColSpanClass(field.span)" *ngIf="!field.showWhen || evaluateCondition(field.showWhen)" class="flex flex-col gap-1">
              <label [for]="field.key" class="font-semibold text-sm">{{ field.label }}</label>
              <ng-container [ngTemplateOutlet]="fieldTemplate" [ngTemplateOutletContext]="{ $implicit: field }"></ng-container>
              <small *ngIf="field.description" class="text-gray-500">{{ field.description }}</small>
              <small *ngIf="isInvalid(field.key)" class="text-red-500">Invalid value for {{ field.label }}</small>
            </div>
          </ng-container>
        </div>
      </ng-container>

      <!-- Form Actions -->
      <div class="flex flex-row justify-end gap-2 mt-4" *ngIf="schema.actions && schema.actions.length > 0">
        <p-button *ngFor="let action of schema.actions" 
                  [label]="action.label" 
                  [type]="action.type === 'submit' ? 'submit' : 'button'"
                  [severity]="getSeverity(action.variant)"
                  [outlined]="action.variant === 'ghost'"
                  (onClick)="onActionClick(action)"
                  [disabled]="schema.disabledWhen && evaluateCondition(schema.disabledWhen)">
        </p-button>
      </div>
      <div class="flex flex-row justify-end gap-2 mt-4" *ngIf="!schema.actions || schema.actions.length === 0">
        <p-button label="Submit" type="submit" [disabled]="formGroup.invalid"></p-button>
      </div>
    </form>

    <ng-template #fieldTemplate let-field>
      <ng-container [formGroup]="formGroup" [ngSwitch]="field.type">
        
        <input *ngSwitchCase="'text'" pInputText [id]="field.key" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readonly]="!!field.readonly" class="w-full" />
        
        <input *ngSwitchCase="'email'" pInputText type="email" [id]="field.key" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readonly]="!!field.readonly" class="w-full" />
        
        <p-inputNumber *ngSwitchCase="'number'" [id]="field.key" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readonly]="!!field.readonly" class="w-full" styleClass="w-full"></p-inputNumber>
        
        <textarea *ngSwitchCase="'textarea'" pInputTextarea [id]="field.key" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readonly]="!!field.readonly" rows="3" class="w-full"></textarea>
        
        <p-checkbox *ngSwitchCase="'boolean'" [inputId]="field.key" [formControlName]="field.key" [binary]="true"></p-checkbox>
        
        <p-dropdown *ngSwitchCase="'select'" [id]="field.key" [formControlName]="field.key" [options]="field.options || []" optionLabel="label" optionValue="value" [placeholder]="field.placeholder || 'Select'" [readonly]="!!field.readonly" class="w-full" styleClass="w-full"></p-dropdown>
        
        <p-multiSelect *ngSwitchCase="'multi_select'" [id]="field.key" [formControlName]="field.key" [options]="field.options || []" optionLabel="label" optionValue="value" [placeholder]="field.placeholder || 'Select'" [readonly]="!!field.readonly" class="w-full" styleClass="w-full"></p-multiSelect>
        
        <p-calendar *ngSwitchCase="'date'" [inputId]="field.key" [formControlName]="field.key" [showIcon]="true" [readonlyInput]="!!field.readonly" class="w-full"></p-calendar>
        
        <div *ngSwitchDefault class="text-xs text-gray-400">Unsupported field type: {{field.type}}</div>
      </ng-container>
    </ng-template>
  `
})
export class DynamicFormComponent implements OnInit, OnChanges {
  @Input() entityType?: string;
  @Input() schema?: FormSchema;
  @Input() data?: any;
  
  @Output() formSubmit = new EventEmitter<any>();
  @Output() actionClick = new EventEmitter<string>();

  formGroup!: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private formEngineService: FormEngineService) {}

  ngOnInit(): void {
    if (this.entityType && !this.schema) {
      this.loadSchema(this.entityType);
    } else if (this.schema) {
      this.buildForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema'] && !changes['schema'].firstChange) {
      this.buildForm();
    }
    if (changes['data'] && this.formGroup) {
      this.formGroup.patchValue(this.data || {});
    }
  }

  loadSchema(type: string): void {
    this.loading = true;
    this.error = null;
    this.formEngineService.getSchema(type).subscribe({
      next: (s) => {
        this.schema = s;
        this.buildForm();
        this.loading = false;
      },
      error: (e) => {
        this.error = 'Failed to load form schema';
        this.loading = false;
        console.error(e);
      }
    });
  }

  buildForm(): void {
    if (!this.schema) return;
    const group: Record<string, any> = {};
    const fields = this.schema.layout === 'sections' 
      ? this.schema.sections?.flatMap(s => s.fields) || []
      : this.schema.fields || [];

    for (const field of fields) {
      const value = this.data?.[field.key] !== undefined ? this.data[field.key] : field.defaultValue;
      const validators = this.buildValidators(field.validations);
      group[field.key] = [{ value, disabled: field.readonly }, validators];
    }

    this.formGroup = this.fb.group(group);
  }

  buildValidators(rules?: ValidationRule[]) {
    if (!rules) return [];
    const validators = [];
    for (const rule of rules) {
      switch (rule.type) {
        case 'required': validators.push(Validators.required); break;
        case 'min': validators.push(Validators.min(rule.value)); break;
        case 'max': validators.push(Validators.max(rule.value)); break;
        case 'minLength': validators.push(Validators.minLength(rule.value)); break;
        case 'maxLength': validators.push(Validators.maxLength(rule.value)); break;
        case 'email': validators.push(Validators.email); break;
        case 'pattern': validators.push(Validators.pattern(rule.regex)); break;
      }
    }
    return validators;
  }

  isInvalid(key: string): boolean {
    const ctrl = this.formGroup.get(key);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getSeverity(variant?: string): 'success' | 'info' | 'warning' | 'danger' | 'help' | 'primary' | 'secondary' {
    switch(variant) {
      case 'primary': return 'primary';
      case 'secondary': return 'secondary';
      case 'danger': return 'danger';
      default: return 'primary';
    }
  }

  getColSpanClass(span?: number): string {
    const cols = span || 12;
    return `md:col-span-${cols} col-span-12`;
  }

  evaluateCondition(condition: any): boolean {
    // A simplified condition evaluator stub.
    // In production, use json-logic-js or similar.
    return true; 
  }

  onActionClick(action: any): void {
    if (action.type === 'submit') {
      // Handled by ngSubmit
      return;
    }
    if (action.emitEvent) {
      this.actionClick.emit(action.emitEvent);
    }
  }

  onSubmit(): void {
    if (this.formGroup.valid) {
      this.formSubmit.emit(this.formGroup.value);
    } else {
      Object.values(this.formGroup.controls).forEach(c => c.markAsTouched());
    }
  }
}
