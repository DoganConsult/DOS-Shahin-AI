/**
 * QuestionRendererComponent
 *
 * Reusable component that renders a single onboarding question based on its
 * question_type. Used by both the workspace setup shell and module onboarding shells.
 *
 * Input: question definition + current answer value
 * Output: answerChanged event with { questionCode, value }
 */

import { Component, Input, Output, EventEmitter, signal, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../ports/onboarding-platform.port';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/datepicker';
import { ChipsModule } from 'primeng/chips';
import { TooltipModule } from 'primeng/tooltip';
import type { OnboardingQuestion } from '../models/onboarding.models';

export interface AnswerChangedEvent {
  questionCode: string;
  value: unknown;
  answerText?: string | null;
  answerNumber?: number | null;
  answerBool?: boolean | null;
  answerDate?: string | null;
  answerJson?: unknown;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-renderer',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    InputTextModule, Textarea, SelectModule, MultiSelectModule,
    InputSwitchModule, InputNumberModule, CalendarModule, ChipsModule, TooltipModule,
  ],
  template: `
    <div class="question-field" [class.required]="question.is_required">
      <label [for]="question.question_code" class="question-label">
        {{ label }}
        @if (question.is_required) { <span class="required-star">*</span> }
        @if (helpText || tooltipText) {
          <i class="pi pi-info-circle help-icon"
             [pTooltip]="helpText || tooltipText"
             tooltipPosition="top"></i>
        }
      </label>

      @switch (question.question_type) {
        @case ('text') {
          <input pInputText
                 [id]="question.question_code"
                 [value]="currentValue ?? ''"
                 [placeholder]="placeholder" [attr.aria-label]="placeholder"
                 (input)="onTextChange($event)"
                 class="w-full" />
        }
        @case ('email') {
          <input pInputText type="email"
                 [id]="question.question_code"
                 [value]="currentValue ?? ''"
                 [placeholder]="placeholder" [attr.aria-label]="placeholder"
                 (input)="onTextChange($event)"
                 class="w-full" />
        }
        @case ('textarea') {
          <textarea pInputTextarea
                    [id]="question.question_code"
                    [value]="currentValue ?? ''"
                    [placeholder]="placeholder" [attr.aria-label]="placeholder"
                    (input)="onTextChange($event)"
                    [rows]="4"
                    class="w-full"></textarea>
        }
        @case ('select') {
          <p-select [id]="question.question_code"
                      [options]="dropdownOptions"
                      [ngModel]="currentValue"
                      (ngModelChange)="onSelectChange($event)"
                      [placeholder]="placeholder || (isAr ? 'اختر...' : 'Select...')"
                      [showClear]="!question.is_required"
                      styleClass="w-full">
          </p-select>
        }
        @case ('multi_select') {
          <p-multiSelect [id]="question.question_code"
                         [options]="dropdownOptions"
                         [ngModel]="multiValue"
                         (ngModelChange)="onMultiSelectChange($event)"
                         [placeholder]="placeholder || (isAr ? 'اختر...' : 'Select...')"
                         styleClass="w-full"
                         display="chip">
          </p-multiSelect>
        }
        @case ('boolean') {
          <p-inputSwitch [id]="question.question_code"
                         [ngModel]="boolValue"
                         (ngModelChange)="onBoolChange($event)">
          </p-inputSwitch>
        }
        @case ('number') {
          <p-inputNumber [id]="question.question_code"
                         [ngModel]="numValue"
                         (ngModelChange)="onNumberChange($event)"
                         [placeholder]="placeholder"
                         styleClass="w-full">
          </p-inputNumber>
        }
        @case ('date') {
          <p-calendar [id]="question.question_code"
                      [ngModel]="dateValue"
                      (ngModelChange)="onDateChange($event)"
                      [showIcon]="true"
                      styleClass="w-full">
          </p-calendar>
        }
        @case ('chips') {
          <p-chips [id]="question.question_code"
                   [ngModel]="chipsValue"
                   (ngModelChange)="onChipsChange($event)"
                   [placeholder]="placeholder || (isAr ? 'اكتب واضغط Enter' : 'Type and press Enter')"
                   styleClass="w-full">
          </p-chips>
        }
        @case ('json') {
          <!-- Structured JSON editor for contacts/invites/recipients -->
          <div class="json-entries">
            @for (entry of jsonEntries; track $index) {
              <div class="json-entry-row">
                @for (field of jsonFieldNames; track field) {
                  <input pInputText
                         [value]="entry[field] ?? ''"
                         [placeholder]="field" [attr.aria-label]="field"
                         (input)="onJsonFieldChange($index, field, $event)"
                         class="json-field-input" />
                }
                <button [attr.aria-label]="i18n.translate('onboarding.close')" type="button" class="p-button p-button-text p-button-danger p-button-sm"
                        (click)="removeJsonEntry($index)">
                  <i class="pi pi-times"></i>
                </button>
              </div>
            }
            <button type="button" class="p-button p-button-text p-button-sm"
                    (click)="addJsonEntry()">
              <i class="pi pi-plus mr-1"></i> {{ i18n.translate('onboarding.addEntry') }}
            </button>
          </div>
        }
        @default {
          <input pInputText
                 [id]="question.question_code"
                 [value]="currentValue ?? ''"
                 (input)="onTextChange($event)"
                 class="w-full" />
        }
      }

      @if (validationError) {
        <small class="p-error">{{ validationError }}</small>
      }
    </div>
  `,
  styles: [`
    .question-field { margin-bottom: 1.25rem; }
    .question-label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
    .required-star { color: var(--red-500); margin-inline-start: 2px; }
    .help-icon { cursor: help; color: var(--text-color-secondary); margin-inline-start: 0.5rem; font-size: 0.75rem; }
    .p-error { display: block; margin-top: 0.25rem; }
    .json-entries { display: flex; flex-direction: column; gap: 0.5rem; }
    .json-entry-row { display: flex; gap: 0.5rem; align-items: center; }
    .json-field-input { flex: 1; min-width: 0; }
  `]
})
export class QuestionRendererComponent {
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  readonly i18n = this.platform.i18n;
  @Input() question!: OnboardingQuestion;
  @Input() currentValue: unknown = null;
  @Input() validationError: string | null = null;
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() answerChanged = new EventEmitter<AnswerChangedEvent>();

