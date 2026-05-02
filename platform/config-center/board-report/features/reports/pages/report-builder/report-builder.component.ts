import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-report-builder',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, ButtonModule, DropdownModule, InputTextModule, ToolbarModule, TagModule, ToastModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="file-text" [title]="i18n.translate('grcOs.reportBuilder')"
      [subtitle]="i18n.translate('reportBuilder.subtitle')"
      [breadcrumbs]="['Dashboard', 'Report Builder']" [loading]="loading">
      <p-toast />
      <div class="grid">
        <div class="col-8">
          <p-card [header]="i18n.translate('reportBuilder.generateReport')">
            <div class="flex flex-column gap-3">
              <p-dropdown [options]="templateOptions" [(ngModel)]="selectedTemplate" [placeholder]="i18n.translate('reportBuilder.selectTemplate')" styleClass="w-full" />
              <p-dropdown [options]="formatOptions" [(ngModel)]="selectedFormat" [placeholder]="i18n.translate('reportBuilder.format')" styleClass="w-full" />
              <p-dropdown [options]="languageOptions" [(ngModel)]="selectedLanguage" [placeholder]="i18n.translate('common.language')" styleClass="w-full" />
              <div class="flex gap-2">
                <input pInputText [(ngModel)]="dateFrom" [placeholder]="i18n.translate('reportBuilder.dateFrom')" [attr.aria-label]="i18n.translate('reportBuilder.dateFrom')" />
                <input pInputText [(ngModel)]="dateTo" [placeholder]="i18n.translate('reportBuilder.dateTo')" [attr.aria-label]="i18n.translate('reportBuilder.dateTo')" />
              </div>
              <div class="flex gap-2">
                <p-button [label]="i18n.translate('reportBuilder.generate')" icon="pi pi-file" (onClick)="generateReport()" [loading]="generating" />
                <p-button [label]="i18n.translate('reportBuilder.schedule')" icon="pi pi-clock" severity="secondary" (onClick)="showScheduleConfig = !showScheduleConfig" />
                <p-button [label]="i18n.translate('reportBuilder.evidencePack')" icon="pi pi-download" severity="info" (onClick)="exportEvidencePack()" [loading]="exporting" />
                <p-button [label]="i18n.translate('reportBuilder.boardView')" icon="pi pi-chart-bar" severity="help" (onClick)="boardView()" />
              </div>
            </div>
          </p-card>

          <!-- Generated Report Result -->
          @if (generatedReport) {
            <p-card [header]="i18n.translate('reportBuilder.generatedReport')" styleClass="mt-3">
              <div class="flex flex-column gap-2">
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-check-circle text-green-500"></i>
                  <strong>{{ generatedReport.title }}</strong>
                </div>
                <div class="text-sm text-color-secondary">
                  {{ i18n.translate('reportBuilder.reportId') }}: {{ generatedReport.reportId }}
                </div>
                <div class="text-sm text-color-secondary">
                  {{ i18n.translate('reportBuilder.generatedAt') }}: {{ generatedReport.generatedAt | appDate:'medium' }}
                </div>
                <a class="p-button p-button-outlined p-button-sm cursor-pointer inline-flex align-items-center gap-1 no-underline"
                   [href]="getDownloadLink(generatedReport.reportId)" target="_blank">
                  <i class="pi pi-download"></i>
                  {{ i18n.translate('reportBuilder.downloadReport') }}
                </a>
              </div>
            </p-card>
          }

          <!-- Schedule Configuration -->
          @if (showScheduleConfig) {
            <p-card [header]="i18n.translate('reportBuilder.scheduleConfig')" styleClass="mt-3">
              <div class="flex flex-column gap-3">
                <p-dropdown [options]="recurrenceOptions" [(ngModel)]="scheduleRecurrence" [placeholder]="i18n.translate('reportBuilder.recurrencePattern')" styleClass="w-full" />
                <input pInputText [(ngModel)]="scheduleRecipients" [placeholder]="i18n.translate('reportBuilder.recipients')" [attr.aria-label]="i18n.translate('reportBuilder.recipients')" />
                <div class="flex gap-2">
                  <p-button [label]="i18n.translate('reportBuilder.createSchedule')" icon="pi pi-clock" (onClick)="scheduleReport()" [loading]="scheduling" />
                  <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" severity="secondary" (onClick)="showScheduleConfig = false" />
                </div>
              </div>
            </p-card>
          }

          <!-- Evidence Pack Result -->
          @if (evidencePack) {
            <p-card [header]="i18n.translate('reportBuilder.evidencePackResult')" styleClass="mt-3">
              <div class="flex flex-column gap-2">
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-check-circle text-green-500"></i>
                  <strong>{{ i18n.translate('reportBuilder.frameworkLabel') }}: {{ evidencePack.frameworkId }}</strong>
                </div>
                <div class="text-sm text-color-secondary">
                  {{ i18n.translate('reportBuilder.totalItems') }}: {{ evidencePack.totalItems }}
                </div>
                <div class="text-sm text-color-secondary">
                  {{ i18n.translate('reportBuilder.period') }}: {{ evidencePack.periodStart | appDate:'short' }} — {{ evidencePack.periodEnd | appDate:'short' }}
                </div>
              </div>
            </p-card>
          }
        </div>
        <div class="col-4">
          <p-card [header]="i18n.translate('reportBuilder.availableTemplates')">
            @for (tpl of templates; track tpl.template_id) {
              <div tabindex="0" role="button" (keyup.enter)="selectTemplate(tpl)" class="mb-2 p-2 surface-ground border-round cursor-pointer"
                   [class.border-primary]="selectedTemplate === tpl.template_id"
                   (click)="selectTemplate(tpl)">
                <strong>{{ tpl.name }}</strong>
                <div class="text-sm text-color-secondary">{{ tpl.description }}</div>
                @if (tpl.formats) {
                  <div class="flex gap-1 mt-1">
                    @for (fmt of tpl.formats; track fmt) {
                      <p-tag [value]="fmt" severity="info" />
                    }
                  </div>
                }
              </div>
            }
          </p-card>
          <p-card [header]="i18n.translate('grcOs.maturityScorecard')" styleClass="mt-3">
            <p-button [label]="i18n.translate('reportBuilder.viewScorecard')" icon="pi pi-chart-line" styleClass="w-full" (onClick)="viewScorecard()" />
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class ReportBuilderComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  generating = false;
  scheduling = false;
  exporting = false;
  showScheduleConfig = false;

  templates: GrcRecord[] = [];
  templateOptions: GrcRecord[] = [];
  formatOptions = [{ label: 'PDF', value: 'pdf' }, { label: 'Excel', value: 'excel' }, { label: 'JSON', value: 'json' }];
  languageOptions = [{ label: 'English', value: 'en' }, { label: 'Arabic', value: 'ar' }];
  recurrenceOptions = [
    { label: 'Daily', value: '0 0 * * *' },
    { label: 'Weekly', value: '0 0 * * 1' },
    { label: 'Monthly', value: '0 0 1 * *' }
  ];

  selectedTemplate = '';
  selectedFormat = 'pdf';
  selectedLanguage = 'en';
  dateFrom = '';
  dateTo = '';

  scheduleRecurrence = '';
  scheduleRecipients = '';

  generatedReport: GrcRecord | null = null;
  evidencePack: GrcRecord | null = null;

  constructor(public i18n: I18nService, private msg: MessageService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/report-ext/templates').subscribe({
      next: (data) => {
        this.templates = data.templates || data || [];
        this.templateOptions = this.templates.map((t) => ({ label: t.name || t.nameEn, value: t.template_id || t.templateId }));
        this.loading = false; this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false; this.cdr.markForCheck();
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.failedToLoadReportTemplates'), life: 4000 });
      }
    });
  }

  selectTemplate(tpl: GrcRecord) {
    this.selectedTemplate = tpl.template_id || tpl.templateId;
  }

  getDownloadLink(reportId: string): string {
    return `/api/reports/download/${reportId}`;
  }

  generateReport() {
    if (!this.selectedTemplate) {
      this.msg.add({ severity: 'warning', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseSelectReportTemplate'), life: 3000 });
      return;
    }
    this.generating = true;
    this.apiclientSvc.post('/report-ext/generate', {
      templateId: this.selectedTemplate,
      format: this.selectedFormat,
      language: this.selectedLanguage,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo
    }).subscribe({
      next: (report) => {
        this.generating = false;
        this.generatedReport = report;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.reportGeneratedSuccessfully', { title: report.title }), life: 4000 });
      },
      error: (err) => {
        this.generating = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.failedToGenerateReport'), life: 4000 });
      }
    });
  }

  scheduleReport() {
    if (!this.selectedTemplate) {
      this.msg.add({ severity: 'warning', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseSelectReportTemplate'), life: 3000 });
      return;
    }
    if (!this.scheduleRecurrence) {
      this.msg.add({ severity: 'warning', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseSelectRecurrencePattern'), life: 3000 });
      return;
    }
    if (!this.scheduleRecipients.trim()) {
      this.msg.add({ severity: 'warning', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseEnterRecipient'), life: 3000 });
      return;
    }
    this.scheduling = true;
    const recipients = this.scheduleRecipients.split(',').map(r => r.trim()).filter(Boolean);
    this.apiclientSvc.post('/report-ext/schedule', {
      templateId: this.selectedTemplate,
      format: this.selectedFormat,
      language: this.selectedLanguage,
      cronExpression: this.scheduleRecurrence,
      recipients
    }).subscribe({
      next: (schedule) => {
        this.scheduling = false;
        this.showScheduleConfig = false;
        this.scheduleRecurrence = '';
        this.scheduleRecipients = '';
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.reportScheduleCreated', { id: schedule.scheduleId }), life: 4000 });
      },
      error: (err) => {
        this.scheduling = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.failedToScheduleReport'), life: 4000 });
      }
    });
  }

  exportEvidencePack() {
    this.exporting = true;
    this.apiclientSvc.post('/report-ext/evidence-pack-export', {
      language: this.selectedLanguage,
      frameworkId: this.selectedTemplate || 'default'
    }).subscribe({
      next: (pack) => {
        this.exporting = false;
        this.evidencePack = pack;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.evidencePackExported', { count: String(pack.totalItems) }), life: 4000 });
      },
      error: (err) => {
        this.exporting = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.failedToExportEvidencePack'), life: 4000 });
      }
    });
  }

  boardView() {
    this.apiclientSvc.get('/report-ext/board-view').subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.boardViewLoaded'), life: 3000 });
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.failedToLoadBoardView'), life: 4000 });
      }
    });
  }

  viewScorecard() {
    this.apiclientSvc.get('/report-ext/maturity-scorecard').subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.maturityScorecardLoaded'), life: 3000 });
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.failedToLoadScorecard'), life: 4000 });
      }
    });
  }
}
