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
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabs';
import { RouterModule } from '@angular/router';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-delegations',
    imports: [CommonModule, AppDatePipe, FormsModule, RouterModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, TabViewModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Delegations" titleAr="التفويضات" subtitleEn="Authority delegations, conflicts and expiry tracking" subtitleAr="تفويضات الصلاحيات وتتبع التعارضات والانتهاء" icon="share-alt"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','الحوكمة','التفويضات'] : ['Dashboard','Governance','Delegations']" [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.isAr() ? 'الإجمالي' : 'Total' }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--success)">{{ activeCount }}</div><div class="health-label">{{ i18n.isAr() ? 'نشط' : 'Active' }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ expiringCount }}</div><div class="health-label">{{ i18n.isAr() ? 'قريب الانتهاء' : 'Expiring Soon' }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--error)">{{ conflictCount }}</div><div class="health-label">{{ i18n.isAr() ? 'تعارضات' : 'Conflicts' }}</div></div>
        </div>
        <p-tabView>
          <p-tabPanel [header]="i18n.isAr() ? 'التفويضات' : 'Delegations'">
            <div class="page-toolbar">
              <div class="toolbar-primary">
                <p-button [label]="i18n.isAr() ? 'إضافة تفويض' : 'Add Delegation'" icon="pi pi-plus" (onClick)="openCreate()" />
                <div class="search-wrap"><i class="pi pi-search search-icon"></i><input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.isAr() ? 'بحث...' : 'Search...'" [attr.aria-label]="i18n.isAr() ? 'بحث...' : 'Search...'" (input)="filterList()" class="search-input" /></div>
              </div>
              <div class="toolbar-secondary"><app-export-button module="governance-delegations" [data]="filteredItems" /></div>
            </div>
            <div class="table-shell" *ngIf="filteredItems.length > 0">
              <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18n.isAr() ? 'نوع الصلاحية' : 'Authority Type' }}</th>
                  <th>{{ i18n.isAr() ? 'المفوِّض' : 'Delegator' }}</th>
                  <th>{{ i18n.isAr() ? 'المفوَّض إليه' : 'Delegate' }}</th>
                  <th>{{ i18n.isAr() ? 'الحد الأقصى' : 'Max Amount' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                  <th>{{ i18n.isAr() ? 'تاريخ الانتهاء' : 'Expiry' }}</th>
                  <th style="width:100px">{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-item><tr [class.expiring-row]="isExpiringSoon(item)" [class.expired-row]="isExpired(item)">
                  <td><strong>{{ item.authority_type }}</strong></td>
                  <td>{{ item.delegator_user_id }}</td>
                  <td>{{ item.delegate_user_id }}</td>
                  <td>{{ item.max_amount ? (item.max_amount | number) : '—' }}</td>
                  <td><app-status-badge [status]="item.status" /></td>
                  <td>{{ item.expiry_date | appDate:'medium' }}
                    <span *ngIf="isExpired(item)" class="expiry-badge expired">{{ i18n.isAr() ? 'منتهي' : 'Expired' }}</span>
                    <span *ngIf="isExpiringSoon(item) && !isExpired(item)" class="expiry-badge soon">{{ i18n.isAr() ? 'قريباً' : 'Soon' }}</span>
                  </td>
                  <td><div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Revoke" class="icon-btn danger" pTooltip="Revoke" (click)="revoke(item)" *ngIf="item.status === 'active'"><i class="pi pi-ban"></i></button>
                  </div></td>
                </tr></ng-template>
              </p-table>
            </div>
            <div class="empty-state" *ngIf="!loading && filteredItems.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد تفويضات' : 'No delegations found' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'مصفوفة الصلاحيات' : 'Authority Matrix'">
            <div class="matrix-wrapper" *ngIf="authorityMatrix.length > 0">
              <table aria-label="Authority Table table" class="authority-table">
                <thead>
                  <tr>
                    <th class="at-type-col">{{ i18n.isAr() ? 'نوع الصلاحية' : 'Authority Type' }}</th>
                    <th *ngFor="let tier of thresholdTiers" class="at-tier-col">{{ tier }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of authorityMatrix">
                    <td class="at-type-cell"><strong>{{ row.authority_type }}</strong></td>
                    <td *ngFor="let tier of thresholdTiers" class="at-tier-cell" [ngClass]="'at-' + (row.tiers[tier] || 'none')">
                      {{ row.tiers[tier] || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="at-legend">
                <span class="at-legend-item"><span class="at-box at-approved"></span> {{ i18n.isAr() ? 'مصرح' : 'Authorized' }}</span>
                <span class="at-legend-item"><span class="at-box at-escalate"></span> {{ i18n.isAr() ? 'يتطلب تصعيد' : 'Requires Escalation' }}</span>
                <span class="at-legend-item"><span class="at-box at-blocked"></span> {{ i18n.isAr() ? 'محظور' : 'Blocked' }}</span>
              </div>
            </div>
            <div class="empty-state" *ngIf="authorityMatrix.length === 0"><i class="pi pi-th-large empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد بيانات مصفوفة' : 'No authority matrix data. Create delegations to populate.' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'الحدود' : 'Thresholds'">
            <div class="thresholds-section">
              <div class="threshold-card" *ngFor="let t of thresholdLadder">
                <div class="threshold-level">{{ t.level }}</div>
                <div class="threshold-body">
                  <strong>{{ t.authority_type }}</strong>
                  <span class="threshold-range">{{ t.min | number }} – {{ t.max ? (t.max | number) : '∞' }}</span>
                </div>
                <div class="threshold-approver">{{ t.approver || '—' }}</div>
              </div>
              <div class="empty-state" *ngIf="thresholdLadder.length === 0"><i class="pi pi-chart-bar empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد حدود محددة' : 'No approval thresholds defined' }}</p></div>
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'المنتهية' : 'Expiring'">
            <div class="expiring-list">
              <div class="expiring-card" *ngFor="let d of expiringDelegations">
                <div class="exp-icon"><i class="pi pi-clock" [style.color]="isExpired(d) ? 'var(--error)' : 'var(--warning)'"></i></div>
                <div class="exp-body">
                  <strong>{{ d.authority_type }}</strong>
                  <span>{{ d.delegator_user_id }} → {{ d.delegate_user_id }}</span>
                  <span class="exp-date">{{ i18n.isAr() ? 'ينتهي' : 'Expires' }}: {{ d.expiry_date | appDate:'medium' }}</span>
                </div>
                <p-tag [value]="isExpired(d) ? (i18n.isAr() ? 'منتهي' : 'Expired') : (i18n.isAr() ? 'قريباً' : 'Expiring')"
                       [severity]="isExpired(d) ? 'danger' : 'warning'" />
              </div>
              <div class="empty-state" *ngIf="expiringDelegations.length === 0"><i class="pi pi-check-circle empty-icon" style="color:var(--success)"></i><p>{{ i18n.isAr() ? 'لا توجد تفويضات منتهية' : 'No expiring delegations' }}</p></div>
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'التعارضات' : 'Conflicts'">
            <div class="conflicts-section">
              <div class="conflict-card" *ngFor="let c of authorityConflicts">
                <div class="conflict-icon"><i class="pi pi-ban" style="color:var(--error)"></i></div>
                <div class="conflict-body">
                  <strong>{{ c.user }}</strong>
                  <span>{{ c.conflict_type }}: {{ c.authority1 }} + {{ c.authority2 }}</span>
                  <span class="conflict-scope">{{ c.scope }}</span>
                </div>
                <p-tag [value]="c.severity" [severity]="c.severity === 'critical' ? 'danger' : 'warning'" />
              </div>
              <div class="empty-state" *ngIf="authorityConflicts.length === 0"><i class="pi pi-check-circle empty-icon" style="color:var(--success)"></i><p>{{ i18n.isAr() ? 'لا توجد تعارضات في الصلاحيات' : 'No authority conflicts detected' }}</p></div>
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'روابط' : 'Cross-Links'">
            <div class="cross-links-grid">
              <a class="cross-link-card" routerLink="/governance/overview"><i class="pi pi-home"></i><span>{{ i18n.isAr() ? 'نظرة عامة' : 'Overview' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/raci"><i class="pi pi-table"></i><span>{{ i18n.isAr() ? 'RACI' : 'RACI Matrix' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/structure"><i class="pi pi-sitemap"></i><span>{{ i18n.isAr() ? 'الهيكل' : 'Structure' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/exceptions"><i class="pi pi-exclamation-triangle"></i><span>{{ i18n.isAr() ? 'الاستثناءات' : 'Exceptions' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/decisions"><i class="pi pi-check-square"></i><span>{{ i18n.isAr() ? 'القرارات' : 'Decisions' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/policies"><i class="pi pi-file"></i><span>{{ i18n.isAr() ? 'السياسات' : 'Policies' }}</span></a>
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>
    </div>
    <p-dialog [header]="editMode ? (i18n.isAr() ? 'تعديل' : 'Edit') : (i18n.isAr() ? 'إضافة تفويض' : 'Add Delegation')" [(visible)]="showDialog" [modal]="true" [style]="{width:'520px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Authority Type</label><input pInputText [(ngModel)]="form.authority_type" class="w-full" /></div>
        <div class="field-row">
          <div class="field"><label>Delegator User ID</label><input pInputText [(ngModel)]="form.delegator_user_id" class="w-full" /></div>
          <div class="field"><label>Delegate User ID</label><input pInputText [(ngModel)]="form.delegate_user_id" class="w-full" /></div>
        </div>
        <div class="field"><label>Scope</label><textarea pInputTextarea [(ngModel)]="form.scope_description" rows="2" class="w-full"></textarea></div>
        <div class="field-row">
          <div class="field"><label>Max Amount</label><input pInputText type="number" [(ngModel)]="form.max_amount" class="w-full" /></div>
          <div class="field"><label>Expiry Date</label><input pInputText type="date" [(ngModel)]="form.expiry_date" class="w-full" /></div>
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
    :host-context([dir="rtl"]) .table-shell th, :host-context([dir="rtl"]) .table-shell td { text-align: right; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); } .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .action-btns { display: flex; gap: 4px; } .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; } .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } .w-full { width: 100%; }
    .expiring-row { background: #fffbeb; } .expired-row { background: var(--status-danger-bg, #fff1f1); }
    .expiry-badge { display: inline-block; font-size: var(--font-size-xs); padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 4px; }
    .expiry-badge.expired { background: #fee2e2; color: var(--error); } .expiry-badge.soon { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .matrix-wrapper { overflow-x: auto; }
    .authority-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .authority-table th, .authority-table td { border: 1px solid var(--surface-border, var(--border-subtle)); padding: 8px 12px; text-align: center; }
    .authority-table th { background: var(--surface-100, var(--surface-ice)); font-weight: 600; font-size: var(--font-size-sm); }
    .at-type-col { text-align: start; min-width: 160px; } .at-type-cell { text-align: start; }
    .at-tier-col { min-width: 100px; }
    .at-approved { background: #dcfce7; color: #166534; font-weight: 600; }
    .at-escalate { background: var(--status-warning-bg, #fcf4d6); color: #854d0e; font-weight: 600; }
    .at-blocked { background: #fee2e2; color: #991b1b; font-weight: 600; }
    .at-none { color: var(--text-muted, #9ca3af); }
    .at-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; font-size: var(--font-size-sm); }
    .at-legend-item { display: flex; align-items: center; gap: 6px; }
    .at-box { display: inline-block; width: 20px; height: 14px; border-radius: var(--radius-xs); }
    .at-box.at-approved { background: #dcfce7; } .at-box.at-escalate { background: var(--status-warning-bg, #fcf4d6); } .at-box.at-blocked { background: #fee2e2; }
    .thresholds-section, .expiring-list, .conflicts-section { display: flex; flex-direction: column; gap: 10px; }
    .threshold-card { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); }
    .threshold-level { font-size: var(--font-size-xl); font-weight: 800; color: var(--primary-500, var(--primary)); min-width: 36px; text-align: center; }
    .threshold-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .threshold-range { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .threshold-approver { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, var(--text-heading)); }
    .expiring-card, .conflict-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); }
    .exp-icon, .conflict-icon { font-size: var(--font-size-xl); flex-shrink: 0; }
    .exp-body, .conflict-body { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-sm); }
    .exp-date { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .conflict-scope { font-size: var(--font-size-xs); color: var(--text-muted, #9ca3af); }
    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
  `]
})
export class GovernanceDelegationsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'Add Delegation', labelAr: 'إضافة تفويض', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }
  loading = true; items: Record<string, any>[] = []; filteredItems: Record<string, any>[] = []; searchTerm = ''; showDialog = false; editMode = false; editId = ''; form: Record<string, any> = {}; expiringCount = 0; activeCount = 0; conflictCount = 0;
  authorityMatrix: Record<string, any>[] = []; thresholdTiers: string[] = []; thresholdLadder: Record<string, any>[] = []; expiringDelegations: Record<string, any>[] = []; authorityConflicts: Record<string, any>[] = [];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/delegations').subscribe({ next: res => {
      this.items = res.delegations || [];
      this.activeCount = this.items.filter(i => i.status === 'active').length;
      this.filterList();
      this.computeAuthorityMatrix();
      this.computeThresholdLadder();
      this.computeExpiringDelegations();
      this.computeConflicts();
      this.loading = false;
    }, error: () => { this.loading = false; } });
    this.apiclientSvc.get('/governance/delegations/expiring?days=30').subscribe({ next: res => { this.expiringCount = res.count || res.delegations?.length || 0; } });
  }
  filterList(): void { const s = this.searchTerm.toLowerCase(); this.filteredItems = this.items.filter(i => !s || (i.authority_type || '').toLowerCase().includes(s)); }
  isExpiringSoon(item: Record<string, any>): boolean {
    if (!item.expiry_date) return false;
    const diff = new Date(item.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  }
  isExpired(item: Record<string, any>): boolean {
    if (!item.expiry_date) return false;
    return new Date(item.expiry_date).getTime() < Date.now();
  }
  computeAuthorityMatrix(): void {
    const tiers = new Set<string>();
    const map: Record<string, Record<string, string>> = {};
    for (const d of this.items) {
      const type = d.authority_type || 'General';
      const tier = d.max_amount ? (d.max_amount <= 10000 ? 'Tier 1 (≤10K)' : d.max_amount <= 100000 ? 'Tier 2 (≤100K)' : d.max_amount <= 1000000 ? 'Tier 3 (≤1M)' : 'Tier 4 (>1M)') : 'No Limit';
      tiers.add(tier);
      if (!map[type]) map[type] = {};
      map[type][tier] = d.status === 'active' ? 'approved' : d.status === 'revoked' ? 'blocked' : 'escalate';
    }
    this.thresholdTiers = [...tiers].sort();
    this.authorityMatrix = Object.entries(map).map(([authority_type, tierMap]) => ({ authority_type, tiers: tierMap }));
  }
  computeThresholdLadder(): void {
    const grouped: Record<string, GrcRecord[]> = {};
    for (const d of this.items.filter(i => i.max_amount)) {
      const type = d.authority_type || 'General';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(d);
    }
    const ladder: Record<string, any>[] = [];
    for (const [type, dels] of Object.entries(grouped)) {
      dels.sort((a: Record<string, any>, b: Record<string, any>) => (a.max_amount || 0) - (b.max_amount || 0));
      dels.forEach((d: Record<string, any>, i: number) => {
        ladder.push({ level: i + 1, authority_type: type, min: i === 0 ? 0 : dels[i - 1].max_amount, max: d.max_amount, approver: d.delegate_user_id });
      });
    }
    this.thresholdLadder = ladder;
  }
  computeExpiringDelegations(): void {
    const now = Date.now();
    const in60 = now + 60 * 86400000;
    this.expiringDelegations = this.items.filter(d => d.expiry_date && new Date(d.expiry_date).getTime() < in60).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  }
  computeConflicts(): void {
    const byUser: Record<string, GrcRecord[]> = {};
    for (const d of this.items.filter(i => i.status === 'active')) {
      const uid = d.delegate_user_id;
      if (!uid) continue;
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(d);
    }
    const conflicts: Record<string, any>[] = [];
    for (const [user, dels] of Object.entries(byUser)) {
      if (dels.length < 2) continue;
      for (let i = 0; i < dels.length; i++) {
        for (let j = i + 1; j < dels.length; j++) {
          if (dels[i].authority_type !== dels[j].authority_type) {
            conflicts.push({ user, conflict_type: 'Multi-authority', authority1: dels[i].authority_type, authority2: dels[j].authority_type, scope: dels[i].scope_description || 'Global', severity: 'high' });
          }
        }
      }
    }
    this.authorityConflicts = conflicts;
    this.conflictCount = conflicts.length;
  }
  openCreate(): void { this.editMode = false; this.form = { authority_type: '', delegator_user_id: '', delegate_user_id: '', scope_description: '', max_amount: null, expiry_date: '' }; this.showDialog = true; }
  openEdit(item: Record<string, any>): void { this.editMode = true; this.editId = item.delegation_id; this.form = { ...item }; this.showDialog = true; }
  save(): void {
    const obs = this.editMode ? this.apiclientSvc.put(`/governance/delegations/${this.editId}`, this.form) : this.apiclientSvc.post('/governance/delegations', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  revoke(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/delegations/${item.delegation_id}/revoke`, {}).subscribe({ next: () => this.load() }); }

}
