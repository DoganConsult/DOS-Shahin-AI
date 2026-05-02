import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { TabViewModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-raci',
    imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, TooltipModule, ToastModule, TabViewModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Roles, Accountability & RACI" titleAr="الأدوار والمساءلة و RACI" subtitleEn="RACI matrix, accountability gaps, and segregation of duties" subtitleAr="مصفوفة RACI وفجوات المساءلة وفصل المهام" icon="table"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','الحوكمة','RACI'] : ['Dashboard','Governance','RACI']" [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.isAr() ? 'القوالب' : 'Templates' }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--success)">{{ activeCount }}</div><div class="health-label">{{ i18n.isAr() ? 'نشط' : 'Active' }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ accountabilityGaps.length }}</div><div class="health-label">{{ i18n.isAr() ? 'فجوات المساءلة' : 'Accountability Gaps' }}</div></div>
          <div class="health-card"><div class="health-value" style="color:var(--error)">{{ sodConflicts.length }}</div><div class="health-label">{{ i18n.isAr() ? 'تعارضات SoD' : 'SoD Conflicts' }}</div></div>
        </div>

        <p-tabView>
          <p-tabPanel [header]="i18n.isAr() ? 'القوالب' : 'Templates'">
            <div class="page-toolbar">
              <div class="toolbar-primary">
                <p-button [label]="i18n.isAr() ? 'إضافة قالب' : 'Add Template'" icon="pi pi-plus" (onClick)="openCreate()" />
                <div class="search-wrap"><i class="pi pi-search search-icon"></i><input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.isAr() ? 'بحث...' : 'Search...'" [attr.aria-label]="i18n.isAr() ? 'بحث...' : 'Search...'" (input)="filterList()" class="search-input" /></div>
              </div>
              <div class="toolbar-secondary"><app-export-button module="governance-raci" [data]="filteredItems" /></div>
            </div>
            <div class="table-shell" *ngIf="filteredItems.length > 0">
              <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18n.isAr() ? 'الاسم' : 'Name' }}</th>
                  <th>{{ i18n.isAr() ? 'مجال العملية' : 'Process Area' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                  <th style="width:140px">{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-item><tr>
                  <td><strong>{{ i18n.isAr() ? item.name_ar || item.name_en : item.name_en }}</strong></td>
                  <td>{{ item.process_area || '—' }}</td>
                  <td><app-status-badge [status]="item.status || 'draft'" /></td>
                  <td><div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEdit(item)"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Activate" class="icon-btn" pTooltip="Activate" (click)="activate(item)" *ngIf="item.status !== 'active'"><i class="pi pi-check-circle"></i></button>
                    <button aria-label="Archive" class="icon-btn danger" pTooltip="Archive" (click)="archive(item)" *ngIf="item.status === 'active'"><i class="pi pi-box"></i></button>
                  </div></td>
                </tr></ng-template>
              </p-table>
            </div>
            <div class="empty-state" *ngIf="!loading && filteredItems.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد قوالب' : 'No RACI templates found' }}</p></div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isAr() ? 'مصفوفة RACI' : 'RACI Matrix'">
            <div class="raci-grid-wrapper">
              <div class="raci-grid" *ngIf="raciMatrix.length > 0">
                <table aria-label="Raci Table table" class="raci-table">
                  <thead>
                    <tr>
                      <th class="raci-process-col">{{ i18n.isAr() ? 'العملية / النشاط' : 'Process / Activity' }}</th>
                      <th *ngFor="let role of raciRoles" class="raci-role-col">{{ role }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of raciMatrix">
                      <td class="raci-process-cell">{{ row.activity }}</td>
                      <td *ngFor="let role of raciRoles" class="raci-cell" [ngClass]="'raci-' + (row.assignments[role] || 'none')">
                        {{ row.assignments[role] || '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="raci-legend">
                <span class="legend-item"><span class="legend-box raci-R"></span> R = {{ i18n.isAr() ? 'مسؤول' : 'Responsible' }}</span>
                <span class="legend-item"><span class="legend-box raci-A"></span> A = {{ i18n.isAr() ? 'مساءل' : 'Accountable' }}</span>
                <span class="legend-item"><span class="legend-box raci-C"></span> C = {{ i18n.isAr() ? 'مستشار' : 'Consulted' }}</span>
                <span class="legend-item"><span class="legend-box raci-I"></span> I = {{ i18n.isAr() ? 'مُبلّغ' : 'Informed' }}</span>
              </div>
              <div class="empty-state" *ngIf="raciMatrix.length === 0"><i class="pi pi-th-large empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد تكليفات في المصفوفة' : 'No RACI matrix data available' }}</p></div>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isAr() ? 'فجوات المساءلة' : 'Accountability Gaps'">
            <div class="gaps-section">
              <div class="gap-card" *ngFor="let gap of accountabilityGaps">
                <div class="gap-icon"><i class="pi pi-exclamation-triangle" style="color:#d97706"></i></div>
                <div class="gap-body">
                  <strong>{{ gap.entity_type }}: {{ gap.title }}</strong>
                  <span class="gap-detail">{{ i18n.isAr() ? 'بدون' : 'Missing' }}: {{ gap.missing_role }}</span>
                </div>
                <a class="gap-link" [routerLink]="gap.route">{{ i18n.isAr() ? 'إصلاح' : 'Fix' }} →</a>
              </div>
              <div class="empty-state" *ngIf="accountabilityGaps.length === 0"><i class="pi pi-check-circle empty-icon" style="color:var(--success)"></i><p>{{ i18n.isAr() ? 'لا توجد فجوات في المساءلة' : 'No accountability gaps found' }}</p></div>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isAr() ? 'تعارضات SoD' : 'SoD Conflicts'">
            <div class="sod-section">
              <div class="sod-card" *ngFor="let conflict of sodConflicts">
                <div class="sod-icon"><i class="pi pi-ban" style="color:var(--error)"></i></div>
                <div class="sod-body">
                  <strong>{{ conflict.user }}</strong>
                  <span class="sod-detail">{{ conflict.role1 }} + {{ conflict.role2 }} — {{ i18n.isAr() ? 'تعارض فصل المهام' : 'Segregation conflict' }}</span>
                  <span class="sod-scope">{{ i18n.isAr() ? 'النطاق' : 'Scope' }}: {{ conflict.scope }}</span>
                </div>
                <p-tag [value]="conflict.severity" [severity]="conflict.severity === 'critical' ? 'danger' : conflict.severity === 'high' ? 'danger' : 'warning'" />
              </div>
              <div class="empty-state" *ngIf="sodConflicts.length === 0"><i class="pi pi-check-circle empty-icon" style="color:var(--success)"></i><p>{{ i18n.isAr() ? 'لا توجد تعارضات فصل مهام' : 'No segregation of duty conflicts detected' }}</p></div>
            </div>
          </p-tabPanel>

          <p-tabPanel [header]="i18n.isAr() ? 'روابط المنصة' : 'Cross-Module Links'">
            <div class="cross-links-grid">
              <a class="cross-link-card" routerLink="/governance/overview"><i class="pi pi-home"></i><span>{{ i18n.isAr() ? 'نظرة عامة' : 'Overview' }}</span><small>{{ i18n.isAr() ? 'لوحة الحوكمة الرئيسية' : 'Governance dashboard' }}</small></a>
              <a class="cross-link-card" routerLink="/governance/policies"><i class="pi pi-file"></i><span>{{ i18n.isAr() ? 'السياسات' : 'Policies' }}</span><small>{{ i18n.isAr() ? 'مالكو السياسات' : 'Policy owners' }}</small></a>
              <a class="cross-link-card" routerLink="/risk"><i class="pi pi-shield"></i><span>{{ i18n.isAr() ? 'المخاطر' : 'Risk' }}</span><small>{{ i18n.isAr() ? 'مالكو المخاطر' : 'Risk owners' }}</small></a>
              <a class="cross-link-card" routerLink="/compliance/controls"><i class="pi pi-lock"></i><span>{{ i18n.isAr() ? 'الضوابط' : 'Controls' }}</span><small>{{ i18n.isAr() ? 'مالكو الضوابط' : 'Control owners' }}</small></a>
              <a class="cross-link-card" routerLink="/governance/delegations"><i class="pi pi-share-alt"></i><span>{{ i18n.isAr() ? 'التفويضات' : 'Delegations' }}</span><small>{{ i18n.isAr() ? 'تفويض الصلاحيات' : 'Authority delegations' }}</small></a>
              <a class="cross-link-card" routerLink="/governance/structure"><i class="pi pi-sitemap"></i><span>{{ i18n.isAr() ? 'الهيكل' : 'Structure' }}</span><small>{{ i18n.isAr() ? 'الهيكل التنظيمي' : 'Org structure' }}</small></a>
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>
    </div>
    <p-dialog [header]="editMode ? (i18n.isAr() ? 'تعديل' : 'Edit Template') : (i18n.isAr() ? 'إضافة قالب' : 'Add Template')" [(visible)]="showDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Name (EN)</label><input pInputText [(ngModel)]="form.name_en" class="w-full" /></div>
        <div class="field"><label>Name (AR)</label><input pInputText [(ngModel)]="form.name_ar" class="w-full" /></div>
        <div class="field"><label>Process Area</label><input pInputText [(ngModel)]="form.process_area" class="w-full" /></div>
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
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 8px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; } .toolbar-secondary { display: flex; align-items: center; gap: 8px; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; } .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; } .search-input { min-width: 200px; padding-inline-start: 32px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    :host-context([dir="rtl"]) .table-shell th, :host-context([dir="rtl"]) .table-shell td { text-align: right; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); } .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .action-btns { display: flex; gap: 4px; } .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; } .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .w-full { width: 100%; }

    .raci-grid-wrapper { overflow-x: auto; }
    .raci-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .raci-table th, .raci-table td { border: 1px solid var(--surface-border, var(--border-subtle)); padding: 8px 12px; text-align: center; }
    .raci-table th { background: var(--surface-100, var(--surface-ice)); font-weight: 600; font-size: var(--font-size-sm); }
    .raci-process-col { text-align: start; min-width: 200px; }
    .raci-process-cell { text-align: start; font-weight: 500; }
    .raci-role-col { min-width: 80px; }
    .raci-cell { font-weight: 700; font-size: var(--font-size-base); }
    .raci-R { background: #dcfce7; color: #166534; }
    .raci-A { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .raci-C { background: #fef9c3; color: #854d0e; }
    .raci-I { background: #dbeafe; color: #1e40af; }
    .raci-none { color: transparent; }
    .raci-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; font-size: var(--font-size-sm); }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-box { display: inline-block; width: 20px; height: 14px; border-radius: var(--radius-xs); }
    .legend-box.raci-R { background: #dcfce7; } .legend-box.raci-A { background: var(--status-danger-bg, #fff1f1); } .legend-box.raci-C { background: #fef9c3; } .legend-box.raci-I { background: #dbeafe; }

    .gaps-section, .sod-section { display: flex; flex-direction: column; gap: 10px; }
    .gap-card, .sod-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); }
    .gap-icon, .sod-icon { font-size: var(--font-size-xl); flex-shrink: 0; }
    .gap-body, .sod-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .gap-detail, .sod-detail { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .sod-scope { font-size: var(--font-size-xs); color: var(--text-muted, #9ca3af); }
    .gap-link { font-size: var(--font-size-sm); font-weight: 600; color: var(--primary-500, var(--primary)); text-decoration: none; white-space: nowrap; }
    .gap-link:hover { text-decoration: underline; }

    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); margin-bottom: 4px; }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
  `]
})
export class GovernanceRaciComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'Add Template', labelAr: 'إضافة قالب', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }
  loading = true; items: Record<string, any>[] = []; filteredItems: Record<string, any>[] = []; searchTerm = ''; showDialog = false; editMode = false; editId = ''; form: Record<string, any> = {};
  activeCount = 0;

  raciMatrix: { activity: string; assignments: Record<string, string> }[] = [];
  raciRoles: string[] = [];
  accountabilityGaps: { entity_type: string; title: string; missing_role: string; route: string }[] = [];
  sodConflicts: { user: string; role1: string; role2: string; scope: string; severity: string }[] = [];

  ngOnInit(): void { this.load(); this.loadRaciMatrix(); this.loadAccountabilityGaps(); this.loadSodConflicts(); }
  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/raci').subscribe({ next: res => { this.items = res.templates || []; this.activeCount = this.items.filter(i => i.status === 'active').length; this.filterList(); this.loading = false; }, error: () => { this.loading = false; } });
  }
  loadRaciMatrix(): void {
    this.apiclientSvc.get('/governance/raci/matrix').subscribe({
      next: (res: Record<string, any>) => {
        this.raciMatrix = res.matrix || [];
        this.raciRoles = res.roles || [];
      },
      error: () => {
        this.raciRoles = ['Board', 'CEO', 'CRO', 'CISO', 'Compliance', 'Legal', 'Audit', 'IT'];
        this.raciMatrix = [
          { activity: 'Policy Approval', assignments: { 'Board': 'A', 'CEO': 'R', 'Compliance': 'C', 'Legal': 'C', 'CISO': 'I' } },
          { activity: 'Risk Assessment', assignments: { 'CRO': 'A', 'CISO': 'R', 'Compliance': 'C', 'Board': 'I', 'IT': 'C' } },
          { activity: 'Control Testing', assignments: { 'Compliance': 'A', 'CISO': 'R', 'Audit': 'C', 'CRO': 'I' } },
          { activity: 'Incident Response', assignments: { 'CISO': 'A', 'IT': 'R', 'CEO': 'I', 'Board': 'I', 'Legal': 'C' } },
          { activity: 'Audit Planning', assignments: { 'Audit': 'A', 'Board': 'I', 'Compliance': 'C', 'CRO': 'C' } },
          { activity: 'Exception Approval', assignments: { 'CRO': 'A', 'CISO': 'R', 'Compliance': 'C', 'Board': 'I' } },
          { activity: 'Board Reporting', assignments: { 'Board': 'A', 'CEO': 'R', 'CRO': 'C', 'Compliance': 'C', 'Audit': 'I' } },
        ];
      },
    });
  }
  loadAccountabilityGaps(): void {
    this.apiclientSvc.get('/governance/raci/accountability-gaps').subscribe({
      next: (res: Record<string, any>) => { this.accountabilityGaps = res.gaps || []; },
      error: () => { this.accountabilityGaps = []; },
    });
  }
  loadSodConflicts(): void {
    this.apiclientSvc.get('/governance/raci/sod-conflicts').subscribe({
      next: (res: Record<string, any>) => { this.sodConflicts = res.conflicts || []; },
      error: () => { this.sodConflicts = []; },
    });
  }
  filterList(): void { const s = this.searchTerm.toLowerCase(); this.filteredItems = this.items.filter(i => !s || (i.name_en || '').toLowerCase().includes(s) || (i.name_ar || '').toLowerCase().includes(s)); }
  openCreate(): void { this.editMode = false; this.form = { name_en: '', name_ar: '', process_area: '' }; this.showDialog = true; }
  openEdit(item: Record<string, any>): void { this.editMode = true; this.editId = item.template_id; this.form = { ...item }; this.showDialog = true; }
  save(): void {
    const obs = this.editMode ? this.apiclientSvc.put(`/governance/raci/${this.editId}`, this.form) : this.apiclientSvc.post('/governance/raci', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  activate(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/raci/${item.template_id}/activate`, {}).subscribe({ next: () => this.load() }); }
  archive(item: Record<string, any>): void { this.apiclientSvc.post(`/governance/raci/${item.template_id}/archive`, {}).subscribe({ next: () => this.load() }); }

}
