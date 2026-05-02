/**
 * Setup Wizard Step Input — Renders the input controls for each wizard step.
 *
 * Presentational component that displays the appropriate form controls
 * (text input, option grid, subsidiary tags, confirm buttons, or completion view)
 * based on the current wizard step, and emits user actions to the parent.
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { SetupStep } from '../setup-wizard.types';
import {
  INDUSTRY_SECTORS,
  EMPLOYEE_COUNTS,
  KSA_REGIONS,
} from '../setup-wizard.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-setup-wizard-step-input',
    imports: [CommonModule, FormsModule],
    template: `
    @if (currentStep() !== 'complete') {
      <div class="input-area">
        <!-- Validation error -->
        @if (validationError()) {
          <div class="validation-error" role="alert">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ validationError() }}</span>
          </div>
        }

        @switch (currentStep()) {
          @case ('welcome') {
            <button class="btn-primary" (click)="startSetup.emit()" [disabled]="loading()">
              <i class="pi pi-arrow-right"></i>
              {{ isAr() ? 'لنبدأ!' : "Let's get started!" }}
            </button>
          }
          @case ('company_name') {
            <div class="input-row">
              <input type="text" class="text-input"
                     [ngModel]="companyName()"
                     (ngModelChange)="companyNameChange.emit($event)"
                     [placeholder]="isAr() ? 'أدخل اسم شركتك...' : 'Enter your company name...'"
                     (keyup.enter)="submitCompanyName.emit()"
                     [attr.aria-label]="isAr() ? 'اسم الشركة' : 'Company name'"
                     [disabled]="loading()" />
              <button aria-label="Send" class="btn-send" (click)="submitCompanyName.emit()" [disabled]="loading() || !companyName()?.trim()">
                <i class="pi pi-send"></i>
              </button>
            </div>
          }
          @case ('industry_sector') {
            <div class="option-grid">
              @for (sector of industrySectors; track sector.id) {
                <button class="option-btn" (click)="selectIndustry.emit(sector.id)"
                        [disabled]="loading()"
                        [class.selected]="selectedSector() === sector.id">
                  {{ isAr() ? sector.labelAr : sector.labelEn }}
                </button>
              }
            </div>
          }
          @case ('employee_count') {
            <div class="option-grid compact">
              @for (ec of employeeCounts; track ec.id) {
                <button class="option-btn" (click)="selectEmployeeCount.emit(ec.id)"
                        [disabled]="loading()"
                        [class.selected]="selectedEmployeeCount() === ec.id">
                  {{ isAr() ? ec.labelAr : ec.labelEn }}
                </button>
              }
            </div>
          }
          @case ('ksa_region') {
            <div class="option-grid">
              @for (region of ksaRegions; track region.id) {
                <button class="option-btn" (click)="selectRegion.emit(region.id)"
                        [disabled]="loading()"
                        [class.selected]="selectedRegion() === region.id">
                  {{ isAr() ? region.labelAr : region.labelEn }}
                </button>
              }
            </div>
          }
          @case ('subsidiaries') {
            <div class="subsidiary-input">
              <div class="input-row">
                <input type="text" class="text-input"
                       [ngModel]="subsidiaryInput()"
                       (ngModelChange)="subsidiaryInputChange.emit($event)"
                       [placeholder]="isAr() ? 'أدخل اسم الشركة التابعة (اختياري)...' : 'Enter subsidiary name (optional)...'"
                       (keyup.enter)="addSubsidiary.emit()"
                       [attr.aria-label]="isAr() ? 'اسم الشركة التابعة' : 'Subsidiary name'"
                       [disabled]="loading()" />
                <button aria-label="Add" class="btn-send" (click)="addSubsidiary.emit()" [disabled]="loading() || !subsidiaryInput()?.trim()">
                  <i class="pi pi-plus"></i>
                </button>
              </div>
              @if (subsidiaries().length > 0) {
                <div class="subsidiary-tags">
                  @for (sub of subsidiaries(); track sub) {
                    <span class="sub-tag">
                      {{ sub }}
                      <button class="sub-remove" (click)="removeSubsidiary.emit(sub)" [attr.aria-label]="'Remove ' + sub">
                        <i class="pi pi-times"></i>
                      </button>
                    </span>
                  }
                </div>
              }
              <button class="btn-primary" (click)="submitSubsidiaries.emit()" [disabled]="loading()">
                {{ subsidiaries().length > 0
                  ? (isAr() ? 'متابعة' : 'Continue')
                  : (isAr() ? 'تخطي — لا توجد شركات تابعة' : 'Skip — No subsidiaries') }}
              </button>
            </div>
          }
          @case ('confirm') {
            <div class="confirm-actions">
              <button class="btn-primary" (click)="confirmProfile.emit()" [disabled]="loading()">
                @if (loading()) {
                  <i class="pi pi-spin pi-spinner"></i>
                }
                {{ isAr() ? 'تأكيد وحفظ الملف' : 'Confirm & Save Profile' }}
              </button>
              <button class="btn-secondary" (click)="restartSetup.emit()" [disabled]="loading()">
                {{ isAr() ? 'البدء من جديد' : 'Start Over' }}
              </button>
            </div>
          }
        }
      </div>
    } @else {
      <!-- Completion state -->
      <div class="completion-area">
        <div class="completion-icon">
          <i class="pi pi-check-circle"></i>
        </div>
        <p class="completion-text">
          {{ isAr() ? 'تم إعداد ملف شركتك بنجاح! جارٍ الانتقال إلى خارطة الطريق...' : 'Your company profile is set up! Moving to your GRC roadmap...' }}
        </p>
        <button class="btn-primary" (click)="goToRoadmap.emit()">
          {{ isAr() ? 'عرض خارطة الطريق' : 'View Roadmap' }}
        </button>
      </div>
    }
  `,
    styles: [`
    /* ── Input area ── */
    .input-area {
      flex-shrink: 0;
      padding: var(--space-md) 0 0;
      border-top: 1px solid var(--border-subtle);
    }

    .validation-error {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-sm);
      margin-bottom: var(--space-sm);
      background: rgba(var(--module-accent-red-rgb), 0.08);
      border: 1px solid rgba(var(--module-accent-red-rgb), 0.2);
      border-radius: var(--radius-sm);
      color: var(--danger);
      font-size: var(--font-size-xs);
    }

    .input-row {
      display: flex;
      gap: var(--space-sm);
    }

    .text-input {
      flex: 1;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      background: var(--surface);
      color: var(--text-body);
      outline: none;
      transition: border-color 200ms ease;
    }

    .text-input:focus {
      border-color: var(--primary);
      box-shadow: var(--shadow-glow);
    }

    .text-input::placeholder {
      color: var(--text-muted);
    }

    .btn-send {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      border: none;
      background: var(--primary);
      color: var(--text-on-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 200ms ease;
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius);
      border: none;
      background: var(--primary);
      color: var(--text-on-primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      transition: opacity 200ms ease;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      background: var(--surface);
      color: var(--text-body);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: border-color 200ms ease;
    }

    .btn-secondary:hover {
      border-color: var(--primary);
    }

    /* ── Option grid ── */
    .option-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-sm);
    }

    .option-grid.compact {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }

    .option-btn {
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text-body);
      font-size: var(--font-size-sm);
      cursor: pointer;
      text-align: start;
      transition: all 200ms ease;
    }

    .option-btn:hover {
      border-color: var(--primary);
      background: var(--surface-ice);
    }

    .option-btn.selected {
      border-color: var(--primary);
      background: var(--surface-ice);
      color: var(--primary);
      font-weight: var(--font-bold);
    }

    .option-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Subsidiary tags ── */
    .subsidiary-input {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .subsidiary-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .sub-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--surface-ice);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      font-size: var(--font-size-xs);
      color: var(--primary);
    }

    .sub-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--primary);
      padding: 0;
      font-size: var(--font-size-xs);
      display: flex;
      align-items: center;
    }

    /* ── Confirm actions ── */
    .confirm-actions {
      display: flex;
      gap: var(--space-sm);
      justify-content: center;
    }

    /* ── Completion ── */
    .completion-area {
      text-align: center;
      padding: var(--space-xl) 0;
    }

    .completion-icon {
      font-size: var(--font-size-6xl);
      color: var(--success);
      margin-bottom: var(--space-md);
    }

    .completion-text {
      color: var(--text-body);
      font-size: var(--font-size-base);
      margin-bottom: var(--space-lg);
    }

    @media (max-width: 768px) {
      .option-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SetupWizardStepInputComponent {
  // ── Inputs ──
  readonly currentStep = input.required<SetupStep>();
  readonly isAr = input.required<boolean>();
  readonly loading = input.required<boolean>();
  readonly validationError = input.required<string>();
  readonly companyName = input.required<string>();
  readonly selectedSector = input.required<string>();
  readonly selectedEmployeeCount = input.required<string>();
  readonly selectedRegion = input.required<string>();
  readonly subsidiaryInput = input.required<string>();
  readonly subsidiaries = input.required<string[]>();

  // ── Outputs (user actions) ──
  readonly startSetup = output<void>();
  readonly submitCompanyName = output<void>();
  readonly companyNameChange = output<string>();
  readonly selectIndustry = output<string>();
  readonly selectEmployeeCount = output<string>();
  readonly selectRegion = output<string>();
  readonly addSubsidiary = output<void>();
  readonly removeSubsidiary = output<string>();
  readonly subsidiaryInputChange = output<string>();
  readonly submitSubsidiaries = output<void>();
  readonly confirmProfile = output<void>();
  readonly restartSetup = output<void>();
  readonly goToRoadmap = output<void>();

  // ── Reference data ──
  readonly industrySectors = INDUSTRY_SECTORS;
  readonly employeeCounts = EMPLOYEE_COUNTS;
  readonly ksaRegions = KSA_REGIONS;
}
