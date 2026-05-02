import { Component, OnInit, inject, computed, ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
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
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-raci-templates',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="RACI Templates" titleAr="قوالب RACI"
        subtitleEn="Responsibility assignment matrix templates"
        subtitleAr="قوالب مصفوفة تعيين المسؤوليات"
        icon="th"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('RACI Templates')]"
        [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
      <p-toast />

      <div class="page-toolbar">
        <div class="toolbar-primary">
          <p-button [label]="i18n.translate('Create Template')" icon="pi pi-plus" (onClick)="openCreate()" />
        </div>
        <div class="toolbar-secondary">
          <app-export-button module="governance-raci" [data]="templates" />
        </div>
      </div>

      <div class="table-shell" *ngIf="templates.length > 0">
      <p-table aria-label="Templates table" [value]="templates" [paginator]="templates.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('Title') }}</th>
            <th>{{ i18n.translate('Description') }}</th>
            <th>{{ i18n.translate('Status') }}</th>
            <th>{{ i18n.translate('Assignments') }}</th>
            <th style="width:180px">{{ i18n.translate('Actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ i18n.localize(item.title_en, item.title_ar) }}</strong></td>
            <td>{{ (item.description || '').substring(0, 60) }}{{ (item.description || '').length > 60 ? '...' : '' }}</td>
            <td><app-status-badge [status]="item.status" /></td>
            <td>{{ item.assignment_count || 0 }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEdit(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="View Matrix" class="icon-btn" (click)="viewDetail(item)" pTooltip="View Matrix"><i class="pi pi-th-large"></i></button>
                <button aria-label="Activate" class="icon-btn" *ngIf="item.status === 'draft'" (click)="activateTemplate(item)" pTooltip="Activate"><i class="pi pi-check-circle"></i></button>
                <button aria-label="Archive" class="icon-btn" *ngIf="item.status === 'active'" (click)="archiveTemplate(item)" pTooltip="Archive"><i class="pi pi-box"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
      </div>

      <div *ngIf="templates.length === 0" class="empty-state">
        <i class="pi pi-th-large empty-icon"></i>
        <p>{{ i18n.translate('No RACI templates yet') }}</p>
        <p-button [label]="i18n.translate('Create Template')" icon="pi pi-plus" (onClick)="openCreate()" [outlined]="true" />
      </div>

      <!-- Template CRUD Dialog -->
      <p-dialog [header]="editMode ? (i18n.translate('Edit Template')) : (i18n.translate('Create Template'))"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'500px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ i18n.translate('Title (EN)') }}</label><input pInputText [(ngModel)]="form.title_en" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Title (AR)') }}</label><input pInputText [(ngModel)]="form.title_ar" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Description') }}</label><textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('Cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editMode ? (i18n.translate('Save')) : (i18n.translate('Create'))" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title_en" />
        </ng-template>
      </p-dialog>

      <!-- RACI Matrix Detail Dialog -->
      <p-dialog [header]="i18n.translate('RACI Matrix')" [(visible)]="showMatrixDialog" [modal]="true" [style]="{width:'700px'}">
        <div *ngIf="selectedTemplate">
          <p style="margin-bottom:12px"><strong>{{ selectedTemplate.title_en }}</strong></p>
          <div class="table-shell" *ngIf="matrixAssignments.length > 0">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Matrix Assignments table" [value]="matrixAssignments" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('Activity') }}</th>
                <th>{{ i18n.translate('Role') }}</th>
                <th>{{ i18n.translate('RACI Type') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-a>
              <tr>
                <td>{{ a.activity_name || a.activity_id }}</td>
                <td>{{ a.role_name || a.role_id }}</td>
                <td><p-tag [value]="a.raci_type"
                  [severity]="a.raci_type === 'R' ? 'success' : a.raci_type === 'A' ? 'danger' : a.raci_type === 'C' ? 'warning' : 'info'" /></td>
              </tr>
            </ng-template>
          </p-table>
          </div>
          <div *ngIf="matrixAssignments.length === 0" class="empty-state" style="padding:24px">
            <p>{{ i18n.translate('No assignments in this template') }}</p>
          </div>
        </div>
      </p-dialog>
      <!-- Cross-Module Links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="navigateTo('/governance/raci')"><i class="pi pi-table"></i> RACI Matrix</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/responsibilities')"><i class="pi pi-id-card"></i> Responsibilities</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/delegations')"><i class="pi pi-share-alt"></i> Delegations</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/structure')"><i class="pi pi-sitemap"></i> Structure</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/health')"><i class="pi pi-heart"></i> Health Score</button>
      </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .gov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; color: var(--text-muted, #9ca3af); display: block; }
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class GovernanceRaciTemplatesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);
  readonly dir  = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'Create Template', labelAr: 'إنشاء قالب', icon: 'plus', primary: true },
  ];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }

  templates: Record<string, any>[] = [];
  showDialog = false;
  editMode = false;
  editId = '';
  form: Record<string, any> = {};

  showMatrixDialog = false;
  selectedTemplate: Record<string, any> | null = null;
  matrixAssignments: Record<string, any>[] = [];

  ngOnInit(): void { this.loadTemplates(); }

  loadTemplates(): void {
    this.apiclientSvc.get('/governance/raci-templates').subscribe({
      next: (data: any) => { this.templates = data?.templates || []; },
      error: () => { this.templates = []; },
    });
  }

  openCreate(): void {
    this.editMode = false; this.editId = '';
    this.form = { title_en: '', title_ar: '', description: '' };
    this.showDialog = true;
  }

  openEdit(item: Record<string, any>): void {
    this.editMode = true; this.editId = item.template_id;
    this.form = { title_en: item.title_en, title_ar: item.title_ar || '', description: item.description || '' };
    this.showDialog = true;
  }

  save(): void {
    if (!this.form.title_en) return;
    const obs = this.editMode
      ? this.apiclientSvc.put(`/governance/raci-templates/${this.editId}`, this.form)
      : this.apiclientSvc.post('/governance/raci-templates', this.form);
    obs.subscribe({
      next: () => { this.showDialog = false; this.loadTemplates(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
    });
  }

  viewDetail(item: Record<string, any>): void {
    this.selectedTemplate = item;
    this.apiclientSvc.get(`/governance/raci-templates/${item.template_id}`).subscribe({
      next: (data: any) => {
        this.matrixAssignments = data?.assignments || [];
        this.showMatrixDialog = true;
      },
      error: () => { this.matrixAssignments = []; this.showMatrixDialog = true; },
    });
  }

  activateTemplate(item: Record<string, any>): void {
    this.apiclientSvc.post(`/governance/raci-templates/${item.template_id}/activate`, {}).subscribe({
      next: () => { this.loadTemplates(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.activated'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
    });
  }

  archiveTemplate(item: Record<string, any>): void {
    this.apiclientSvc.post(`/governance/raci-templates/${item.template_id}/archive`, {}).subscribe({
      next: () => { this.loadTemplates(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.archived'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
    });
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}
