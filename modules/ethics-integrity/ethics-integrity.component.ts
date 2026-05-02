// API paths use /governance/ethics/* (backend mount: /api/governance/ethics). Sub-resources: code-of-conduct, disclosures, whistleblower-reports, conflict-of-interest.
import { Component, OnInit, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ethics-integrity',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    PageShellComponent, StatusBadgeComponent, ExportButtonComponent,
    TabViewModule, TableModule, CardModule, ButtonModule,
    DialogModule, InputTextModule, InputTextarea,
    DropdownModule, ToolbarModule, TooltipModule, ToastModule, TagModule, AppDatePipe,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="heart"
      [title]="isAr() ? 'الأخلاقيات والنزاهة' : 'Ethics & Integrity'"
      [subtitle]="isAr() ? 'إدارة قواعد السلوك والإفصاحات وتقارير المخالفات' : 'Code of conduct, disclosures, whistleblower reports and conflict of interest'"
      [breadcrumbs]="isAr() ? ['لوحة التحكم', 'الأخلاقيات والنزاهة'] : ['Dashboard', 'Ethics & Integrity']"
      [loading]="loading">

      <p-toast />

      <div *ngIf="!loading && loadError" class="error-state text-center p-4">
        <i class="pi pi-exclamation-triangle" style="font-size:2rem; color:var(--red-500)"></i>
        <p class="mt-2 mb-2">{{ i18n.translate('common.failedToLoad') }}</p>
        <p-button [label]="i18n.translate('common.retry')" icon="pi pi-refresh" (onClick)="load()" [text]="true" />
      </div>

      <div class="health-strip" *ngIf="!loadError">
        <div class="hs-card"><div class="hs-value">{{ dashboardCounts.total ?? codeOfConductItems.length + disclosures.length + whistleblowerReports.length + conflictOfInterest.length }}</div><div class="hs-label">{{ isAr() ? 'الإجمالي' : 'Total' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:var(--primary)">{{ dashboardCounts.open ?? 0 }}</div><div class="hs-label">{{ isAr() ? 'مفتوحة' : 'Open' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:var(--green-500)">{{ dashboardCounts.resolved ?? 0 }}</div><div class="hs-label">{{ isAr() ? 'مُحَلّة' : 'Resolved' }}</div></div>
        <div class="hs-card"><div class="hs-value">{{ codeOfConductItems.length }}</div><div class="hs-label">{{ isAr() ? 'قواعد السلوك' : 'Code of Conduct' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:#d97706">{{ disclosures.length }}</div><div class="hs-label">{{ isAr() ? 'الإفصاحات' : 'Disclosures' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:var(--error)">{{ whistleblowerReports.length }}</div><div class="hs-label">{{ isAr() ? 'تقارير المخالفات' : 'Whistleblower' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:#7c3aed">{{ conflictOfInterest.length }}</div><div class="hs-label">{{ isAr() ? 'تضارب المصالح' : 'Conflicts' }}</div></div>
      </div>

      <p-tabView *ngIf="!loadError">
        <p-tabPanel [header]="isAr() ? 'قواعد السلوك' : 'Code of Conduct'">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="start">
              <p-button [label]="isAr() ? 'إضافة قاعدة' : 'Add Code'" icon="pi pi-plus" (onClick)="openCreateCode()" />
            </ng-template>
            <ng-template pTemplate="end">
              <app-export-button module="ethics-code-of-conduct" [data]="codeOfConductItems" />
            </ng-template>
          </p-toolbar>
          <p-table aria-label="Code Of Conduct Items table" [value]="codeOfConductItems" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="codeOfConductItems.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'العنوان' : 'Title' }}</th>
                <th>{{ isAr() ? 'الإصدار' : 'Version' }}</th>
                <th>{{ isAr() ? 'تاريخ السريان' : 'Effective Date' }}</th>
                <th>{{ isAr() ? 'المالك' : 'Owner' }}</th>
                <th>{{ isAr() ? 'معدل الإقرار' : 'Acknowledgment Rate' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><strong>{{ isAr() ? (item.title_ar || item._parsed?.title_ar) || item.title : item.title }}</strong></td>
                <td>v{{ item.version || 1 }}</td>
                <td>{{ (item.effective_date || item._parsed?.effective_date) | appDate:'medium' }}</td>
                <td>{{ item.owner || item._parsed?.owner || '—' }}</td>
                <td>{{ item.ack_rate || 0 }}%</td>
                <td><app-status-badge [status]="item.status" /></td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="codeOfConductItems.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ isAr() ? 'لا توجد قواعد سلوك' : 'No code of conduct items' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="isAr() ? 'الإفصاحات' : 'Disclosures'">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="start">
              <p-button [label]="isAr() ? 'إضافة إفصاح' : 'Add Disclosure'" icon="pi pi-plus" (onClick)="openCreateDisclosure()" />
              <span class="ml-3" *ngIf="disclosures.length > 0">
                <label [attr.aria-label]="isAr() ? 'تصفية حسب الحالة' : 'Filter by status'" class="mr-2">{{ isAr() ? 'الحالة:' : 'Status:' }}</label>
                <p-dropdown [options]="statusFilterOptions" [(ngModel)]="disclosureStatusFilter" optionLabel="label" optionValue="value" [placeholder]="isAr() ? 'الكل' : 'All'" (onChange)="cdr.markForCheck()" [style]="{'min-width':'140px'}" />
              </span>
            </ng-template>
          </p-toolbar>
          <p-table aria-label="Disclosures table" [value]="disclosuresFiltered" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="disclosuresFiltered.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'النوع' : 'Type' }}</th>
                <th>{{ isAr() ? 'المُفصح' : 'Discloser' }}</th>
                <th>{{ isAr() ? 'التاريخ' : 'Date' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr() ? 'إجراء' : 'Action' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><p-tag [value]="item.report_type || item.disclosure_type || item.category" severity="info" /></td>
                <td>{{ item.title || item.discloser_name || '—' }}</td>
                <td>{{ (item.created_at || item.submitted_date) | appDate:'medium' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
                <td>
                  <p-dropdown [options]="statusOptions" [(ngModel)]="item.status" optionLabel="label" optionValue="value" [placeholder]="isAr() ? 'الحالة' : 'Status'" (onChange)="updateReportStatus(item, $event.value)" [style]="{'min-width':'120px'}" />
                </td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="disclosuresFiltered.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ isAr() ? 'لا توجد إفصاحات' : 'No disclosures' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="isAr() ? 'تقارير المخالفات' : 'Whistleblower Reports'">
          <p-toolbar styleClass="mb-3" *ngIf="whistleblowerReports.length > 0">
            <ng-template pTemplate="start">
              <label [attr.aria-label]="isAr() ? 'تصفية حسب الحالة' : 'Filter by status'" class="mr-2">{{ isAr() ? 'الحالة:' : 'Status:' }}</label>
              <p-dropdown [options]="statusFilterOptions" [(ngModel)]="whistleblowerStatusFilter" optionLabel="label" optionValue="value" [placeholder]="isAr() ? 'الكل' : 'All'" (onChange)="cdr.markForCheck()" [style]="{'min-width':'140px'}" />
            </ng-template>
          </p-toolbar>
          <p-table aria-label="Whistleblower Reports table" [value]="whistleblowerFiltered" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="whistleblowerFiltered.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'الرقم المرجعي' : 'Reference' }}</th>
                <th>{{ isAr() ? 'الفئة' : 'Category' }}</th>
                <th>{{ isAr() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ isAr() ? 'تاريخ البلاغ' : 'Report Date' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr() ? 'إجراء' : 'Action' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><code>{{ item.report_id || item.reference_id || item.id }}</code></td>
                <td>{{ item.category || '—' }}</td>
                <td><p-tag [value]="item.severity" [severity]="item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'info'" /></td>
                <td>{{ (item.created_at || item.report_date) | appDate:'medium' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
                <td>
                  <p-dropdown [options]="statusOptions" [(ngModel)]="item.status" optionLabel="label" optionValue="value" [placeholder]="isAr() ? 'الحالة' : 'Status'" (onChange)="updateReportStatus(item, $event.value)" [style]="{'min-width':'120px'}" />
                </td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="whistleblowerFiltered.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ isAr() ? 'لا توجد تقارير' : 'No reports' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="isAr() ? 'تضارب المصالح' : 'Conflict of Interest'">
          <p-table aria-label="Conflict Of Interest table" [value]="conflictOfInterest" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="conflictOfInterest.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'الموظف' : 'Employee' }}</th>
                <th>{{ isAr() ? 'النوع' : 'Type' }}</th>
                <th>{{ isAr() ? 'الوصف' : 'Description' }}</th>
                <th>{{ isAr() ? 'القرار' : 'Resolution' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.title || item.employee_name || '—' }}</td>
                <td><p-tag [value]="item.report_type || item.category || item.conflict_type" severity="warning" /></td>
                <td>{{ (item.description || '').toString().slice(0, 80) }}{{ (item.description || '').toString().length > 80 ? '...' : '' }}</td>
                <td>{{ item.resolution || '—' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="conflictOfInterest.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ isAr() ? 'لا يوجد تضارب مصالح' : 'No conflicts' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="isAr() ? 'روابط المنصة' : 'Cross-Module Links'">
          <div class="cross-links-grid">
            <a class="cross-link-card" routerLink="/governance/policies">
              <i class="pi pi-file"></i>
              <span>{{ isAr() ? 'السياسات' : 'Policies' }}</span>
              <small>{{ isAr() ? 'سياسات الأخلاقيات' : 'Ethics policies' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/training-awareness">
              <i class="pi pi-book"></i>
              <span>{{ isAr() ? 'التدريب' : 'Training' }}</span>
              <small>{{ isAr() ? 'تدريب على الأخلاقيات' : 'Ethics training programs' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/committees">
              <i class="pi pi-users"></i>
              <span>{{ isAr() ? 'اللجان' : 'Committees' }}</span>
              <small>{{ isAr() ? 'لجنة الأخلاقيات' : 'Ethics committee' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/incidents">
              <i class="pi pi-bell"></i>
              <span>{{ isAr() ? 'الحوادث' : 'Incidents' }}</span>
              <small>{{ isAr() ? 'حوادث أخلاقية' : 'Ethics-related incidents' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/actions">
              <i class="pi pi-bolt"></i>
              <span>{{ isAr() ? 'الإجراءات' : 'Governance Actions' }}</span>
              <small>{{ isAr() ? 'إجراءات تأديبية' : 'Disciplinary actions' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/compliance/overview">
              <i class="pi pi-check-circle"></i>
              <span>{{ isAr() ? 'الامتثال' : 'Compliance' }}</span>
              <small>{{ isAr() ? 'الالتزام بقواعد السلوك' : 'Conduct compliance tracking' }}</small>
            </a>
          </div>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>

    <p-dialog [header]="isAr() ? 'إضافة قاعدة سلوك' : 'Add Code of Conduct'" [(visible)]="showCodeDialog" [modal]="true" [style]="{width:'520px'}">
      <div class="dialog-form">
        <div class="field"><label>Title (EN)</label><input pInputText [(ngModel)]="codeForm.title_en" class="w-full" /></div>
        <div class="field"><label>Title (AR)</label><input pInputText [(ngModel)]="codeForm.title_ar" class="w-full" /></div>
        <div class="field"><label>Owner</label><input pInputText [(ngModel)]="codeForm.owner" class="w-full" /></div>
        <div class="field"><label>Effective Date</label><input pInputText type="date" [(ngModel)]="codeForm.effective_date" class="w-full" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showCodeDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveCode()" [disabled]="!codeForm.title_en || !codeForm.owner" />
      </ng-template>
    </p-dialog>

    <p-dialog [header]="isAr() ? 'إضافة إفصاح' : 'Add Disclosure'" [(visible)]="showDisclosureDialog" [modal]="true" [style]="{width:'520px'}">
      <div class="dialog-form">
        <div class="field"><label>Disclosure Type</label>
          <p-dropdown [options]="disclosureTypes" [(ngModel)]="disclosureForm.disclosure_type" optionLabel="label" optionValue="value" [style]="{width:'100%'}" />
        </div>
        <div class="field"><label>Discloser Name</label><input pInputText [(ngModel)]="disclosureForm.discloser_name" class="w-full" /></div>
        <div class="field"><label>Description</label><textarea pInputTextarea [(ngModel)]="disclosureForm.description" [rows]="3" class="w-full"></textarea></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showDisclosureDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveDisclosure()" [disabled]="!disclosureForm.discloser_name" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .hs-card { flex: 1; min-width: 120px; text-align: center; padding: 12px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .hs-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .hs-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; padding: 8px 0; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); margin-bottom: 4px; }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
  `]
})
export class EthicsIntegrityComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  cdr = inject(ChangeDetectorRef);
  private msg = inject(MessageService);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');

  loading = true;
  loadError = false;
  dashboardCounts: { total?: number; open?: number; resolved?: number } = {};
  codeOfConductItems: GrcRecord[] = [];
  disclosures: GrcRecord[] = [];
  whistleblowerReports: GrcRecord[] = [];
  conflictOfInterest: GrcRecord[] = [];

  showCodeDialog = false;
  codeForm: GrcRecord = {};
  showDisclosureDialog = false;
  disclosureForm: GrcRecord = {};

  statusOptions = [
    { label: 'Reported', value: 'reported' },
    { label: 'Investigating', value: 'investigating' },
    { label: 'Resolved', value: 'resolved' },
  ];
  statusFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Reported', value: 'reported' },
    { label: 'Investigating', value: 'investigating' },
    { label: 'Resolved', value: 'resolved' },
  ];
  disclosureStatusFilter: string = '';
  whistleblowerStatusFilter: string = '';

  get disclosuresFiltered(): GrcRecord[] {
    return this.disclosureStatusFilter ? this.disclosures.filter(d => d.status === this.disclosureStatusFilter) : this.disclosures;
  }
  get whistleblowerFiltered(): GrcRecord[] {
    return this.whistleblowerStatusFilter ? this.whistleblowerReports.filter(w => w.status === this.whistleblowerStatusFilter) : this.whistleblowerReports;
  }

  disclosureTypes = [
    { label: 'Gift', value: 'gift' },
    { label: 'Outside Employment', value: 'outside_employment' },
    { label: 'Financial Interest', value: 'financial_interest' },
    { label: 'Relationship', value: 'relationship' },
    { label: 'Other', value: 'other' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loadError = false;
    this.loading = true;
    this.cdr.markForCheck();
    this.apiclientSvc.get('/governance/ethics/dashboard').subscribe({
      next: (res) => {
        this.dashboardCounts = res?.counts ?? {};
        this.cdr.markForCheck();
      },
      error: () => { this.dashboardCounts = {}; }
    });
    this.apiclientSvc.get('/governance/ethics/code-of-conduct').subscribe({
      next: (res) => {
        const raw = res.items || res || [];
        this.codeOfConductItems = raw.map((item) => {
          try {
            if (typeof item.description === 'string') item._parsed = JSON.parse(item.description) || {};
          } catch { item._parsed = {}; }
          return item;
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.codeOfConductItems = []; this.loading = false; this.loadError = true; this.cdr.markForCheck(); }
    });
    this.apiclientSvc.get('/governance/ethics/disclosures').subscribe({
      next: (res) => { this.disclosures = res.items || res || []; this.cdr.markForCheck(); },
      error: () => { this.disclosures = []; }
    });
    this.apiclientSvc.get('/governance/ethics/whistleblower-reports').subscribe({
      next: (res) => { this.whistleblowerReports = res.items || res || []; this.cdr.markForCheck(); },
      error: () => { this.whistleblowerReports = []; }
    });
    this.apiclientSvc.get('/governance/ethics/conflict-of-interest').subscribe({
      next: (res) => { this.conflictOfInterest = res.items || res || []; this.cdr.markForCheck(); },
      error: () => { this.conflictOfInterest = []; }
    });
  }

  updateReportStatus(item: GrcRecord, newStatus: string): void {
    const id = item.report_id ?? item.id;
    if (!id) return;
    const prev = item.status;
    item.status = newStatus;
    this.apiclientSvc.put(`/governance/ethics/${id}`, { status: newStatus }).subscribe({
      next: () => this.msg.add({ severity: 'success', summary: this.i18n.translate('common.updated') }),
      error: () => { item.status = prev; this.cdr.markForCheck(); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.updateFailed') }); }
    });
  }

  openCreateCode(): void { this.codeForm = { title_en: '', title_ar: '', owner: '', effective_date: '' }; this.showCodeDialog = true; }
  saveCode(): void {
    this.apiclientSvc.post('/governance/ethics/code-of-conduct', this.codeForm).subscribe({
      next: () => { this.showCodeDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.created') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') })
    });
  }

  openCreateDisclosure(): void { this.disclosureForm = { disclosure_type: 'gift', discloser_name: '', description: '' }; this.showDisclosureDialog = true; }
  saveDisclosure(): void {
    this.apiclientSvc.post('/governance/ethics/disclosures', this.disclosureForm).subscribe({
      next: () => { this.showDisclosureDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.created') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') })
    });
  }
}
