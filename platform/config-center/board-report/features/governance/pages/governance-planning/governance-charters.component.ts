import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
    selector: 'app-governance-charters',
    imports: [CommonModule, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Charters" titleAr="المواثيق" subtitleEn="Committee charters — purpose, scope and authority" subtitleAr="مواثيق اللجان — الغرض والنطاق والصلاحيات" icon="scroll"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Charters')]" [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.translate('Total') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--success)">{{ activeCount }}</div><div class="health-label">{{ i18n.translate('Active') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ draftReviewCount }}</div><div class="health-label">{{ i18n.translate('Draft/Review') }}</div></div>
        </div>
        <div class="page-toolbar">
          <div class="toolbar-primary">
            <p-button [label]="i18n.translate('Add Charter')" icon="pi pi-plus" (onClick)="openCreate()" />
            <div class="search-wrap"><i class="pi pi-search search-icon"></i><input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.translate('Search...')" [attr.aria-label]="i18n.translate('Search...')" (input)="filterList()" class="search-input" /></div>
          </div>
          <div class="toolbar-secondary"><app-export-button module="governance-charters" [data]="filteredItems" /></div>
        </div>
        <div class="table-shell" *ngIf="filteredItems.length > 0">
          <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header"><tr>
              <th>{{ i18n.translate('Title') }}</th>
              <th>{{ i18n.translate('Committee') }}</th>
              <th>{{ i18n.translate('Status') }}</th>
              <th>{{ i18n.translate('Version') }}</th>
              <th style="width:140px">{{ i18n.translate('Actions') }}</th>
            </tr></ng-template>
            <ng-template pTemplate="body" let-item><tr>
              <td><strong>{{ i18n.localize(item.title_en, item.title_ar) }}</strong></td>
              <td>{{ item.committee_id || '—' }}</td>
              <td><app-status-badge [status]="item.status" /></td>
              <td>v{{ item.version || 1 }}</td>
              <td><div class="action-btns">
                <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                <button aria-label="Approve" class="icon-btn" pTooltip="Approve" (click)="approve(item)" *ngIf="item.status === 'in_review'"><i class="pi pi-check"></i></button>
                <button aria-label="Activate" class="icon-btn" style="color:var(--success)" pTooltip="Activate" (click)="activate(item)" *ngIf="item.status === 'approved'"><i class="pi pi-play"></i></button>
                <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteItem(item)"><i class="pi pi-trash"></i></button>
              </div></td>
            </tr></ng-template>
          </p-table>
        </div>
        <div class="empty-state" *ngIf="!loading && filteredItems.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.translate('No charters found') }}</p></div>
        <!-- Cross-Module Links -->
        <div class="cross-links">
          <button class="cross-link-btn" (click)="navigateTo('/governance/committees')"><i class="pi pi-users"></i> Committees</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/delegations')"><i class="pi pi-share-alt"></i> Delegations</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/responsibilities')"><i class="pi pi-id-card"></i> Responsibilities</button>
          <button class="cross-link-btn" (click)="navigateTo('/governance/health')"><i class="pi pi-heart"></i> Health Score</button>
          <button class="cross-link-btn" (click)="navigateTo('/foundation/audit')"><i class="pi pi-history"></i> Audit Trail</button>
        </div>
      </div>
    </div>
    <p-dialog [header]="editMode ? (i18n.translate('Edit Charter')) : (i18n.translate('Add Charter'))" [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Title (EN)</label><input pInputText [(ngModel)]="form.title_en" class="w-full" /></div>
        <div class="field"><label>Title (AR)</label><input pInputText [(ngModel)]="form.title_ar" class="w-full" /></div>
        <div class="field"><label>Purpose</label><textarea pInputTextarea [(ngModel)]="form.purpose" rows="2" class="w-full"></textarea></div>
        <div class="field"><label>Scope</label><textarea pInputTextarea [(ngModel)]="form.scope" rows="2" class="w-full"></textarea></div>
        <div class="field-row">
          <div class="field"><label>Meeting Frequency</label><input pInputText [(ngModel)]="form.meeting_frequency" class="w-full" /></div>
          <div class="field"><label>Quorum</label><input pInputText [(ngModel)]="form.quorum_requirements" class="w-full" /></div>
        </div>
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
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class GovernanceChartersComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService); private router = inject(Router);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'Add Charter', labelAr: 'إضافة ميثاق', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }
  loading = true; items: Record<string, any>[] = []; filteredItems: Record<string, any>[] = []; searchTerm = ''; showDialog = false; editMode = false; editId = ''; form: Record<string, any> = {};
  activeCount = 0; draftReviewCount = 0;

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/charters').subscribe({ next: res => { this.items = res.charters || []; this.activeCount = this.items.filter(i => i.status === 'active').length; this.draftReviewCount = this.items.filter(i => i.status === 'draft' || i.status === 'in_review').length; this.filterList(); this.loading = false; }, error: () => { this.loading = false; } });
  }
  filterList(): void { const s = this.searchTerm.toLowerCase(); this.filteredItems = this.items.filter(i => !s || (i.title_en || '').toLowerCase().includes(s) || (i.title_ar || '').toLowerCase().includes(s)); }
  openCreate(): void { this.editMode = false; this.form = { title_en: '', title_ar: '', purpose: '', scope: '', meeting_frequency: '', quorum_requirements: '' }; this.showDialog = true; }
  openEdit(item: Record<string, any>): void { this.editMode = true; this.editId = item.charter_id; this.form = { ...item }; this.showDialog = true; }
  save(): void {
    const obs = this.editMode ? this.apiclientSvc.put(`/governance/charters/${this.editId}`, this.form) : this.apiclientSvc.post('/governance/charters', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  approve(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/charters/${item.charter_id}/approve`, {}).subscribe({ next: () => this.load() }); }
  activate(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/charters/${item.charter_id}/activate`, {}).subscribe({ next: () => this.load() }); }
  deleteItem(item: Record<string, any>): void { this.apiclientSvc.del(`/governance/charters/${item.charter_id}`).subscribe({ next: () => this.load() }); }
  navigateTo(path: string) { this.router.navigate([path]); }
}
