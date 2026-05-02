/**
 * Report Builder Generate & Deliver — Step 4: generate now or schedule.
 *
 * Presentational child of ReportBuilderComponent.
 */

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportTemplate } from '@app/reports/reports-api.service';

type Frequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface ScheduleConfig {
  frequency: Frequency;
  weekDay: string;
  monthDay: number;
  recipients: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-builder-generate-deliver',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="rb-section">
      <div class="rb-section-header">
        <span class="rb-section-title">
          <i class="pi pi-send" aria-hidden="true"></i>
          {{ isAr() ? 'إنشاء وتسليم' : 'Generate & Deliver' }}
        </span>
      </div>

      <!-- Delivery mode toggle -->
      <div class="rb-delivery-tabs">
        <button class="rb-dtab" [class.active]="deliveryMode === 'now'" (click)="deliveryModeChange.emit('now')">
          <i class="pi pi-bolt" aria-hidden="true"></i>
          {{ isAr() ? 'الآن' : 'Generate Now' }}
        </button>
        <button class="rb-dtab" [class.active]="deliveryMode === 'schedule'" (click)="deliveryModeChange.emit('schedule')">
          <i class="pi pi-calendar" aria-hidden="true"></i>
          {{ isAr() ? 'جدولة' : 'Schedule' }}
        </button>
      </div>

      <!-- Generate Now -->
      @if (deliveryMode === 'now') {
        <div class="rb-generate-panel">
          <div class="rb-gen-summary">
            <div class="gen-icon-wrap">
              <span class="gen-template-icon">{{ selectedTemplate!.icon }}</span>
            </div>
            <div>
              <div class="gen-title">{{ isAr() ? selectedTemplate!.titleAr : selectedTemplate!.titleEn }}</div>
              <div class="gen-meta">{{ selectedFormat?.toUpperCase() }} · {{ reportLanguage === 'ar' ? 'عربي' : 'English' }} · {{ dateFrom || 'All time' }}</div>
            </div>
          </div>

          @if (generating) {
            <div class="rb-progress">
              <div class="rb-progress-bar">
                <div class="rb-progress-fill" [style.width]="progress + '%'"></div>
              </div>
              <span class="rb-progress-label">{{ isAr() ? 'جاري الإنشاء...' : 'Generating...' }} {{ progress }}%</span>
            </div>
          }

          @if (generateError) {
            <div class="rb-error-banner">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              {{ generateError }}
            </div>
          }

          @if (generated) {
            <div class="rb-success-banner">
              <i class="pi pi-check-circle" aria-hidden="true"></i>
              {{ isAr() ? 'تم إنشاء التقرير وتنزيله بنجاح' : 'Report generated and downloaded successfully' }}
            </div>
          }

          <div class="rb-gen-actions">
            <button class="rb-btn rb-btn-primary rb-btn-lg"
              [disabled]="generating"
              (click)="generate.emit()">
              @if (generating) {
                <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
              } @else {
                <i class="pi pi-file-export" aria-hidden="true"></i>
              }
              {{ generating ? (isAr() ? 'جاري الإنشاء...' : 'Generating...') : (isAr() ? 'إنشاء وتنزيل' : 'Generate & Download') }}
            </button>
            @if (generated) {
              <button class="rb-btn rb-btn-ghost" (click)="resetRequested.emit()">
                <i class="pi pi-refresh" aria-hidden="true"></i>
                {{ isAr() ? 'تقرير جديد' : 'New Report' }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Schedule -->
      @if (deliveryMode === 'schedule') {
        <div class="rb-schedule-panel">
          <div class="rb-form-grid">
            <div class="rb-field-group">
              <label class="rb-label">{{ isAr() ? 'التكرار' : 'Frequency' }}</label>
              <div class="rb-freq-grid">
                @for (f of frequencies; track f.value) {
                  <div class="rb-freq-card"
                    [class.selected]="schedule.frequency === f.value"
                    (click)="schedule.frequency = f.value"
                    role="button" tabindex="0">
                    <i class="pi" [ngClass]="f.icon" aria-hidden="true"></i>
                    <span class="freq-label">{{ isAr() ? f.labelAr : f.labelEn }}</span>
                    <span class="freq-desc">{{ isAr() ? f.descAr : f.descEn }}</span>
                  </div>
                }
              </div>
            </div>

            @if (schedule.frequency === 'weekly') {
              <div class="rb-field-group">
                <label class="rb-label">{{ isAr() ? 'يوم الأسبوع' : 'Day of Week' }}</label>
                <select [(ngModel)]="schedule.weekDay" class="rb-select">
                  <option value="1">{{ isAr() ? 'الاثنين' : 'Monday' }}</option>
                  <option value="2">{{ isAr() ? 'الثلاثاء' : 'Tuesday' }}</option>
                  <option value="3">{{ isAr() ? 'الأربعاء' : 'Wednesday' }}</option>
                  <option value="4">{{ isAr() ? 'الخميس' : 'Thursday' }}</option>
                  <option value="5">{{ isAr() ? 'الجمعة' : 'Friday' }}</option>
                  <option value="0">{{ isAr() ? 'الأحد' : 'Sunday' }}</option>
                </select>
              </div>
            }

            @if (schedule.frequency === 'monthly') {
              <div class="rb-field-group">
                <label class="rb-label">{{ isAr() ? 'يوم الشهر' : 'Day of Month' }}</label>
                <select [(ngModel)]="schedule.monthDay" class="rb-select">
                  @for (d of monthDays; track d) {
                    <option [value]="d">{{ d }}</option>
                  }
                </select>
              </div>
            }

            <div class="rb-field-group rb-field-full">
              <label class="rb-label">{{ isAr() ? 'المستلمون (بريد إلكتروني)' : 'Recipients (emails)' }}</label>
              <input type="text" [(ngModel)]="schedule.recipients"
                [placeholder]="isAr() ? 'user@company.com, manager@company.com' : 'user@company.com, manager@company.com'"
                [attr.aria-label]="isAr() ? 'user@company.com, manager@company.com' : 'user@company.com, manager@company.com'"
                class="rb-input" />
              <span class="rb-hint">{{ isAr() ? 'افصل بين العناوين بفاصلة' : 'Separate multiple emails with commas' }}</span>
            </div>

            <div class="rb-field-group rb-field-full">
              <label class="rb-label">{{ isAr() ? 'تعبير Cron (تلقائي)' : 'Cron Expression (auto)' }}</label>
              <div class="rb-cron-preview">
                <code>{{ cronPreview }}</code>
                <span class="rb-cron-desc">{{ cronDescription }}</span>
              </div>
            </div>
          </div>

          @if (scheduleError) {
            <div class="rb-error-banner">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              {{ scheduleError }}
            </div>
          }

          @if (scheduled) {
            <div class="rb-success-banner">
              <i class="pi pi-check-circle" aria-hidden="true"></i>
              {{ isAr() ? 'تم إنشاء الجدول بنجاح' : 'Schedule created successfully' }}
            </div>
          }

          <div class="rb-gen-actions">
            <button class="rb-btn rb-btn-primary rb-btn-lg"
              [disabled]="scheduling || !schedule.frequency || schedule.frequency === 'once'"
              (click)="createSchedule.emit()">
              @if (scheduling) {
                <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
              } @else {
                <i class="pi pi-calendar-plus" aria-hidden="true"></i>
              }
              {{ scheduling ? (isAr() ? 'جاري الحفظ...' : 'Saving...') : (isAr() ? 'حفظ الجدول' : 'Save Schedule') }}
            </button>
            <button class="rb-btn rb-btn-ghost" [routerLink]="['/reports/scheduled']">
              {{ isAr() ? 'عرض الجداول' : 'View Schedules' }}
            </button>
          </div>
        </div>
      }

      <div class="rb-step-nav">
        <button class="rb-btn rb-btn-ghost" (click)="back.emit()">
          <i class="pi pi-arrow-left" aria-hidden="true"></i> {{ isAr() ? 'السابق' : 'Back' }}
        </button>
      </div>
    </div>
  `,
    styles: [`
    .rb-section {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .rb-section-header { display: flex; align-items: center; justify-content: space-between; }
    .rb-section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading);
    }
    .rb-section-title .pi { color: var(--primary-600, #2563eb); }

    /* -- Delivery tabs -- */
    .rb-delivery-tabs {
      display: flex; gap: 4px;
      background: var(--surface-ground, var(--surface-ice));
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 4px;
      width: fit-content;
    }

    .rb-dtab {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 18px; border-radius: var(--radius);
      border: none; background: transparent;
      font-size: var(--font-size-sm); font-weight: 500;
      color: var(--text-muted); cursor: pointer; transition: all 0.15s;
    }
    .rb-dtab .pi { font-size: var(--font-size-sm); }
    .rb-dtab.active {
      background: var(--surface-card, #fff);
      color: var(--primary-700, #1d4ed8);
      font-weight: 700;
      box-shadow: 0 1px 4px rgba(var(--color-black-rgb), .08);
    }

    /* -- Generate panel -- */
    .rb-generate-panel { display: flex; flex-direction: column; gap: 20px; }

    .rb-gen-summary {
      display: flex; align-items: center; gap: 16px;
      padding: 16px 20px;
      background: var(--surface-ground, var(--surface-ice));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }
    .gen-icon-wrap { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
    .gen-template-icon { font-size: var(--font-size-4xl); }
    .gen-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); }
    .gen-meta { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 2px; }

    .rb-progress { display: flex; flex-direction: column; gap: 8px; }
    .rb-progress-bar {
      height: 6px; border-radius: var(--radius-xs);
      background: var(--surface-200, var(--border-subtle)); overflow: hidden;
    }
    .rb-progress-fill {
      height: 100%; background: var(--primary-600, #2563eb);
      border-radius: var(--radius-xs); transition: width 0.3s ease;
    }
    .rb-progress-label { font-size: var(--font-size-sm); color: var(--text-muted); }

    /* -- Alerts -- */
    .rb-error-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: var(--radius);
      background: var(--status-danger-bg, #fff1f1);
      border: 1px solid #fca5a5; color: #991b1b; font-size: var(--font-size-sm);
    }
    .rb-error-banner .pi { font-size: var(--font-size-md); }

    .rb-success-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: var(--radius);
      background: var(--status-success-bg, #defbe6);
      border: 1px solid #86efac; color: #166534; font-size: var(--font-size-sm);
    }
    .rb-success-banner .pi { font-size: var(--font-size-md); }

    /* -- Schedule panel -- */
    .rb-schedule-panel { display: flex; flex-direction: column; gap: 20px; }

    .rb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .rb-field-group { display: flex; flex-direction: column; gap: 6px; }
    .rb-field-full { grid-column: 1 / -1; }
    .rb-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .rb-hint { font-size: var(--font-size-xs); color: var(--text-muted); }

    .rb-input, .rb-select {
      padding: 8px 12px; border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      font-size: var(--font-size-sm);
      background: var(--surface-ground, #fff); color: var(--text-body, #374151); width: 100%;
    }
    .rb-input:focus, .rb-select:focus { outline: none; border-color: var(--primary-400, #60a5fa); box-shadow: var(--shadow-glow); }

    /* -- Frequency cards -- */
    .rb-freq-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px; grid-column: 1 / -1;
    }
    .rb-freq-card {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px 12px; border-radius: var(--radius-md);
      border: 2px solid var(--border-subtle); cursor: pointer; transition: all 0.15s;
    }
    .rb-freq-card .pi { font-size: var(--font-size-md); color: var(--text-muted); }
    .rb-freq-card:hover { border-color: var(--primary-300, #93c5fd); }
    .rb-freq-card.selected {
      border-color: var(--primary-600, #2563eb);
      background: var(--primary-50, #eff6ff);
    }
    .rb-freq-card.selected .pi { color: var(--primary-600, #2563eb); }
    .freq-label { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); }
    .freq-desc { font-size: var(--font-size-xs); color: var(--text-muted); }

    /* -- Cron preview -- */
    .rb-cron-preview {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      background: var(--surface-ground, var(--surface-ice));
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
    }
    code { font-family: monospace; font-size: var(--font-size-sm); color: var(--primary-700, #1d4ed8); }
    .rb-cron-desc { font-size: var(--font-size-sm); color: var(--text-muted); }

    /* -- Buttons -- */
    .rb-gen-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .rb-step-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 8px; border-top: 1px solid var(--border-subtle);
    }

    .rb-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px; border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .rb-btn:disabled { opacity: .45; cursor: not-allowed; }
    .rb-btn[routerLink] { text-decoration: none; }

    .rb-btn-primary {
      background: var(--primary-600, #2563eb); color: #fff;
      border-color: var(--primary-600, #2563eb);
    }
    .rb-btn-primary:hover:not(:disabled) { background: var(--primary-700, #1d4ed8); }

    .rb-btn-ghost {
      background: var(--surface-card, #fff); color: var(--text-body, #374151);
    }
    .rb-btn-ghost:hover { background: var(--surface-100, var(--surface-ice)); }

    .rb-btn-lg { padding: 10px 24px; font-size: var(--font-size-base); }

    [dir="rtl"] .rb-btn .pi-arrow-right { transform: scaleX(-1); }
    [dir="rtl"] .rb-btn .pi-arrow-left  { transform: scaleX(-1); }
  `]
})
export class ReportBuilderGenerateDeliverComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) selectedTemplate!: ReportTemplate;
  @Input() selectedFormat: string | null = null;
  @Input() reportLanguage = 'en';
  @Input() dateFrom = '';
  @Input() deliveryMode: 'now' | 'schedule' = 'now';

  // Generate state
  @Input() generating = false;
  @Input() generated = false;
  @Input() generateError = '';
  @Input() progress = 0;

  // Schedule state
  @Input() scheduling = false;
  @Input() scheduled = false;
  @Input() scheduleError = '';
  @Input() cronPreview = '';
  @Input() cronDescription = '';

  @Input({ required: true }) schedule!: ScheduleConfig;

  @Output() generate = new EventEmitter<void>();
  @Output() createSchedule = new EventEmitter<void>();
  @Output() resetRequested = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() deliveryModeChange = new EventEmitter<'now' | 'schedule'>();

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  readonly monthDays = Array.from({ length: 28 }, (_, i) => i + 1);

  readonly frequencies = [
    { value: 'daily'     as Frequency, icon: 'pi-sun',            labelEn: 'Daily',     labelAr: 'يومياً',    descEn: 'Every day at 6am',  descAr: 'كل يوم ٦ص' },
    { value: 'weekly'    as Frequency, icon: 'pi-calendar-minus', labelEn: 'Weekly',    labelAr: 'أسبوعياً',  descEn: 'Once a week',        descAr: 'مرة أسبوعياً' },
    { value: 'monthly'   as Frequency, icon: 'pi-calendar',       labelEn: 'Monthly',   labelAr: 'شهرياً',    descEn: 'First of the month', descAr: 'أول الشهر' },
    { value: 'quarterly' as Frequency, icon: 'pi-chart-bar',      labelEn: 'Quarterly', labelAr: 'ربع سنوي', descEn: 'Every 3 months',     descAr: 'كل ٣ أشهر' },
  ];
}
