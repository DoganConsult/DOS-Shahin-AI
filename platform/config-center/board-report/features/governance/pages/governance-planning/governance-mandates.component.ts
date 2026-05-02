import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
    selector: 'app-governance-mandates',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, AppDatePipe,
    ],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Mandates" titleAr="التفويضات التنظيمية"
        subtitleEn="Manage regulatory and organizational mandates"
        subtitleAr="إدارة التفويضات التنظيمية والمؤسسية"
        icon="gavel"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Mandates')]"
        [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.translate('Total') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--success)">{{ activeCount }}</div><div class="health-label">{{ i18n.translate('Active') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ draftCount }}</div><div class="health-label">{{ i18n.translate('Draft') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--error)">{{ expiredCount }}</div><div class="health-label">{{ i18n.translate('Expired') }}</div></div>
        </div>
        <div class="page-toolbar">
          <div class="toolbar-primary">
            <p-button [label]="i18n.translate('Add Mandate')" icon="pi pi-plus" (onClick)="openCreate()" />
            <div class="search-wrap"><i class="pi pi-search search-icon"></i>
              <input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.translate('Search...')" [attr.aria-label]="i18n.translate('Search...')" (input)="filterList()" class="search-input" />
            </div>
          </div>
          <div class="toolbar-secondary">
            <app-export-button module="governance-mandates" [data]="filteredItems" />
          </div>
        </div>
        <div class="table-shell" *ngIf="filteredItems.length > 0">
          <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('Title') }}</th>
                <th>{{ i18n.translate('Issuing Authority') }}</th>
                <th>{{ i18n.translate('Jurisdiction') }}</th>
                <th>{{ i18n.translate('Priority') }}</th>
                <th>{{ i18n.translate('Status') }}</th>
                <th>{{ i18n.translate('Expiry') }}</th>
                <th style="width:100px">{{ i18n.translate('Actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><strong>{{ i18n.localize(item.title_en, item.title_ar) }}</strong></td>
                <td>{{ item.issuing_authority || '—' }}</td>
                <td>{{ item.jurisdiction || '—' }}</td>
                <td><p-tag [value]="item.priority" [severity]="item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'info'" /></td>
                <td><app-status-badge [status]="item.status" /></td>
                <td>{{ item.expiry_date | appDate:'medium' }}</td>
                <td><div class="action-btns">
                  <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                  <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteItem(item)"><i class="pi pi-trash"></i></button>
                </div></td>
              </tr>
            </ng-template>
          </p-table>
        </div>
        <div class="empty-state" *ngIf="!loading && filteredItems.length === 0">
          <i class="pi pi-inbox empty-icon"></i>
          <p>{{ i18n.translate('No mandates found') }}</p>
        </div>
        <!-- Cross-Module Links -->
        <div class="cross-links">
          <button class="cross-link-btn" (click)="navigateTo('/governance/obligations')"><i class="pi pi-receipt"></i> Obligations</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/policies')"><i class="pi pi-file"></i> Policies</button>
          <button class="cross-link-btn" (click)="navigateTo('/compliance/overview')"><i class="pi pi-verified"></i> Compliance</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/health')"><i class="pi pi-heart"></i> Health Score</button>
          <button class="cross-link-btn" (click)="navigateTo('/foundation/audit')"><i class="pi pi-history"></i> Audit Trail</button>
        </div>
      </div>
    </div>

    <p-dialog [header]="editMode ? (i18n.translate('Edit Mandate')) : (i18n.translate('Add Mandate'))"
              [(visible)]="showDialog" [modal]="true" [style]="{width:'520px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>{{ i18n.translate('Title (EN)') }}</label><input pInputText [(ngModel)]="form.title_en" class="w-full" /></div>
        <div class="field"><label>{{ i18n.translate('Title (AR)') }}</label><input pInputText [(ngModel)]="form.title_ar" class="w-full" /></div>
        <div class="field-row">
          <div class="field"><label>{{ i18n.translate('Issuing Authority') }}</label><input pInputText [(ngModel)]="form.issuing_authority" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Jurisdiction') }}</label><input pInputText [(ngModel)]="form.jurisdiction" class="w-full" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>{{ i18n.translate('Priority') }}</label>
            <p-dropdown [options]="priorityOptions" [(ngModel)]="form.priority" optionLabel="label" optionValue="value" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Status') }}</label>
            <p-dropdown [options]="statusOptions" [(ngModel)]="form.status" optionLabel="label" optionValue="value" class="w-full" /></div>
        </div>
        <div class="field"><label>{{ i18n.translate('Description') }}</label><textarea pInputTextarea [(ngModel)]="form.description" rows="3" class="w-full"></textarea></div>
        <div class="field-row">
          <div class="field"><label>{{ i18n.translate('Effective Date') }}</label><input pInputText type="date" [(ngModel)]="form.effective_date" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Expiry Date') }}</label><input pInputText type="date" [(ngModel)]="form.expiry_date" class="w-full" /></div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('Cancel')" icon="pi pi-times" styleClass="p-button-text" (onClick)="showDialog=false" />
        <p-button [label]="i18n.translate('Save')" icon="pi pi-check" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .gov-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 100px; text-align: center; padding: 10px 6px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .health-value { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #111); }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 200px; padding-inline-start: 32px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; direction: ltr; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted, var(--text-muted)); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; color: var(--text-muted, #9ca3af); display: block; }
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); border-color: #fca5a5; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class GovernanceMandatesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private readonly router = inject(Router);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'Add Mandate', labelAr: 'إضافة تفويض', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }

  priorityOptions = [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' }];
  statusOptions = [{ label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' }, { label: 'Expired', value: 'expired' }, { label: 'Revoked', value: 'revoked' }];

  loading = true;
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  searchTerm = '';
  showDialog = false;
  editMode = false;
  editId = '';
  form: Record<string, any> = {};
  activeCount = 0; draftCount = 0; expiredCount = 0;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/mandates').subscribe({
      next: res => { this.items = res.mandates || []; this.activeCount = this.items.filter(i => i.status === 'active').length; this.draftCount = this.items.filter(i => i.status === 'draft').length; this.expiredCount = this.items.filter(i => i.status === 'expired').length; this.filterList(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  filterList(): void {
    const s = this.searchTerm.toLowerCase();
    this.filteredItems = this.items.filter(i => !s || (i.title_en || '').toLowerCase().includes(s) || (i.title_ar || '').toLowerCase().includes(s));
  }

  openCreate(): void {
    this.editMode = false; this.editId = '';
    this.form = { title_en: '', title_ar: '', issuing_authority: '', jurisdiction: '', priority: 'medium', status: 'draft', description: '', effective_date: '', expiry_date: '' };
    this.showDialog = true;
  }

  openEdit(item: Record<string, any>): void {
    this.editMode = true; this.editId = item.mandate_id;
    this.form = { ...item };
    this.showDialog = true;
  }

  save(): void {
    const obs = this.editMode
      ? this.apiclientSvc.put(`/governance/mandates/${this.editId}`, this.form)
      : this.apiclientSvc.post('/governance/mandates', this.form);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') })
    });
  }

  deleteItem(item: Record<string, any>): void {
    this.apiclientSvc.del(`/governance/mandates/${item.mandate_id}`).subscribe({ next: () => this.load() });
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}
