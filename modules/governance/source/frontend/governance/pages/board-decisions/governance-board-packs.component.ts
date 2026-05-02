import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-board-packs',
    imports: [CommonModule, AppDatePipe, FormsModule, RouterModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, TooltipModule, ToastModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Board Packs" titleAr="حزم مجلس الإدارة" subtitleEn="Assemble and publish board meeting packs" subtitleAr="تجميع ونشر حزم اجتماعات مجلس الإدارة" icon="briefcase"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Board Packs')]" [actions]="headerActions" [isAr]="isAr()" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.translate('Total') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--success)">{{ publishedCount }}</div><div class="health-label">{{ i18n.translate('Published') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ draftCount }}</div><div class="health-label">{{ i18n.translate('Draft') }}</div></div>
        </div>
        <div class="page-toolbar">
          <div class="toolbar-primary">
            <p-button [label]="i18n.translate('Create Pack')" icon="pi pi-plus" (onClick)="openCreate()" />
            <div class="search-wrap"><i class="pi pi-search search-icon"></i><input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.translate('Search...')" [attr.aria-label]="i18n.translate('Search...')" (input)="filterList()" class="search-input" /></div>
          </div>
          <div class="toolbar-secondary"><app-export-button module="governance-board-packs" [data]="filteredItems" /></div>
        </div>
        <div class="table-shell" *ngIf="filteredItems.length > 0">
          <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header"><tr>
              <th>{{ i18n.translate('Title') }}</th>
              <th>{{ i18n.translate('Meeting Date') }}</th>
              <th>{{ i18n.translate('Status') }}</th>
              <th style="width:180px">{{ i18n.translate('Actions') }}</th>
            </tr></ng-template>
            <ng-template pTemplate="body" let-item><tr>
              <td><strong>{{ i18n.localize(item.title_en, item.title_ar) }}</strong></td>
              <td>{{ item.meeting_date | appDate:'medium' }}</td>
              <td><app-status-badge [status]="item.status" /></td>
              <td><div class="action-btns">
                <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                <button aria-label="Auto-Assemble" class="icon-btn" pTooltip="Auto-Assemble" (click)="autoAssemble(item)" *ngIf="item.status === 'draft'"><i class="pi pi-cog"></i></button>
                <button aria-label="Approve" class="icon-btn" style="color:var(--success)" pTooltip="Approve" (click)="approve(item)" *ngIf="item.status === 'assembled'"><i class="pi pi-check"></i></button>
                <button aria-label="Publish" class="icon-btn" style="color:var(--primary)" pTooltip="Publish" (click)="publish(item)" *ngIf="item.status === 'approved'"><i class="pi pi-send"></i></button>
                <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteItem(item)"><i class="pi pi-trash"></i></button>
              </div></td>
            </tr></ng-template>
          </p-table>
        </div>
        <div class="empty-state" *ngIf="!loading && filteredItems.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.translate('No board packs found') }}</p></div>

        <div class="cross-links-section">
          <h3 class="section-heading">{{ i18n.translate('Cross-Module Links') }}</h3>
          <div class="cross-links-grid">
            <a class="cross-link-card" routerLink="/governance/health">
              <i class="pi pi-heart"></i>
              <span>{{ i18n.translate('Health Score') }}</span>
              <small>{{ i18n.translate('Health scores for reporting') }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/decisions">
              <i class="pi pi-check-square"></i>
              <span>{{ i18n.translate('Decisions') }}</span>
              <small>{{ i18n.translate('Board decisions') }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/actions">
              <i class="pi pi-bolt"></i>
              <span>{{ i18n.translate('Actions') }}</span>
              <small>{{ i18n.translate('Board attention items') }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/committees">
              <i class="pi pi-users"></i>
              <span>{{ i18n.translate('Committees') }}</span>
              <small>{{ i18n.translate('Meeting minutes') }}</small>
            </a>
            <a class="cross-link-card" routerLink="/risk">
              <i class="pi pi-shield"></i>
              <span>{{ i18n.translate('Risk Register') }}</span>
              <small>{{ i18n.translate('Top risks for board') }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/exceptions">
              <i class="pi pi-exclamation-triangle"></i>
              <span>{{ i18n.translate('Exceptions') }}</span>
              <small>{{ i18n.translate('High-risk exceptions') }}</small>
            </a>
          </div>
        </div>
      </div>
    </div>
    <p-dialog [header]="editMode ? (i18n.translate('Edit Pack')) : (i18n.translate('Create Pack'))" [(visible)]="showDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Title (EN)</label><input pInputText [(ngModel)]="form.title_en" class="w-full" /></div>
        <div class="field"><label>Title (AR)</label><input pInputText [(ngModel)]="form.title_ar" class="w-full" /></div>
        <div class="field"><label>Meeting Date</label><input pInputText type="date" [(ngModel)]="form.meeting_date" class="w-full" /></div>
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
    .health-value { font-size: var(--font-size-lg); font-weight: 700; } .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; } .toolbar-secondary { display: flex; align-items: center; gap: 8px; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; } .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; } .search-input { min-width: 200px; padding-inline-start: 32px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    :host-context([dir="rtl"]) .table-shell th, :host-context([dir="rtl"]) .table-shell td { text-align: right; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); } .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .action-btns { display: flex; gap: 4px; } .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; } .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .w-full { width: 100%; }
    .section-heading { font-size: var(--font-size-md); font-weight: 700; margin: 8px 0 12px; color: var(--text-heading, #111); }
    .cross-links-section { margin-top: 16px; }
    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); margin-bottom: 4px; }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
  `]
})
export class GovernanceBoardPacksComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService);
  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'Create Pack', labelAr: 'إنشاء حزمة', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }
  loading = true; items: GrcRecord[] = []; filteredItems: GrcRecord[] = []; searchTerm = ''; showDialog = false; editMode = false; editId = ''; form: GrcRecord = {};
  publishedCount = 0; draftCount = 0;

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/board-packs').subscribe({ next: res => { this.items = res.packs || []; this.publishedCount = this.items.filter(i => i.status === 'published').length; this.draftCount = this.items.filter(i => i.status === 'draft').length; this.filterList(); this.loading = false; }, error: () => { this.loading = false; } });
  }
  filterList(): void { const s = this.searchTerm.toLowerCase(); this.filteredItems = this.items.filter(i => !s || (i.title_en || '').toLowerCase().includes(s) || (i.title_ar || '').toLowerCase().includes(s)); }
  openCreate(): void { this.editMode = false; this.form = { title_en: '', title_ar: '', meeting_date: '' }; this.showDialog = true; }
  openEdit(item: GrcRecord): void { this.editMode = true; this.editId = item.pack_id; this.form = { ...item }; this.showDialog = true; }
  save(): void {
    const obs = this.editMode ? this.apiclientSvc.put(`/governance/board-packs/${this.editId}`, this.form) : this.apiclientSvc.post('/governance/board-packs', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  autoAssemble(item: GrcRecord): void { this.apiclientSvc.post(`/governance/board-packs/${item.pack_id}/auto-assemble`, {}).subscribe({ next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.autoAssembled') }); } }); }
  approve(item: GrcRecord): void { this.apiclientSvc.post(`/governance/board-packs/${item.pack_id}/approve`, {}).subscribe({ next: () => this.load() }); }
  publish(item: GrcRecord): void { this.apiclientSvc.post(`/governance/board-packs/${item.pack_id}/publish`, {}).subscribe({ next: () => this.load() }); }
  deleteItem(item: GrcRecord): void { this.apiclientSvc.del(`/governance/board-packs/${item.pack_id}`).subscribe({ next: () => this.load() }); }
}
