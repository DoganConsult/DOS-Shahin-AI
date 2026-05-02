import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-structure',
    imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, TabViewModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Structure" titleAr="الهيكل التنظيمي" subtitleEn="Governance domains, bodies and reporting lines" subtitleAr="نطاقات الحوكمة والهيئات وخطوط التقارير" icon="sitemap"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','الحوكمة','الهيكل'] : ['Dashboard','Governance','Structure']" [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <div class="gov-body">
        <p-toast />
        <p-tabView>
          <p-tabPanel [header]="i18n.isAr() ? 'النطاقات' : 'Domains'">
            <div class="page-toolbar">
              <p-button [label]="i18n.isAr() ? 'إضافة نطاق' : 'Add Domain'" icon="pi pi-plus" (onClick)="openCreateDomain()" />
            </div>
            <div class="table-shell" *ngIf="domains.length > 0">
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Domains table" [value]="domains" styleClass="p-datatable-striped p-datatable-sm">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18n.isAr() ? 'الاسم' : 'Name' }}</th>
                  <th>{{ i18n.isAr() ? 'الوصف' : 'Description' }}</th>
                  <th style="width:100px">{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-item><tr>
                  <td><strong>{{ i18n.isAr() ? item.name_ar || item.name_en : item.name_en }}</strong></td>
                  <td>{{ item.description || '—' }}</td>
                  <td><div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEditDomain(item)"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteDomain(item)"><i class="pi pi-trash"></i></button>
                  </div></td>
                </tr></ng-template>
              </p-table>
            </div>
            <div class="empty-state" *ngIf="domains.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد نطاقات' : 'No domains' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'الكيانات القانونية' : 'Legal Entities'">
            <div class="page-toolbar">
              <p-button [label]="i18n.isAr() ? 'إضافة كيان' : 'Add Entity'" icon="pi pi-plus" (onClick)="openCreateEntity()" />
            </div>
            <div class="table-shell" *ngIf="legalEntities.length > 0">
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Legal Entities table" [value]="legalEntities" styleClass="p-datatable-striped p-datatable-sm">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18n.isAr() ? 'الاسم' : 'Name' }}</th>
                  <th>{{ i18n.isAr() ? 'النوع' : 'Type' }}</th>
                  <th>{{ i18n.isAr() ? 'المالك' : 'Owner' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                  <th style="width:100px">{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-item><tr>
                  <td><strong>{{ i18n.isAr() ? item.name_ar || item.name_en : item.name_en }}</strong></td>
                  <td><p-tag [value]="item.entity_type || 'subsidiary'" severity="info" /></td>
                  <td>{{ item.owner || '—' }}</td>
                  <td><app-status-badge [status]="item.status || 'active'" /></td>
                  <td><div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEditEntity(item)"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteEntity(item)"><i class="pi pi-trash"></i></button>
                  </div></td>
                </tr></ng-template>
              </p-table>
            </div>
            <div class="empty-state" *ngIf="legalEntities.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد كيانات' : 'No legal entities' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'الهيئات' : 'Bodies'">
            <div class="page-toolbar">
              <p-button [label]="i18n.isAr() ? 'إضافة هيئة' : 'Add Body'" icon="pi pi-plus" (onClick)="openCreateBody()" />
            </div>
            <div class="table-shell" *ngIf="bodies.length > 0">
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Bodies table" [value]="bodies" styleClass="p-datatable-striped p-datatable-sm">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18n.isAr() ? 'الاسم' : 'Name' }}</th>
                  <th>{{ i18n.isAr() ? 'النوع' : 'Type' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                  <th style="width:100px">{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-item><tr>
                  <td><strong>{{ i18n.isAr() ? item.name_ar || item.name_en : item.name_en }}</strong></td>
                  <td><p-tag [value]="item.body_type" severity="info" /></td>
                  <td><app-status-badge [status]="item.status" /></td>
                  <td><div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEditBody(item)"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteBody(item)"><i class="pi pi-trash"></i></button>
                  </div></td>
                </tr></ng-template>
              </p-table>
            </div>
            <div class="empty-state" *ngIf="bodies.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد هيئات' : 'No bodies' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'الإدارات' : 'Departments'">
            <div class="page-toolbar">
              <p-button [label]="i18n.isAr() ? 'إضافة إدارة' : 'Add Department'" icon="pi pi-plus" (onClick)="openCreateDept()" />
            </div>
            <div class="table-shell" *ngIf="departments.length > 0">
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Departments table" [value]="departments" styleClass="p-datatable-striped p-datatable-sm">
                <ng-template pTemplate="header"><tr>
                  <th>{{ i18n.isAr() ? 'الاسم' : 'Name' }}</th>
                  <th>{{ i18n.isAr() ? 'رئيس الإدارة' : 'Head' }}</th>
                  <th>{{ i18n.isAr() ? 'الكيان' : 'Entity' }}</th>
                  <th>{{ i18n.isAr() ? 'الوظيفة' : 'Function' }}</th>
                  <th style="width:100px">{{ i18n.isAr() ? 'إجراءات' : 'Actions' }}</th>
                </tr></ng-template>
                <ng-template pTemplate="body" let-item><tr>
                  <td><strong>{{ i18n.isAr() ? item.name_ar || item.name_en : item.name_en }}</strong></td>
                  <td>{{ item.head || '—' }}<span *ngIf="!item.head" class="orphan-flag">{{ i18n.isAr() ? 'بدون رئيس' : 'No head' }}</span></td>
                  <td>{{ item.entity_name || '—' }}</td>
                  <td>{{ item.function_area || '—' }}</td>
                  <td><div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" pTooltip="Edit" (click)="openEditDept(item)"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Delete" class="icon-btn danger" pTooltip="Delete" (click)="deleteDept(item)"><i class="pi pi-trash"></i></button>
                  </div></td>
                </tr></ng-template>
              </p-table>
            </div>
            <div class="empty-state" *ngIf="departments.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد إدارات' : 'No departments' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'خطوط التقارير' : 'Reporting Lines'">
            <div class="page-toolbar">
              <p-button [label]="i18n.isAr() ? 'إضافة خط تقرير' : 'Add Reporting Line'" icon="pi pi-plus" (onClick)="openCreateReportingLine()" />
            </div>
            <div class="reporting-tree" *ngIf="reportingLines.length > 0">
              <div class="reporting-line-card" *ngFor="let rl of reportingLines">
                <div class="rl-from">
                  <i class="pi pi-user"></i>
                  <span>{{ rl.child_name || rl.child_id }}</span>
                  <p-tag [value]="rl.child_type || 'unit'" severity="info" [style]="{fontSize:'10px'}" />
                </div>
                <div class="rl-arrow"><i class="pi pi-arrow-right"></i></div>
                <div class="rl-to">
                  <i class="pi pi-sitemap"></i>
                  <span>{{ rl.parent_name || rl.parent_id }}</span>
                  <p-tag [value]="rl.parent_type || 'unit'" severity="info" [style]="{fontSize:'10px'}" />
                </div>
                <div class="rl-type"><p-tag [value]="rl.line_type || 'solid'" [severity]="rl.line_type === 'dotted' ? 'warning' : 'success'" /></div>
                <button aria-label="Remove" class="icon-btn danger" pTooltip="Remove" (click)="deleteReportingLine(rl)"><i class="pi pi-trash"></i></button>
              </div>
            </div>
            <div class="empty-state" *ngIf="reportingLines.length === 0"><i class="pi pi-sitemap empty-icon"></i><p>{{ i18n.isAr() ? 'لا توجد خطوط تقارير' : 'No reporting lines defined' }}</p></div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'تنبيهات' : 'Orphan Alerts'">
            <div class="orphan-section">
              <div class="orphan-card" *ngFor="let alert of orphanAlerts">
                <div class="orphan-icon"><i class="pi pi-exclamation-triangle" style="color:#d97706"></i></div>
                <div class="orphan-body">
                  <strong>{{ alert.entity_type }}: {{ alert.name }}</strong>
                  <span class="orphan-detail">{{ i18n.isAr() ? alert.issueAr : alert.issueEn }}</span>
                </div>
                <a class="orphan-link" [routerLink]="alert.route">{{ i18n.isAr() ? 'إصلاح' : 'Fix' }} →</a>
              </div>
              <div class="empty-state" *ngIf="orphanAlerts.length === 0"><i class="pi pi-check-circle empty-icon" style="color:var(--success)"></i><p>{{ i18n.isAr() ? 'لا توجد تنبيهات - الهيكل سليم' : 'No orphan alerts - structure is healthy' }}</p></div>
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.isAr() ? 'روابط' : 'Cross-Links'">
            <div class="cross-links-grid">
              <a class="cross-link-card" routerLink="/governance/overview"><i class="pi pi-home"></i><span>{{ i18n.isAr() ? 'نظرة عامة' : 'Overview' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/raci"><i class="pi pi-table"></i><span>{{ i18n.isAr() ? 'RACI' : 'RACI Matrix' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/delegations"><i class="pi pi-share-alt"></i><span>{{ i18n.isAr() ? 'التفويضات' : 'Delegations' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/committees"><i class="pi pi-users"></i><span>{{ i18n.isAr() ? 'اللجان' : 'Committees' }}</span></a>
              <a class="cross-link-card" routerLink="/governance/policies"><i class="pi pi-file"></i><span>{{ i18n.isAr() ? 'السياسات' : 'Policies' }}</span></a>
              <a class="cross-link-card" routerLink="/risk"><i class="pi pi-shield"></i><span>{{ i18n.isAr() ? 'المخاطر' : 'Risk' }}</span></a>
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>
    </div>
    <p-dialog [header]="domainEditMode ? 'Edit Domain' : 'Add Domain'" [(visible)]="showDomainDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Name (EN)</label><input pInputText [(ngModel)]="domainForm.name_en" class="w-full" /></div>
        <div class="field"><label>Name (AR)</label><input pInputText [(ngModel)]="domainForm.name_ar" class="w-full" /></div>
        <div class="field"><label>Description</label><textarea pInputTextarea [(ngModel)]="domainForm.description" rows="2" class="w-full"></textarea></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showDomainDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveDomain()" />
      </ng-template>
    </p-dialog>
    <p-dialog [header]="bodyEditMode ? 'Edit Body' : 'Add Body'" [(visible)]="showBodyDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Name (EN)</label><input pInputText [(ngModel)]="bodyForm.name_en" class="w-full" /></div>
        <div class="field"><label>Name (AR)</label><input pInputText [(ngModel)]="bodyForm.name_ar" class="w-full" /></div>
        <div class="field"><label>Type</label><p-dropdown [options]="bodyTypeOptions" [(ngModel)]="bodyForm.body_type" optionLabel="label" optionValue="value" class="w-full" /></div>
        <div class="field"><label>Description</label><textarea pInputTextarea [(ngModel)]="bodyForm.description" rows="2" class="w-full"></textarea></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showBodyDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveBody()" />
      </ng-template>
    </p-dialog>
    <p-dialog [header]="entityEditMode ? 'Edit Entity' : 'Add Legal Entity'" [(visible)]="showEntityDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Name (EN)</label><input pInputText [(ngModel)]="entityForm.name_en" class="w-full" /></div>
        <div class="field"><label>Name (AR)</label><input pInputText [(ngModel)]="entityForm.name_ar" class="w-full" /></div>
        <div class="field"><label>Entity Type</label><p-dropdown [options]="entityTypeOptions" [(ngModel)]="entityForm.entity_type" optionLabel="label" optionValue="value" class="w-full" /></div>
        <div class="field"><label>Owner</label><input pInputText [(ngModel)]="entityForm.owner" class="w-full" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showEntityDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveEntity()" [disabled]="!entityForm.name_en || !entityForm.owner" />
      </ng-template>
    </p-dialog>
    <p-dialog [header]="deptEditMode ? 'Edit Department' : 'Add Department'" [(visible)]="showDeptDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Name (EN)</label><input pInputText [(ngModel)]="deptForm.name_en" class="w-full" /></div>
        <div class="field"><label>Name (AR)</label><input pInputText [(ngModel)]="deptForm.name_ar" class="w-full" /></div>
        <div class="field"><label>Head</label><input pInputText [(ngModel)]="deptForm.head" class="w-full" /></div>
        <div class="field"><label>Entity</label><input pInputText [(ngModel)]="deptForm.entity_name" class="w-full" /></div>
        <div class="field"><label>Function Area</label><input pInputText [(ngModel)]="deptForm.function_area" class="w-full" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showDeptDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveDept()" [disabled]="!deptForm.name_en" />
      </ng-template>
    </p-dialog>
    <p-dialog header="Add Reporting Line" [(visible)]="showRLDialog" [modal]="true" [style]="{width:'520px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Child Name</label><input pInputText [(ngModel)]="rlForm.child_name" class="w-full" /></div>
        <div class="field"><label>Child Type</label><p-dropdown [options]="rlTypeOptions" [(ngModel)]="rlForm.child_type" optionLabel="label" optionValue="value" class="w-full" /></div>
        <div class="field"><label>Parent Name</label><input pInputText [(ngModel)]="rlForm.parent_name" class="w-full" /></div>
        <div class="field"><label>Parent Type</label><p-dropdown [options]="rlTypeOptions" [(ngModel)]="rlForm.parent_type" optionLabel="label" optionValue="value" class="w-full" /></div>
        <div class="field"><label>Line Type</label><p-dropdown [options]="lineTypeOptions" [(ngModel)]="rlForm.line_type" optionLabel="label" optionValue="value" class="w-full" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showRLDialog=false" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveReportingLine()" [disabled]="!rlForm.child_name || !rlForm.parent_name" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .gov-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .page-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    :host-context([dir="rtl"]) .table-shell th, :host-context([dir="rtl"]) .table-shell td { text-align: right; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); } .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .action-btns { display: flex; gap: 4px; } .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; } .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .w-full { width: 100%; }
    .orphan-flag { display: inline-block; margin-inline-start: 6px; font-size: var(--font-size-xs); color: var(--error); background: #fee2e2; padding: 1px 6px; border-radius: var(--radius-xs); }
    .reporting-tree { display: flex; flex-direction: column; gap: 8px; }
    .reporting-line-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); }
    .rl-from, .rl-to { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); font-weight: 500; }
    .rl-arrow { color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); }
    .rl-type { margin-inline-start: auto; }
    .orphan-section { display: flex; flex-direction: column; gap: 10px; }
    .orphan-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); }
    .orphan-icon { font-size: var(--font-size-xl); flex-shrink: 0; }
    .orphan-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .orphan-detail { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .orphan-link { font-size: var(--font-size-sm); font-weight: 600; color: var(--primary-500, var(--primary)); text-decoration: none; white-space: nowrap; }
    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
  `]
})
export class GovernanceStructureComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [];
  onHeaderAction(_: string): void {}
  bodyTypeOptions = [{ label: 'Board', value: 'board' }, { label: 'Committee', value: 'committee' }, { label: 'Subcommittee', value: 'subcommittee' }, { label: 'Working Group', value: 'working_group' }, { label: 'Council', value: 'council' }];
  domains: Record<string, any>[] = []; bodies: Record<string, any>[] = []; legalEntities: Record<string, any>[] = []; departments: Record<string, any>[] = []; reportingLines: Record<string, any>[] = []; orphanAlerts: Record<string, any>[] = [];
  showDomainDialog = false; domainEditMode = false; domainEditId = ''; domainForm: Record<string, any> = {};
  showBodyDialog = false; bodyEditMode = false; bodyEditId = ''; bodyForm: Record<string, any> = {};
  showEntityDialog = false; entityEditMode = false; entityEditId = ''; entityForm: Record<string, any> = {};
  entityTypeOptions = [{ label: 'Holding', value: 'holding' }, { label: 'Subsidiary', value: 'subsidiary' }, { label: 'Branch', value: 'branch' }, { label: 'Joint Venture', value: 'joint_venture' }];
  showDeptDialog = false; deptEditMode = false; deptEditId = ''; deptForm: Record<string, any> = {};
  showRLDialog = false; rlForm: Record<string, any> = {};
  rlTypeOptions = [{ label: 'Entity', value: 'entity' }, { label: 'Department', value: 'department' }, { label: 'Function', value: 'function' }, { label: 'Committee', value: 'committee' }, { label: 'Unit', value: 'unit' }];
  lineTypeOptions = [{ label: 'Solid (direct)', value: 'solid' }, { label: 'Dotted (functional)', value: 'dotted' }];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.apiclientSvc.get('/governance/structure/domains').subscribe({ next: res => { this.domains = res.domains || []; this.computeOrphanAlerts(); } });
    this.apiclientSvc.get('/governance/structure/bodies').subscribe({ next: res => { this.bodies = res.bodies || []; this.computeOrphanAlerts(); } });
    this.apiclientSvc.get('/governance/structure/legal-entities').subscribe({ next: res => { this.legalEntities = res.entities || res || []; this.computeOrphanAlerts(); }, error: () => { this.legalEntities = []; } });
    this.apiclientSvc.get('/governance/structure/departments').subscribe({ next: res => { this.departments = res.departments || res || []; this.computeOrphanAlerts(); }, error: () => { this.departments = []; } });
    this.apiclientSvc.get('/governance/structure/reporting-lines').subscribe({ next: res => { this.reportingLines = res.lines || res || []; }, error: () => { this.reportingLines = []; } });
  }
  computeOrphanAlerts(): void {
    const alerts: Record<string, any>[] = [];
    for (const e of this.legalEntities) { if (!e.owner) alerts.push({ entity_type: 'Entity', name: e.name_en || e.name_ar, issueEn: 'Missing accountable owner', issueAr: 'بدون مالك مسؤول', route: '/governance/structure' }); }
    for (const d of this.domains) { if (!d.sponsor && !d.owner) alerts.push({ entity_type: 'Domain', name: d.name_en || d.name_ar, issueEn: 'Missing sponsor', issueAr: 'بدون راعٍ', route: '/governance/structure' }); }
    for (const b of this.bodies) { if (!b.charter_id && !b.charter_text) alerts.push({ entity_type: 'Body', name: b.name_en || b.name_ar, issueEn: 'No charter linked', issueAr: 'لا يوجد ميثاق مرتبط', route: '/governance/charters' }); }
    for (const dept of this.departments) { if (!dept.head) alerts.push({ entity_type: 'Department', name: dept.name_en || dept.name_ar, issueEn: 'No department head assigned', issueAr: 'لا يوجد رئيس إدارة', route: '/governance/structure' }); }
    this.orphanAlerts = alerts;
  }
  openCreateDomain(): void { this.domainEditMode = false; this.domainForm = { name_en: '', name_ar: '', description: '' }; this.showDomainDialog = true; }
  openEditDomain(d: Record<string, any>): void { this.domainEditMode = true; this.domainEditId = d.domain_id; this.domainForm = { ...d }; this.showDomainDialog = true; }
  saveDomain(): void {
    const obs = this.domainEditMode ? this.apiclientSvc.put(`/governance/structure/domains/${this.domainEditId}`, this.domainForm) : this.apiclientSvc.post('/governance/structure/domains', this.domainForm);
    obs.subscribe({ next: () => { this.showDomainDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.saved') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  deleteDomain(d: Record<string, any>): void { this.apiclientSvc.del(`/governance/structure/domains/${d.domain_id}`).subscribe({ next: () => this.load() }); }
  openCreateBody(): void { this.bodyEditMode = false; this.bodyForm = { name_en: '', name_ar: '', body_type: 'committee', description: '' }; this.showBodyDialog = true; }
  openEditBody(b: Record<string, any>): void { this.bodyEditMode = true; this.bodyEditId = b.body_id; this.bodyForm = { ...b }; this.showBodyDialog = true; }
  saveBody(): void {
    const obs = this.bodyEditMode ? this.apiclientSvc.put(`/governance/structure/bodies/${this.bodyEditId}`, this.bodyForm) : this.apiclientSvc.post('/governance/structure/bodies', this.bodyForm);
    obs.subscribe({ next: () => { this.showBodyDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.saved') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  deleteBody(b: Record<string, any>): void { this.apiclientSvc.del(`/governance/structure/bodies/${b.body_id}`).subscribe({ next: () => this.load() }); }
  openCreateEntity(): void { this.entityEditMode = false; this.entityForm = { name_en: '', name_ar: '', entity_type: 'subsidiary', owner: '' }; this.showEntityDialog = true; }
  openEditEntity(e: Record<string, any>): void { this.entityEditMode = true; this.entityEditId = e.entity_id || e.id; this.entityForm = { ...e }; this.showEntityDialog = true; }
  saveEntity(): void {
    const obs = this.entityEditMode ? this.apiclientSvc.put(`/governance/structure/legal-entities/${this.entityEditId}`, this.entityForm) : this.apiclientSvc.post('/governance/structure/legal-entities', this.entityForm);
    obs.subscribe({ next: () => { this.showEntityDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.saved') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  deleteEntity(e: Record<string, any>): void { this.apiclientSvc.del(`/governance/structure/legal-entities/${e.entity_id || e.id}`).subscribe({ next: () => this.load() }); }
  openCreateDept(): void { this.deptEditMode = false; this.deptForm = { name_en: '', name_ar: '', head: '', entity_name: '', function_area: '' }; this.showDeptDialog = true; }
  openEditDept(d: Record<string, any>): void { this.deptEditMode = true; this.deptEditId = d.department_id || d.id; this.deptForm = { ...d }; this.showDeptDialog = true; }
  saveDept(): void {
    const obs = this.deptEditMode ? this.apiclientSvc.put(`/governance/structure/departments/${this.deptEditId}`, this.deptForm) : this.apiclientSvc.post('/governance/structure/departments', this.deptForm);
    obs.subscribe({ next: () => { this.showDeptDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.saved') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  deleteDept(d: Record<string, any>): void { this.apiclientSvc.del(`/governance/structure/departments/${d.department_id || d.id}`).subscribe({ next: () => this.load() }); }
  openCreateReportingLine(): void { this.rlForm = { child_name: '', child_type: 'department', parent_name: '', parent_type: 'entity', line_type: 'solid' }; this.showRLDialog = true; }
  saveReportingLine(): void {
    this.apiclientSvc.post('/governance/structure/reporting-lines', this.rlForm).subscribe({ next: () => { this.showRLDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.saved') }); }, error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') }) });
  }
  deleteReportingLine(rl: Record<string, any>): void { this.apiclientSvc.del(`/governance/structure/reporting-lines/${rl.line_id || rl.id}`).subscribe({ next: () => this.load() }); }

}