  get isAr(): boolean { return this.lang === 'ar'; }
  get label(): string { return this.isAr ? (this.question.label_ar || this.question.label_en) : this.question.label_en; }
  get helpText(): string { return this.isAr ? (this.question.help_text_ar || this.question.help_text_en || '') : (this.question.help_text_en || ''); }
  get tooltipText(): string { return this.isAr ? (this.question.tooltip_ar || this.question.tooltip_en || '') : (this.question.tooltip_en || ''); }
  get placeholder(): string { return this.isAr ? (this.question.placeholder_ar || this.question.placeholder_en || '') : (this.question.placeholder_en || ''); }

  get dropdownOptions(): { label: string; value: string }[] {
    if (!this.question.options_json) return [];
    const opts = typeof this.question.options_json === 'string'
      ? JSON.parse(this.question.options_json)
      : this.question.options_json;
    return (opts || []).map((o: Record<string, unknown>) => ({
      label: this.isAr ? (o.label_ar || o.label_en || o.value) : (o.label_en || o.label_ar || o.value),
      value: o.value
    }));
  }

  get boolValue(): boolean {
    return this.currentValue === true || this.currentValue === 'true';
  }

  get numValue(): number | null {
    return this.currentValue != null ? Number(this.currentValue) : null;
  }

  get dateValue(): Date | null {
    return this.currentValue ? new Date(this.currentValue as string | number) : null;
  }

  get multiValue(): string[] {
    if (Array.isArray(this.currentValue)) return this.currentValue as string[];
    if (typeof this.currentValue === 'string') {
      try { return JSON.parse(this.currentValue); } catch { return []; }
    }
    return [];
  }

  get chipsValue(): string[] {
    if (Array.isArray(this.currentValue)) return this.currentValue as string[];
    return [];
  }

  /** JSON entries for structured editors (contacts, invites, recipients) */
  get jsonEntries(): Record<string, string>[] {
    if (Array.isArray(this.currentValue)) return this.currentValue as Record<string, string>[];
    if (typeof this.currentValue === 'string') {
      try { const parsed = JSON.parse(this.currentValue); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  }

  /** Infer field names from question_code for JSON editor columns */
  get jsonFieldNames(): string[] {
    const code = this.question.question_code;
    if (code === 'KEY_CONTACTS') return ['role', 'name', 'email', 'module'];
    if (code === 'INVITE_USERS') return ['name', 'email', 'role', 'module'];
    if (code === 'REPORT_RECIPIENTS') return ['email', 'name'];
    // Fallback: infer from first entry or default
    const first = this.jsonEntries[0];
    return first ? Object.keys(first) : ['value'];
  }

  onJsonFieldChange(index: number, field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const entries = [...this.jsonEntries];
    entries[index] = { ...entries[index], [field]: value };
    this.emit(entries, { answerJson: entries });
  }

  addJsonEntry(): void {
    const empty: Record<string, string> = {};
    for (const f of this.jsonFieldNames) empty[f] = '';
    const entries = [...this.jsonEntries, empty];
    this.emit(entries, { answerJson: entries });
  }

  removeJsonEntry(index: number): void {
    const entries = this.jsonEntries.filter((_, i) => i !== index);
    this.emit(entries, { answerJson: entries });
  }

  onTextChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.emit(value, { answerText: value });
  }

  onSelectChange(value: string): void {
    this.emit(value, { answerText: value });
  }

  onMultiSelectChange(value: string[]): void {
    this.emit(value, { answerJson: value });
  }

  onBoolChange(value: boolean): void {
    this.emit(value, { answerBool: value });
  }

  onNumberChange(value: number): void {
    this.emit(value, { answerNumber: value });
  }

  onDateChange(value: Date): void {
    const iso = value?.toISOString() || null;
    this.emit(iso, { answerDate: iso });
  }

  onChipsChange(value: string[]): void {
    this.emit(value, { answerJson: value });
  }

  private emit(value: unknown, typed: Partial<AnswerChangedEvent>): void {
    this.answerChanged.emit({
      questionCode: this.question.question_code,
      value,
      answerText: typed.answerText ?? null,
      answerNumber: typed.answerNumber ?? null,
      answerBool: typed.answerBool ?? null,
      answerDate: typed.answerDate ?? null,
      answerJson: typed.answerJson ?? null,
    });
  }
}
