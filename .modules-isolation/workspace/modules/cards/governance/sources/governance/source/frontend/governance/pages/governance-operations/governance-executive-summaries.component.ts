import { Component, OnInit, inject, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-executive-summaries',
    imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Executive Summaries" titleAr="الملخصات التنفيذية" subtitleEn="Governance executive reports and summaries" subtitleAr="التقارير التنفيذية والملخصات" icon="file-text"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Executive Summaries')]" [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.translate('Total') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--success)">{{ publishedCount }}</div><div class="health-label">{{ i18n.translate('Published') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ draftCount }}</div><div class="health-label">{{ i18n.translate('Draft') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--primary)">{{ approvedCount }}</div><div class="health-label">{{ i18n.translate('Approved') }}</div></div>
        </div>
        <div class="page-toolbar">
          <div class="toolbar-primary">
            <p-button [label]="i18n.translate('Create Summary')" icon="pi pi-plus" (onClick)="openCreate()" />
            <p-button [label]="i18n.translate('Auto-Generate')" icon="pi pi-cog" styleClass="p-button-outlined" (onClick)="autoGenerate()" />
            <div class="search-wrap"><i class="pi pi-search search-icon"></i><input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.translate('Search...')" [attr.aria-label]="i18n.translate('Search...')" (input)="filterList()" class="search-input" /></div>
          </div>
          <div class="toolbar-secondary"><app-export-button module="governance-executive-summaries" [data]="filteredItems" /></div>
        </div>
        <div class="table-shell" *ngIf="filteredItems.length > 0">
          <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header"><tr>
              <th>{{ i18n.translate('Title') }}</th>
              <th>{{ i18n.translate('Type') }}</th>
              <th>{{ i18n.translate('Period') }}</th>
              <th>{{ i18n.translate('Status') }}</th>
              <th style="width:180px">{{ i18n.translate('Actions') }}</th>
            </tr></ng-template>
            <ng-template pTemplate="body" let-item><tr>
              <td><strong>{{ i18n.localize(item.title_en, item.title_ar) }}</strong></td>
              <td><p-tag [value]="item.summary_type" /></td>
              <td>{{ item.period_start | appDate:'medium' }} — {{ item.period_end | appDate:'medium' }}</td>
              <td><app-status-badge [status]="item.status" /></td>
              <td><div class="action-btns">
                <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                <button aria-label="Approve" class="icon-btn" style="color:var(--success)" pTooltip="Approve" (click)="approve(item)" *ngIf="item.status === 'draft' || item.status === 'in_review'"><i class="pi pi-check"></i></button>
                <button aria-label="Publish" class="icon-btn" style="color:var(--primary)" pTooltip="Publish" (click)="publish(item)" *ngIf="item.status === 'approved'"><i class="pi pi-send"></i></button>
                <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteItem(item)"><i class="pi pi-trash"></i></button>
              </div></td>
            </tr></ng-template>
          </p-table>
        </div>
        <div class="empty-state" *ngIf="!loading && filteredItems.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.translate('No executive summaries found') }}</p></div>
        <!-- Cross-Module Links -->
        <div class="cross-links">
          <button class="cross-link-btn" (click)="navigateTo('/governance/health')"><i class="pi pi-heart"></i> Health Score</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/overview')"><i class="pi pi-home"></i> Overview</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/board-packs')"><i class="pi pi-briefcase"></i> Board Packs</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/decisions')"><i class="pi pi-check-square"></i> Decisions</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/actions')"><i class="pi pi-bolt"></i> Actions</button>
        </div>
      </div>
    </div>
    <p-dialog [header]="editMode ? (i18n.translate('Edit Summary')) : (i18n.translate('Create Summary'))" [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Title (EN)</label><input pInputText [(ngModel)]="form.title_en" class="w-full" /></div>
        <div class="field"><label>Title (AR)</label><input pInputText [(ngModel)]="form.title_ar" class="w-full" /></div>
        <div class="field"><label>Type</label><p-dropdown [options]="typeOptions" [(ngModel)]="form.summary_type" optionLabel="label" optionValue="value" appendTo="body" /></div>
        <div class="field"><label>Period Start</label><input pInputText type="date" [(ngModel)]="form.period_start" class="w-full" /></div>
        <div class="field"><label>Period End</label><input pInputText type="date" [(ngModel)]="form.period_end" class="w-full" /></div>
        <div class="field"><label>Highlights</label><textarea pInputTextarea [(ngModel)]="form.highlights" rows="3" class="w-full"></textarea></div>
        <div class="field"><label>Key Risks</label><textarea pInputTextarea [(ngModel)]="form.key_risks" rows="2" class="w-full"></textarea></div>
        <div class="field"><label>Key Decisions</label><textarea pInputTextarea [(ngModel)]="form.key_decisions" rows="2" class="w-full"></textarea></div>
        <div class="field"><label>Recommendations</label><textarea pInputTextarea [(ngModel)]="form.recommendations" rows="2" class="w-full"></textarea></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .gov-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 100px; text-align: center; padding: 10px 6px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .health-value { font-size: var(--font-size-lg); font-weight: 700; } .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; } .toolbar-secondary { display: flex; align-items: center; gap: 8px; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; } .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; } .search-input { min-width: 200px; padding-inline-start: 32px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); } .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .action-btns { display: flex; gap: 4px; } .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; } .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class GovernanceExecutiveSummariesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private readonly router = inject(Router);
  i18n = inject(I18nService);
 private msg = inject(MessageService);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'Create Summary', labelAr: 'إنشاء ملخص', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }
  loading = true; items: Record<string, any>[] = []; filteredItems: Record<string, any>[] = []; searchTerm = ''; showDialog = false; editMode = false; editId = ''; form: Record<string, any> = {};
  publishedCount = 0; draftCount = 0; approvedCount = 0;
  typeOptions = [
    { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' }, { label: 'Annual', value: 'annual' }, { label: 'Ad Hoc', value: 'ad_hoc' }
  ];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/executive-summaries').subscribe({
      next: res => {
        this.items = res.summaries || [];
        this.publishedCount = this.items.filter(i => i.status === 'published').length;
        this.draftCount = this.items.filter(i => i.status === 'draft').length;
        this.approvedCount = this.items.filter(i => i.status === 'approved').length;
        this.filterList(); this.loading = false;
      }, error: () => { this.loading = false; }
    });
  }
  filterList(): void { const s = this.searchTerm.toLowerCase(); this.filteredItems = this.items.filter(i => !s || (i.title_en || '').toLowerCase().includes(s) || (i.title_ar || '').toLowerCase().includes(s)); }
  openCreate(): void { this.editMode = false; this.form = { title_en: '', title_ar: '', summary_type: 'monthly', period_start: '', period_end: '', highlights: '', key_risks: '', key_decisions: '', recommendations: '' }; this.showDialog = true; }
  openEdit(item: Record<string, any>): void { this.editMode = true; this.editId = item.summary_id; this.form = { ...item }; this.showDialog = true; }
  save(): void {
    const obs = this.editMode ? this.apiclientSvc.put(`/governance/executive-summaries/${this.editId}`, this.form) : this.apiclientSvc.post('/governance/executive-summaries', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  autoGenerate(): void {
    const now = new Date();
    const periodEnd = now.toISOString().split('T')[0];
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
    this.apiclientSvc.post('/governance/executive-summaries/generate', { period_start: periodStart, period_end: periodEnd, summary_type: 'monthly' }).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.executiveSummaryAutoGenerated') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.errorGeneratingSummary') })
    });
  }
  approve(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/executive-summaries/${item.summary_id}/approve`, {}).subscribe({ next: () => this.load() }); }
  publish(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/executive-summaries/${item.summary_id}/publish`, {}).subscribe({ next: () => this.load() }); }
  deleteItem(item: Record<string, any>): void { this.apiclientSvc.del(`/governance/executive-summaries/${item.summary_id}`).subscribe({ next: () => this.load() }); }
  navigateTo(path: string) { this.router.navigate([path]); }
}
