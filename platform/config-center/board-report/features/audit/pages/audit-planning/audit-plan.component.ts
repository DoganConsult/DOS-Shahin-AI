import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-plan',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, ToastModule,
        TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, ExportButtonComponent],
    providers: [MessageService],
    template: `
    <app-page-shell icon="calendar"
      [title]="i18nSvc.translate('audit.auditPlan')"
      [subtitle]="i18nSvc.translate('audit.plannedAuditsAndAnnualSchedule')"
      [loading]="loading()">
      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <app-export-button module="audit-plan" [data]="plans()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18nSvc.translate('audit.newPlan')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="plans()" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[10,15,30]"
        styleClass="p-datatable-striped" [globalFilterFields]="['title','audit_type','status']">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18nSvc.translate('audit.titleLabel') }} <p-sortIcon field="title" /></th>
            <th>{{ i18nSvc.translate('audit.type') }}</th>
            <th>{{ i18nSvc.translate('audit.scope') }}</th>
            <th pSortableColumn="planned_start">{{ i18nSvc.translate('audit.start') }} <p-sortIcon field="planned_start" /></th>
            <th pSortableColumn="planned_end">{{ i18nSvc.translate('audit.end') }} <p-sortIcon field="planned_end" /></th>
            <th>{{ i18nSvc.translate('audit.status') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td class="font-semibold">{{ p.title }}</td>
            <td><app-status-badge [status]="p.audit_type" /></td>
            <td>{{ p.scope || '—' }}</td>
            <td>{{ p.planned_start | appDate:'medium' }}</td>
            <td>{{ p.planned_end | appDate:'medium' }}</td>
            <td><app-status-badge [status]="p.status" /></td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(p)" />
              <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteItem(p.audit_id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18nSvc.translate('audit.noAuditPlansYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Cross-Module Links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="navigateTo('/audit/engagements')"><i class="pi pi-briefcase"></i> {{ i18nSvc.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/risk-planning')"><i class="pi pi-chart-bar"></i> {{ i18nSvc.translate('audit.riskPlanning') || 'Risk Planning' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/schedules')"><i class="pi pi-clock"></i> {{ i18nSvc.translate('audit.schedules') || 'Schedules' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/risk/register')"><i class="pi pi-shield"></i> {{ i18nSvc.translate('audit.riskRegister') || 'Risk Register' }}</button>
      </div>

      <p-dialog [header]="editing ? i18nSvc.translate('audit.editPlan') : i18nSvc.translate('audit.newPlan')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field">
            <label>{{ i18nSvc.translate('audit.titleLabel') }} *</label>
            <input pInputText [(ngModel)]="form.title" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18nSvc.translate('audit.type') }} *</label>
            <p-dropdown [options]="typeOptions" [(ngModel)]="form.audit_type" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18nSvc.translate('audit.scope') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.scope" [rows]="2" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18nSvc.translate('audit.start') }}</label>
              <p-calendar [(ngModel)]="form.planned_start" dateFormat="yy-mm-dd" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18nSvc.translate('audit.end') }}</label>
              <p-calendar [(ngModel)]="form.planned_end" dateFormat="yy-mm-dd" class="w-full" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18nSvc.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18nSvc.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title || !form.audit_type" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w-full { width: 100%; }
    .font-semibold { font-weight: 600; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditPlanComponent implements OnInit {
  private api = inject(AuditApiService);
  private router = inject(Router);
  readonly i18nSvc = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  plans = signal<Record<string, any>[]>([]);
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { title: '', audit_type: 'internal', scope: '', planned_start: null, planned_end: null };
  typeOptions = [
    { label: 'Internal', value: 'internal' },
    { label: 'External', value: 'external' },
    { label: 'Regulatory', value: 'regulatory' },
    { label: 'Special', value: 'special' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.api.getPlans().subscribe({
      next: r => { this.plans.set((r as any).plans || []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToLoadPlans') }); }
    });
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true;
      this.editId = item.audit_id;
      this.form = { title: item.title, audit_type: item.audit_type, scope: item.scope || '', planned_start: item.planned_start ? new Date(item.planned_start) : null, planned_end: item.planned_end ? new Date(item.planned_end) : null };
    } else {
      this.editing = false;
      this.editId = '';
      this.form = { title: '', audit_type: 'internal', scope: '', planned_start: null, planned_end: null };
    }
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form,
      planned_start: this.form.planned_start ? new Date(this.form.planned_start).toISOString().slice(0, 10) : null,
      planned_end: this.form.planned_end ? new Date(this.form.planned_end).toISOString().slice(0, 10) : null,
    };
    const obs = this.editing ? this.api.updatePlan(this.editId, payload as any) : this.api.createPlan(payload as any);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.success'), detail: this.editing ? this.i18nSvc.translate('audit.planUpdated') : this.i18nSvc.translate('audit.planCreated') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToSavePlan') })
    });
  }

  deleteItem(id: string) {
    this.api.deletePlan(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.deleted'), detail: this.i18nSvc.translate('audit.planRemoved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToDelete') })
    });
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}
