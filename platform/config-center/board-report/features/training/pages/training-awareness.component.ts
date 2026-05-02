import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
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
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-awareness',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    PageShellComponent, StatusBadgeComponent, ExportButtonComponent,
    TabViewModule, TableModule, CardModule, ButtonModule,
    DialogModule, InputTextModule, InputTextarea,
    DropdownModule, ToolbarModule, TooltipModule, ToastModule,
    TagModule, ProgressBarModule, AppDatePipe,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="graduation-cap"
      [title]="i18n.isAr() ? 'التدريب والتوعية' : 'Training & Awareness'"
      [subtitle]="i18n.isAr() ? 'إدارة برامج التدريب وحملات التوعية والشهادات' : 'Manage training programs, awareness campaigns and certifications'"
      [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم', 'التدريب والتوعية'] : ['Dashboard', 'Training & Awareness']"
      [loading]="loading">

      <p-toast />

      <div class="health-strip">
        <div class="hs-card"><div class="hs-value">{{ programs.length }}</div><div class="hs-label">{{ i18n.isAr() ? 'البرامج' : 'Programs' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:var(--success)">{{ completedCount }}</div><div class="hs-label">{{ i18n.isAr() ? 'مكتمل' : 'Completed' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:#d97706">{{ overdueCount }}</div><div class="hs-label">{{ i18n.isAr() ? 'متأخر' : 'Overdue' }}</div></div>
        <div class="hs-card"><div class="hs-value" style="color:var(--primary)">{{ completionRate }}%</div><div class="hs-label">{{ i18n.isAr() ? 'معدل الإتمام' : 'Completion Rate' }}</div></div>
      </div>

      <p-tabView>
        <p-tabPanel [header]="i18n.isAr() ? 'برامج التدريب' : 'Training Programs'">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="start">
              <p-button [label]="i18n.isAr() ? 'إضافة برنامج' : 'Add Program'" icon="pi pi-plus" (onClick)="openCreate()" />
            </ng-template>
            <ng-template pTemplate="end">
              <app-export-button module="training-programs" [data]="programs" />
            </ng-template>
          </p-toolbar>

          <p-table aria-label="Programs table" [value]="programs" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="programs.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'البرنامج' : 'Program' }}</th>
                <th>{{ i18n.isAr() ? 'النوع' : 'Type' }}</th>
                <th>{{ i18n.isAr() ? 'الفئة المستهدفة' : 'Target Audience' }}</th>
                <th>{{ i18n.isAr() ? 'التكرار' : 'Frequency' }}</th>
                <th>{{ i18n.isAr() ? 'معدل الإتمام' : 'Completion' }}</th>
                <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><strong>{{ i18n.isAr() ? item.title_ar || item.title_en : item.title_en }}</strong></td>
                <td><p-tag [value]="item.program_type" severity="info" /></td>
                <td>{{ item.target_audience || '—' }}</td>
                <td>{{ item.frequency || '—' }}</td>
                <td><p-progressBar [value]="item.completion_rate || 0" [showValue]="true" [style]="{height:'18px',width:'120px'}" /></td>
                <td><app-status-badge [status]="item.status" /></td>
                <td>
                  <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                  <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteProgram(item)"><i class="pi pi-trash"></i></button>
                </td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="programs.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد برامج' : 'No programs found' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isAr() ? 'حملات التوعية' : 'Awareness Campaigns'">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="start">
              <p-button [label]="i18n.isAr() ? 'إضافة حملة' : 'Add Campaign'" icon="pi pi-plus" (onClick)="openCreateCampaign()" />
            </ng-template>
          </p-toolbar>
          <p-table aria-label="Campaigns table" [value]="campaigns" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="campaigns.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'الحملة' : 'Campaign' }}</th>
                <th>{{ i18n.isAr() ? 'القناة' : 'Channel' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ البدء' : 'Start Date' }}</th>
                <th>{{ i18n.isAr() ? 'الوصول' : 'Reach' }}</th>
                <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><strong>{{ i18n.isAr() ? item.title_ar || item.title_en : item.title_en }}</strong></td>
                <td>{{ item.channel || '—' }}</td>
                <td>{{ item.start_date | appDate:'medium' }}</td>
                <td>{{ item.reach_count || 0 }}</td>
                <td><app-status-badge [status]="item.status" /></td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="campaigns.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد حملات' : 'No campaigns found' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isAr() ? 'الشهادات' : 'Certifications'">
          <p-table aria-label="Certifications table" [value]="certifications" [paginator]="true" [rows]="10" styleClass="p-datatable-striped p-datatable-sm" *ngIf="certifications.length > 0">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'الموظف' : 'Employee' }}</th>
                <th>{{ i18n.isAr() ? 'الشهادة' : 'Certification' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الإصدار' : 'Issued Date' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الانتهاء' : 'Expiry Date' }}</th>
                <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.employee_name || '—' }}</td>
                <td><strong>{{ item.certification_name }}</strong></td>
                <td>{{ item.issued_date | appDate:'medium' }}</td>
                <td>{{ item.expiry_date | appDate:'medium' }}</td>
                <td><app-status-badge [status]="item.expiry_date && isExpired(item.expiry_date) ? 'expired' : 'active'" /></td>
              </tr>
            </ng-template>
          </p-table>
          <div class="empty-state" *ngIf="certifications.length === 0 && !loading"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد شهادات' : 'No certifications' }}</p></div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isAr() ? 'روابط المنصة' : 'Cross-Module Links'">
          <div class="cross-links-grid">
            <a class="cross-link-card" routerLink="/governance/policies">
              <i class="pi pi-file"></i>
              <span>{{ i18n.isAr() ? 'السياسات' : 'Policies' }}</span>
              <small>{{ i18n.isAr() ? 'تدريب على السياسات الجديدة' : 'Training on new policies' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/compliance/overview">
              <i class="pi pi-check-circle"></i>
              <span>{{ i18n.isAr() ? 'الامتثال' : 'Compliance' }}</span>
              <small>{{ i18n.isAr() ? 'متطلبات التدريب التنظيمي' : 'Regulatory training requirements' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/incidents">
              <i class="pi pi-bell"></i>
              <span>{{ i18n.isAr() ? 'الحوادث' : 'Incidents' }}</span>
              <small>{{ i18n.isAr() ? 'الدروس المستفادة' : 'Lessons learned training' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/risk">
              <i class="pi pi-shield"></i>
              <span>{{ i18n.isAr() ? 'المخاطر' : 'Risk' }}</span>
              <small>{{ i18n.isAr() ? 'التوعية بالمخاطر' : 'Risk awareness programs' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/foundation/evidence">
              <i class="pi pi-folder-open"></i>
              <span>{{ i18n.isAr() ? 'الأدلة' : 'Evidence' }}</span>
              <small>{{ i18n.isAr() ? 'شهادات إتمام التدريب' : 'Training completion certificates' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/ethics-integrity">
              <i class="pi pi-heart"></i>
              <span>{{ i18n.isAr() ? 'الأخلاقيات' : 'Ethics & Integrity' }}</span>
              <small>{{ i18n.isAr() ? 'برامج التوعية الأخلاقية' : 'Ethics awareness programs' }}</small>
            </a>
          </div>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>

    <p-dialog [header]="editMode ? (i18n.isAr() ? 'تعديل برنامج' : 'Edit Program') : (i18n.isAr() ? 'إضافة برنامج' : 'Add Program')" [(visible)]="showDialog" [modal]="true" [style]="{width:'520px'}">
      <div class="dialog-form">
        <div class="field"><label>Title (EN)</label><input pInputText [(ngModel)]="form.title_en" class="w-full" /></div>
        <div class="field"><label>Title (AR)</label><input pInputText [(ngModel)]="form.title_ar" class="w-full" /></div>
        <div class="field"><label>Type</label>
          <p-dropdown [options]="typeOptions" [(ngModel)]="form.program_type" optionLabel="label" optionValue="value" [style]="{width:'100%'}" />
        </div>
        <div class="field"><label>Target Audience</label><input pInputText [(ngModel)]="form.target_audience" class="w-full" /></div>
        <div class="field"><label>Frequency</label>
          <p-dropdown [options]="frequencyOptions" [(ngModel)]="form.frequency" optionLabel="label" optionValue="value" [style]="{width:'100%'}" />
        </div>
        <div class="field"><label>Owner</label><input pInputText [(ngModel)]="form.owner" class="w-full" /></div>
        <div class="field"><label>Description</label><textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title_en || !form.owner" />
      </ng-template>
    </p-dialog>

    <p-dialog [header]="i18n.isAr() ? 'إضافة حملة' : 'Add Campaign'" [(visible)]="showCampaignDialog" [modal]="true" [style]="{width:'520px'}">
      <div class="dialog-form">
        <div class="field"><label>Title (EN)</label><input pInputText [(ngModel)]="campaignForm.title_en" class="w-full" /></div>
        <div class="field"><label>Title (AR)</label><input pInputText [(ngModel)]="campaignForm.title_ar" class="w-full" /></div>
        <div class="field"><label>Channel</label>
          <p-dropdown [options]="channelOptions" [(ngModel)]="campaignForm.channel" optionLabel="label" optionValue="value" [style]="{width:'100%'}" />
        </div>
        <div class="field"><label>Start Date</label><input pInputText type="date" [(ngModel)]="campaignForm.start_date" class="w-full" /></div>
        <div class="field"><label>Description</label><textarea pInputTextarea [(ngModel)]="campaignForm.description" [rows]="3" class="w-full"></textarea></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showCampaignDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveCampaign()" [disabled]="!campaignForm.title_en" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .hs-card { flex: 1; min-width: 120px; text-align: center; padding: 12px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .hs-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .hs-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); }
    .empty-icon { font-size: 48px; margin-bottom: 12px; display: block; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
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
export class TrainingAwarenessComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private msg = inject(MessageService);


  loading = true;
  programs: Record<string, unknown>[] = [];
  campaigns: Record<string, unknown>[] = [];
  certifications: Record<string, unknown>[] = [];
  completedCount = 0;
  overdueCount = 0;
  completionRate = 0;

  showDialog = false;
  editMode = false;
  editId = '';
  form: Record<string, unknown> = {};

  showCampaignDialog = false;
  campaignForm: Record<string, unknown> = {};

  typeOptions = [
    { label: 'Mandatory', value: 'mandatory' },
    { label: 'Elective', value: 'elective' },
    { label: 'Onboarding', value: 'onboarding' },
    { label: 'Refresher', value: 'refresher' },
    { label: 'Certification', value: 'certification' },
  ];

  frequencyOptions = [
    { label: 'Annual', value: 'annual' },
    { label: 'Semi-Annual', value: 'semi-annual' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'One-Time', value: 'one-time' },
    { label: 'On Hire', value: 'on-hire' },
  ];

  channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'LMS', value: 'lms' },
    { label: 'Workshop', value: 'workshop' },
    { label: 'Poster', value: 'poster' },
    { label: 'Video', value: 'video' },
    { label: 'Intranet', value: 'intranet' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.apiclientSvc.get<Record<string, unknown>>('/training-advanced/programs').subscribe({
      next: (res) => {
        this.programs = (Array.isArray(res['programs']) ? res['programs'] : Array.isArray(res) ? res : []) as Record<string, unknown>[];
        this.completedCount = this.programs.filter((p: Record<string, unknown>) => p['status'] === 'completed').length;
        this.overdueCount = this.programs.filter((p: Record<string, unknown>) => p['status'] === 'overdue').length;
        const total = this.programs.length;
        this.completionRate = total > 0 ? Math.round((this.completedCount / total) * 100) : 0;
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.programs = []; this.loading = false; this.cdr.markForCheck(); }
    });
    this.apiclientSvc.get<Record<string, unknown>>('/training-advanced/campaigns').subscribe({
      next: (res) => { this.campaigns = (Array.isArray(res['campaigns']) ? res['campaigns'] : Array.isArray(res) ? res : []) as Record<string, unknown>[]; },
      error: () => { this.campaigns = []; }
    });
    this.apiclientSvc.get<Record<string, unknown>>('/training-advanced/certifications').subscribe({
      next: (res) => { this.certifications = (Array.isArray(res['certifications']) ? res['certifications'] : Array.isArray(res) ? res : []) as Record<string, unknown>[]; },
      error: () => { this.certifications = []; }
    });
  }

  openCreate(): void { this.editMode = false; this.form = { title_en: '', title_ar: '', program_type: 'mandatory', target_audience: '', frequency: 'annual', owner: '', description: '' }; this.showDialog = true; }
  openEdit(item: Record<string, unknown>): void { this.editMode = true; this.editId = String(item['program_id'] || item['id'] || ''); this.form = { ...item }; this.showDialog = true; }

  save(): void {
    const obs = this.editMode
      ? this.apiclientSvc.put(`/training-advanced/programs/${this.editId}`, this.form)
      : this.apiclientSvc.post('/training-advanced/programs', this.form);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.editMode ? 'Updated' : 'Created' }); },
      error: () => this.msg.add({ severity: 'error', summary: 'Error' })
    });
  }

  deleteProgram(item: Record<string, unknown>): void {
    this.apiclientSvc.del(`/training-advanced/programs/${item.program_id || item.id}`).subscribe({ next: () => this.load() });
  }

  openCreateCampaign(): void { this.campaignForm = { title_en: '', title_ar: '', channel: 'email', start_date: '', description: '' }; this.showCampaignDialog = true; }

  saveCampaign(): void {
    this.apiclientSvc.post('/training-advanced/campaigns', this.campaignForm).subscribe({
      next: () => { this.showCampaignDialog = false; this.load(); this.msg.add({ severity: 'success', summary: 'Campaign created' }); },
      error: () => this.msg.add({ severity: 'error', summary: 'Error' })
    });
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }
}
