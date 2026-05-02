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
import { devError } from '../../../core/utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-regulatory',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
    ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
    DropdownModule, CalendarModule, TagModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="balance-scale"
      [title]="i18n.translate('audit.regulatoryAudits')"
      [subtitle]="i18n.translate('audit.regulatoryAuditRequirementsAndComplianceTracking')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-item"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.total') }}</span></div>
        <div class="health-item"><span class="health-value">{{ countByStatus('pending') }}</span><span class="health-label">{{ i18n.translate('audit.pending') }}</span></div>
        <div class="health-item health-warning"><span class="health-value">{{ countByStatus('scheduled') }}</span><span class="health-label">{{ i18n.translate('audit.scheduled') }}</span></div>
        <div class="health-item health-success"><span class="health-value">{{ countByStatus('completed') }}</span><span class="health-label">{{ i18n.translate('audit.completed') }}</span></div>
        <div class="health-item health-danger"><span class="health-value">{{ overdueItems().length }}</span><span class="health-label">{{ i18n.translate('audit.overdue') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="statusOptions" [(ngModel)]="statusFilter" [placeholder]="i18n.translate('audit.status')"
            [showClear]="true" (onChange)="filter()" styleClass="mr-2" />
          <p-dropdown [options]="frequencyOptions" [(ngModel)]="frequencyFilter" [placeholder]="i18n.translate('audit.frequency')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newRequirement')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="framework_code">{{ i18n.translate('audit.frameworkCode') }} <p-sortIcon field="framework_code" /></th>
            <th pSortableColumn="requirement_ref">{{ i18n.translate('audit.requirementRef') }} <p-sortIcon field="requirement_ref" /></th>
            <th>{{ i18n.translate('audit.description') }}</th>
            <th>{{ i18n.translate('audit.frequency') }}</th>
            <th>{{ i18n.translate('audit.status') }}</th>
            <th pSortableColumn="next_due_at">{{ i18n.translate('audit.nextDue') }} <p-sortIcon field="next_due_at" /></th>
            <th>{{ i18n.translate('audit.linkedAudit') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr [class.overdue-row]="isOverdue(r)">
            <td class="font-semibold">{{ r.framework_code }}</td>
            <td>{{ r.requirement_ref }}</td>
            <td>{{ r.description || '—' }}</td>
            <td><app-status-badge [status]="r.frequency" /></td>
            <td><app-status-badge [status]="r.status" /></td>
            <td>{{ r.next_due_at | appDate:'medium' }}</td>
            <td>{{ r.linked_audit_id || '—' }}</td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noRegulatoryRequirementsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editRequirement') : i18n.translate('audit.newRequirement')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '540px' }">
        <div class="form-grid">
          <div class="field-row">
            <div class="field"><label>{{ i18n.translate('audit.frameworkCode') }} *</label><input pInputText [(ngModel)]="form.framework_code" class="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('audit.requirementRef') }} *</label><input pInputText [(ngModel)]="form.requirement_ref" class="w-full" /></div>
          </div>
          <div class="field"><label>{{ i18n.translate('audit.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
          <div class="field"><label>{{ i18n.translate('audit.frequency') }} *</label>
            <p-dropdown [options]="frequencyOptions" [(ngModel)]="form.frequency" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.nextDueAt') }}</label>
            <p-calendar [(ngModel)]="form.next_due_at" dateFormat="yy-mm-dd" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.responsibleTeamId') }}</label>
            <input pInputText [(ngModel)]="form.responsible_team_id" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.framework_code || !form.requirement_ref || !form.frequency" />
        </ng-template>
      </p-dialog>

      <!-- Cross-Module Links -->
      <div class="cross-links" style="margin-top:24px">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/compliance/overview'])"><i class="pi pi-check-square"></i> {{ i18n.translate('audit.compliance') || 'Compliance' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/governance/mandates'])"><i class="pi pi-building"></i> {{ i18n.translate('audit.governance') || 'Governance Mandates' }}</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .font-semibold { font-weight: 600; }
    .health-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
    .health-item { background: var(--surface-card); border-radius: var(--radius-lg); padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--surface-border); }
    .health-value { font-size: 1.5rem; font-weight: 700; }
    .health-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .health-success .health-value { color: var(--success); }
    .health-warning .health-value { color: #ca8a04; }
    .health-danger .health-value { color: var(--error); }
    .overdue-row { background: rgba(220, 38, 38, 0.06); }
    .overdue-row:hover { background: rgba(220, 38, 38, 0.1); }
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
export class AuditRegulatoryComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  overdueItems = signal<Record<string, any>[]>([]);
  statusFilter = '';
  frequencyFilter = '';
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { framework_code: '', requirement_ref: '', description: '', frequency: '', next_due_at: null, responsible_team_id: '' };
  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Completed', value: 'completed' },
    { label: 'Overdue', value: 'overdue' }
  ];
  frequencyOptions = [
    { label: 'Annual', value: 'annual' },
    { label: 'Semi-Annual', value: 'semi_annual' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'On Demand', value: 'on_demand' }
  ];

  ngOnInit() { this.load(); this.loadOverdue(); }

  load() {
    this.loading.set(true);
    this.api.getRegulatoryTrackings().subscribe({
      next: r => { this.items.set(r.items || r || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadRegulatoryRequirements') }); }
    });
  }

  loadOverdue() {
    this.api.getOverdueRegulatory().subscribe({
      next: r => this.overdueItems.set(r.items || r || []),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  filter() {
    let list = this.items();
    if (this.statusFilter) list = list.filter(i => i.status === this.statusFilter);
    if (this.frequencyFilter) list = list.filter(i => i.frequency === this.frequencyFilter);
    this.filtered.set(list);
  }

  countByStatus(status: string): number {
    return this.items().filter(i => i.status === status).length;
  }

  isOverdue(item: Record<string, any>): boolean {
    if (!item.next_due_at) return false;
    return new Date(item.next_due_at) < new Date() && item.status !== 'completed';
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.id;
      this.form = { framework_code: item.framework_code, requirement_ref: item.requirement_ref,
        description: item.description || '', frequency: item.frequency,
        next_due_at: item.next_due_at ? new Date(item.next_due_at) : null,
        responsible_team_id: item.responsible_team_id || '' };
    } else {
      this.editing = false; this.editId = '';
      this.form = { framework_code: '', requirement_ref: '', description: '', frequency: '', next_due_at: null, responsible_team_id: '' };
    }
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form,
      next_due_at: this.form.next_due_at ? new Date(this.form.next_due_at).toISOString().slice(0, 10) : null,
    };
    const obs = this.editing
      ? this.api.updateRegulatoryTracking(this.editId, payload)
      : this.api.createRegulatoryTracking(payload);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.loadOverdue(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('audit.requirementSaved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSave') })
    });
  }
}
