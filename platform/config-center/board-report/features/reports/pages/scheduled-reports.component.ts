import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WidgetShellComponent } from '@app/dashboard';
import { REPORT_TEMPLATES } from '../services/reports-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { GrcOperationsService } from '@app/api';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const FREQ_TO_CRON: Record<Frequency, string> = {
  daily:     '0 6 * * *',
  weekly:    '0 6 * * 1',
  monthly:   '0 6 1 * *',
  quarterly: '0 6 1 1,4,7,10 *',
};

const FREQ_LABELS: Record<Frequency, { en: string; ar: string }> = {
  daily:     { en: 'Daily',     ar: 'يومياً' },
  weekly:    { en: 'Weekly',    ar: 'أسبوعياً' },
  monthly:   { en: 'Monthly',   ar: 'شهرياً' },
  quarterly: { en: 'Quarterly', ar: 'ربع سنوي' },
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-scheduled-reports',
    imports: [CommonModule, FormsModule, RouterModule, WidgetShellComponent, PageHeaderComponent],
    template: `
    <div class="sr-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Scheduled Reports"
        titleAr="التقارير المجدولة"
        subtitleEn="Automate report delivery on a recurring schedule"
        subtitleAr="أتمتة توزيع التقارير على جدول متكرر"
        icon="calendar"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','المجدولة'] : ['Dashboard','Reports','Scheduled']"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        [actions]="[{id:'new-builder', labelEn:'New Schedule', labelAr:'جدول جديد', icon:'plus', primary:true}]"
        (actionClick)="onAction($event)" />

      <div class="sr-body">

        <!-- ══ Schedule Table ══ -->
        <app-widget-shell
          [title]="i18n.isAr() ? 'الجداول النشطة' : 'Active Schedules'"
          [state]="state()"
          [canRefresh]="true"
          (refresh)="load()">

          @if (schedules()?.length) {
            <table aria-label="Sched Table table" class="sched-table">
              <thead>
                <tr>
                  <th>{{ i18n.isAr() ? 'التقرير' : 'Report' }}</th>
                  <th>{{ i18n.isAr() ? 'التكرار' : 'Frequency' }}</th>
                  <th>{{ i18n.isAr() ? 'التنسيق' : 'Format' }}</th>
                  <th>{{ i18n.isAr() ? 'المستلمون' : 'Recipients' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                  <th>{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (s of schedules(); track s.id || $index) {
                  <tr>
                    <td class="sched-name">{{ s.reportName || s.reportType || s.report_type || '--' }}</td>
                    <td>
                      <span class="freq-badge">{{ friendlyFreq(s.cronExpression || s.cron_expression) }}</span>
                    </td>
                    <td>
                      <span class="fmt-chip" [class]="'fmt-' + (s.format || 'pdf')">
                        {{ (s.format || 'pdf').toUpperCase() }}
                      </span>
                    </td>
                    <td>{{ s.recipients || '--' }}</td>
                    <td>
                      <span class="status-badge" [class.active]="s.active !== false">
                        {{ s.active !== false
                          ? (i18n.isAr() ? 'نشط' : 'Active')
                          : (i18n.isAr() ? 'متوقف' : 'Paused') }}
                      </span>
                    </td>
                    <td class="actions-cell">
                      <button class="icon-btn" (click)="toggleActive(s)" [title]="i18n.isAr() ? 'تبديل الحالة' : 'Toggle'">
                        <i class="pi" [ngClass]="s.active !== false ? 'pi-pause' : 'pi-play'" aria-hidden="true"></i>
                      </button>
                      <button aria-label="Delete" class="icon-btn icon-btn-danger" (click)="deleteSchedule(s)" [title]="i18n.isAr() ? 'حذف' : 'Delete'">
                        <i class="pi pi-trash" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </app-widget-shell>

        <!-- ══ Create New Schedule ══ -->
        <div class="create-card">
          <div class="create-header">
            <h3>{{ i18n.isAr() ? 'إنشاء جدول جديد' : 'Create New Schedule' }}</h3>
            <a class="link-builder" [routerLink]="['/reports/builder']">
              <i class="pi pi-external-link" aria-hidden="true"></i>
              {{ i18n.isAr() ? 'استخدم المنشئ المتقدم' : 'Use Advanced Builder' }}
            </a>
          </div>

          <div class="create-form">

            <!-- Report type -->
            <div class="cf-field">
              <label class="cf-label">{{ i18n.isAr() ? 'نوع التقرير' : 'Report Type' }}</label>
              <select [(ngModel)]="newReportType" class="cf-ctrl">
                <option value="">{{ i18n.isAr() ? 'اختر نوع التقرير' : 'Select report type' }}</option>
                @for (t of templates; track t.id) {
                  <option [value]="t.key">{{ i18n.isAr() ? t.titleAr : t.titleEn }}</option>
                }
              </select>
            </div>

            <!-- Frequency -->
            <div class="cf-field">
              <label class="cf-label">{{ i18n.isAr() ? 'التكرار' : 'Frequency' }}</label>
              <div class="freq-pills">
                @for (f of freqOptions; track f.value) {
                  <button
                    class="freq-pill"
                    [class.selected]="newFrequency === f.value"
                    (click)="newFrequency = f.value">
                    {{ i18n.isAr() ? f.labelAr : f.labelEn }}
                  </button>
                }
              </div>
            </div>

            <!-- Format -->
            <div class="cf-field">
              <label class="cf-label">{{ i18n.isAr() ? 'التنسيق' : 'Format' }}</label>
              <div class="freq-pills">
                @for (fmt of ['pdf','excel','html']; track fmt) {
                  <button
                    class="freq-pill"
                    [class.selected]="newFormat === fmt"
                    (click)="newFormat = fmt">
                    {{ fmt.toUpperCase() }}
                  </button>
                }
              </div>
            </div>

            <!-- Recipients -->
            <div class="cf-field cf-field-wide">
              <label class="cf-label">{{ i18n.isAr() ? 'المستلمون (بريد إلكتروني)' : 'Recipients (email)' }}</label>
              <input
                [(ngModel)]="newRecipients"
                [placeholder]="i18n.isAr() ? 'user@company.com, ...' : 'user@company.com, ...'" [attr.aria-label]="i18n.isAr() ? 'user@company.com, ...' : 'user@company.com, ...'"
                class="cf-ctrl" />
            </div>

            <!-- Cron preview -->
            <div class="cf-field cf-field-wide">
              <label class="cf-label">{{ i18n.isAr() ? 'تعبير Cron (تلقائي)' : 'Cron Expression (auto)' }}</label>
              <div class="cron-preview">
                <code>{{ cronPreview() }}</code>
              </div>
            </div>

          </div>

          @if (createError()) {
            <div class="sr-error">
              <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
              {{ createError() }}
            </div>
          }

          @if (createSuccess()) {
            <div class="sr-success">
              <i class="pi pi-check-circle" aria-hidden="true"></i>
              {{ i18n.isAr() ? 'تم إنشاء الجدول بنجاح' : 'Schedule created successfully' }}
            </div>
          }

          <div class="create-footer">
            <button class="cf-btn"
              [disabled]="!newReportType || !newFrequency || creating()"
              (click)="create()">
              @if (creating()) {
                <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
              } @else {
                <i class="pi pi-calendar-plus" aria-hidden="true"></i>
              }
              {{ creating() ? (i18n.isAr() ? 'جاري الإنشاء...' : 'Creating...') : (i18n.isAr() ? 'إنشاء الجدول' : 'Create Schedule') }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
    styles: [`
    .sr-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .sr-body { flex: 1; padding: 20px 28px 40px; display: flex; flex-direction: column; gap: 20px; }

    /* ── Table ── */
    .sched-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .sched-table th {
      text-align: start; padding: 10px 12px; font-weight: 600;
      color: var(--text-muted, var(--text-muted)); border-bottom: 2px solid var(--surface-border, var(--border-subtle));
    }
    .sched-table td { padding: 10px 12px; border-bottom: 1px solid var(--surface-border, var(--surface-ice)); }
    .sched-name { font-weight: 600; color: var(--text-heading, var(--text-heading)); }

    .freq-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: var(--radius-xl);
      font-size: var(--font-size-xs);
      font-weight: 700;
      background: #dbeafe;
      color: #1e40af;
    }

    .fmt-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 700;
      letter-spacing: .5px;
      &.fmt-pdf   { background: #fee2e2; color: #991b1b; }
      &.fmt-excel { background: #d1fae5; color: #065f46; }
      &.fmt-html  { background: var(--purple-50, #f5f3ff); color: #6d28d9; }
    }

    .status-badge {
      display: inline-block; padding: 2px 10px; border-radius: var(--radius-md);
      font-size: var(--font-size-xs); font-weight: 600; background: var(--status-danger-bg, #fff1f1); color: #991b1b;
      &.active { background: var(--status-success-bg, #defbe6); color: #166534; }
    }

    .actions-cell { display: flex; gap: 4px; }
    .icon-btn {
      padding: 5px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle, var(--border-subtle));
      background: transparent; cursor: pointer; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted));
      transition: all .15s;
      &:hover { background: var(--surface-100, var(--surface-ice)); }
    }
    .icon-btn-danger:hover { background: var(--status-danger-bg, #fff1f1); border-color: #fca5a5; color: #991b1b; }

    /* ── Create Card ── */
    .create-card {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .create-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    }
    .link-builder {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--primary-600, #2563eb);
      text-decoration: none;
      .pi { font-size: var(--font-size-xs); }
      &:hover { text-decoration: underline; }
    }

    .create-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .cf-field { display: flex; flex-direction: column; gap: 6px; }
    .cf-field-wide { grid-column: 1 / -1; }
    .cf-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, var(--text-heading)); }
    .cf-ctrl {
      padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--border-subtle, var(--border-subtle));
      font-size: var(--font-size-sm); background: var(--surface-ground, #fff); color: var(--text-body, #374151); width: 100%;
      &:focus { outline: none; border-color: var(--primary-400, #60a5fa); box-shadow: var(--shadow-glow); }
    }

    .freq-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .freq-pill {
      padding: 6px 14px; border-radius: var(--radius-xl); border: 1.5px solid var(--border-subtle, var(--border-subtle));
      background: var(--surface-ground, var(--surface-ice)); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; transition: all .15s;
      color: var(--text-muted, var(--text-muted));
      &:hover { border-color: var(--primary-300, #93c5fd); }
      &.selected { border-color: var(--primary-600, #2563eb); background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8); }
    }

    .cron-preview {
      padding: 8px 14px; border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      code { font-family: monospace; font-size: var(--font-size-sm); color: var(--primary-700, #1d4ed8); }
    }

    .create-footer { display: flex; justify-content: flex-end; }
    .cf-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 20px; border-radius: var(--radius); border: none;
      background: var(--primary-600, #2563eb); color: #fff;
      font-size: var(--font-size-sm); font-weight: 700; cursor: pointer; transition: all .15s;
      .pi { font-size: var(--font-size-sm); }
      &:hover:not(:disabled) { background: var(--primary-700, #1d4ed8); }
      &:disabled { opacity: .4; cursor: not-allowed; }
    }

    .sr-error {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: var(--radius); background: var(--status-danger-bg, #fff1f1); border: 1px solid #fca5a5; color: #991b1b; font-size: var(--font-size-sm);
      .pi { font-size: var(--font-size-base); }
    }
    .sr-success {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: var(--radius); background: var(--status-success-bg, #defbe6); border: 1px solid #86efac; color: #166534; font-size: var(--font-size-sm);
      .pi { font-size: var(--font-size-base); }
    }

    @media (max-width: 768px) {
      .sr-body { padding: 16px 16px 32px; }
      .create-form { grid-template-columns: 1fr; }
      .cf-field-wide { grid-column: 1; }
    }
  `]
})
export class ScheduledReportsComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  templates = REPORT_TEMPLATES;

  readonly freqOptions: { value: Frequency; labelEn: string; labelAr: string }[] = [
    { value: 'daily',     labelEn: 'Daily',     labelAr: 'يومياً' },
    { value: 'weekly',    labelEn: 'Weekly',    labelAr: 'أسبوعياً' },
    { value: 'monthly',   labelEn: 'Monthly',   labelAr: 'شهرياً' },
    { value: 'quarterly', labelEn: 'Quarterly', labelAr: 'ربع سنوي' },
  ];

  schedules    = signal<Record<string, unknown>[]>([]);
  state        = signal<LoadState>('loading');
  creating     = signal(false);
  createError  = signal('');
  createSuccess= signal(false);

  newReportType = '';
  newFrequency: Frequency = 'monthly';
  newFormat    = 'pdf';
  newRecipients= '';

  cronPreview = computed(() => FREQ_TO_CRON[this.newFrequency] || '');

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const data = await firstValueFrom(this.operationsSvc.getReportCenterSchedules());
      const items = Array.isArray(data) ? data : ((data as any)?.schedules ?? []);
      this.schedules.set(items);
      this.state.set(items.length ? 'ready' : 'empty');
    } catch {
      this.state.set('error');
    }
  }

  async create(): Promise<void> {
    if (!this.newReportType || !this.newFrequency) return;
    this.creating.set(true);
    this.createError.set('');
    this.createSuccess.set(false);
    try {
      await firstValueFrom(this.operationsSvc.createReportSchedule({
        reportType:     this.newReportType,
        cronExpression: FREQ_TO_CRON[this.newFrequency],
        recipients:     this.newRecipients,
        format:         this.newFormat,
      } as any));
      this.newReportType = ''; this.newFrequency = 'monthly'; this.newRecipients = '';
      this.createSuccess.set(true);
      await this.load();
    } catch {
      this.createError.set(this.i18n.isAr() ? 'فشل إنشاء الجدول' : 'Failed to create schedule');
    } finally {
      this.creating.set(false);
    }
  }

  toggleActive(s: Record<string, unknown>): void {
    s.active = s.active === false ? true : false;
  }

  deleteSchedule(s: Record<string, unknown>): void {
    this.schedules.update(list => list.filter(x => x !== s));
  }

  onAction(id: string): void {
    if (id === 'new-builder') {
      document.querySelector('.create-card')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  friendlyFreq(cron: unknown): string {
    if (!cron) return '—';
    const isAr = this.i18n.isAr();
    const cronStr = String(cron);
    for (const [freq, expr] of Object.entries(FREQ_TO_CRON)) {
      if (cronStr.trim() === expr) return FREQ_LABELS[freq as Frequency]?.[isAr ? 'ar' : 'en'] ?? freq;
    }
    return cronStr;
  }
}
