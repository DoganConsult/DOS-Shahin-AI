import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuditApiService } from '../../services/audit-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
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
import { TagModule } from 'primeng/tag';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-external',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="globe"
      [title]="i18n.translate('audit.externalAudits')"
      [subtitle]="i18n.translate('audit.manageExternalAuditorRelationshipsAndEngagements')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-item"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.total') }}</span></div>
        <div class="health-item"><span class="health-value">{{ countByStatus('planned') }}</span><span class="health-label">{{ i18n.translate('audit.planned') }}</span></div>
        <div class="health-item health-warning"><span class="health-value">{{ countByStatus('in_progress') }}</span><span class="health-label">{{ i18n.translate('audit.inProgress') }}</span></div>
        <div class="health-item health-success"><span class="health-value">{{ countByStatus('completed') }}</span><span class="health-label">{{ i18n.translate('audit.completed') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="statusOptions" [(ngModel)]="statusFilter" [placeholder]="i18n.translate('audit.status')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newExternalAudit')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="auditor_firm">{{ i18n.translate('audit.auditorFirm') }} <p-sortIcon field="auditor_firm" /></th>
            <th>{{ i18n.translate('audit.contactName') }}</th>
            <th>{{ i18n.translate('audit.contactEmail') }}</th>
            <th>{{ i18n.translate('audit.status') }}</th>
            <th>{{ i18n.translate('audit.startDate') }}</th>
            <th>{{ i18n.translate('audit.endDate') }}</th>
            <th>{{ i18n.translate('audit.engagementRef') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="font-semibold">{{ e.auditor_firm }}</td>
            <td>{{ e.contact_name || '—' }}</td>
            <td>{{ e.contact_email || '—' }}</td>
            <td><app-status-badge [status]="e.status" /></td>
            <td>{{ e.start_date | appDate:'medium' }}</td>
            <td>{{ e.end_date | appDate:'medium' }}</td>
            <td>{{ e.engagement_letter_ref || '—' }}</td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(e)" />
              <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteItem(e.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noExternalAuditsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editExternalAudit') : i18n.translate('audit.newExternalAudit')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '560px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.auditId') }} *</label><input pInputText [(ngModel)]="form.audit_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.auditorFirm') }} *</label><input pInputText [(ngModel)]="form.auditor_firm" class="w-full" /></div>
          <div class="field-row">
            <div class="field"><label>{{ i18n.translate('audit.contactName') }}</label><input pInputText [(ngModel)]="form.contact_name" class="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('audit.contactEmail') }}</label><input pInputText [(ngModel)]="form.contact_email" class="w-full" /></div>
          </div>
          <div class="field"><label>{{ i18n.translate('audit.engagementLetterRef') }}</label><input pInputText [(ngModel)]="form.engagement_letter_ref" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.status') }}</label>
            <p-dropdown [options]="statusOptions" [(ngModel)]="form.status" class="w-full" /></div>
          <div class="field-row">
            <div class="field"><label>{{ i18n.translate('audit.startDate') }}</label><p-calendar [(ngModel)]="form.start_date" dateFormat="yy-mm-dd" class="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('audit.endDate') }}</label><p-calendar [(ngModel)]="form.end_date" dateFormat="yy-mm-dd" class="w-full" /></div>
          </div>
          <div class="field"><label>{{ i18n.translate('audit.notes') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.notes" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.audit_id || !form.auditor_firm" />
        </ng-template>
      </p-dialog>

      <!-- Cross-Module Links -->
      <div class="cross-links" style="margin-top:24px">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/regulatory'])"><i class="pi pi-balance-scale"></i> {{ i18n.translate('audit.regulatory') || 'Regulatory' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/compliance/overview'])"><i class="pi pi-check-square"></i> {{ i18n.translate('audit.compliance') || 'Compliance' }}</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .font-semibold { font-weight: 600; }
    .health-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .health-item { background: var(--surface-card); border-radius: var(--radius-lg); padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--surface-border); }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .health-success .health-value { color: var(--success); }
    .health-warning .health-value { color: #ca8a04; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditExternalComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  statusFilter = '';
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { audit_id: '', auditor_firm: '', contact_name: '', contact_email: '', engagement_letter_ref: '', status: 'planned', start_date: null, end_date: null, notes: '' };
  statusOptions = [
    { label: 'Planned', value: 'planned' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'On Hold', value: 'on_hold' }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getExternalCoordinations().subscribe({
      next: r => { this.items.set((r as any).items || r || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadExternalAudits') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.statusFilter) list = list.filter(i => i.status === this.statusFilter);
    this.filtered.set(list);
  }

  countByStatus(status: string): number {
    return this.items().filter(i => i.status === status).length;
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.id;
      this.form = { audit_id: item.audit_id, auditor_firm: item.auditor_firm, contact_name: item.contact_name || '',
        contact_email: item.contact_email || '', engagement_letter_ref: item.engagement_letter_ref || '',
        status: item.status || 'planned',
        start_date: item.start_date ? new Date(item.start_date) : null,
        end_date: item.end_date ? new Date(item.end_date) : null,
        notes: item.notes || '' };
    } else {
      this.editing = false; this.editId = '';
      this.form = { audit_id: '', auditor_firm: '', contact_name: '', contact_email: '', engagement_letter_ref: '', status: 'planned', start_date: null, end_date: null, notes: '' };
    }
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form,
      start_date: this.form.start_date ? new Date(this.form.start_date).toISOString().slice(0, 10) : null,
      end_date: this.form.end_date ? new Date(this.form.end_date).toISOString().slice(0, 10) : null,
    };
    const obs = this.editing
      ? this.api.updateExternalCoordination(this.editId, payload as any)
      : this.api.createExternalCoordination(payload as any);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('audit.externalAuditSaved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSave') })
    });
  }

  deleteItem(id: string) {
    this.api.deleteExternalCoordination(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToDelete') })
    });
  }
}
