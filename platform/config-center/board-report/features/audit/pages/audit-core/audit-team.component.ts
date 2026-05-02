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
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-team',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
    ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, DropdownModule, CalendarModule, TagModule, TooltipModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="users"
      [title]="i18n.translate('audit.auditTeam')"
      [subtitle]="i18n.translate('audit.manageAuditTeamAssignments')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.totalMembers') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ leadAuditorCount }}</span><span class="health-label">{{ i18n.translate('audit.leadAuditors') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ auditorCount }}</span><span class="health-label">{{ i18n.translate('audit.auditors') }}</span></div>
        <div class="health-card"><span class="health-value low">{{ observerCount }}</span><span class="health-label">{{ i18n.translate('audit.observers') }}</span></div>
      </div>

      <!-- Cross-module navigation links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="auditOptions()" [(ngModel)]="selectedAuditId"
            [placeholder]="i18n.translate('audit.selectAuditEngagement')" optionLabel="label" optionValue="value"
            (onChange)="load()" styleClass="mr-2" />
          <p-dropdown [options]="roleOptions" [(ngModel)]="roleFilter" [placeholder]="i18n.translate('audit.role')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newMember')" icon="pi pi-plus" (onClick)="openDialog()" [disabled]="!selectedAuditId" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('audit.userId') }}</th>
            <th>{{ i18n.translate('audit.role') }}</th>
            <th pSortableColumn="assigned_date">{{ i18n.translate('audit.assignedDate') }} <p-sortIcon field="assigned_date" /></th>
            <th pSortableColumn="hours_budgeted">{{ i18n.translate('audit.hoursBudgeted') }} <p-sortIcon field="hours_budgeted" /></th>
            <th pSortableColumn="hours_actual">{{ i18n.translate('audit.hoursActual') }} <p-sortIcon field="hours_actual" /></th>
            <th>{{ i18n.translate('audit.utilization') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="font-semibold">{{ e.user_id }}</td>
            <td><app-status-badge [status]="e.role" /></td>
            <td>{{ e.assigned_date | appDate:'medium' }}</td>
            <td>{{ e.hours_budgeted || 0 }}</td>
            <td>{{ e.hours_actual || 0 }}</td>
            <td>
              <p-tag [value]="utilization(e) + '%'" [severity]="utilization(e) > 100 ? 'danger' : utilization(e) > 80 ? 'warning' : 'success'" />
            </td>
            <td>
              <p-button icon="pi pi-clock" [text]="true" severity="info" pTooltip="Update Hours" (onClick)="openHoursDialog(e)" />
              <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteItem(e.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noTeamMembersYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Add Member Dialog -->
      <p-dialog [header]="i18n.translate('audit.newTeamMember')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.userId') }} *</label><input pInputText [(ngModel)]="form.user_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.role') }} *</label><p-dropdown [options]="roleOptions" [(ngModel)]="form.role" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.hoursBudgeted') }}</label><input pInputText type="number" [(ngModel)]="form.hours_budgeted" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.add')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.user_id || !form.role" />
        </ng-template>
      </p-dialog>

      <!-- Update Hours Dialog -->
      <p-dialog [header]="i18n.translate('audit.updateHours')"
        [(visible)]="hoursDialogVisible" [modal]="true" [style]="{ width: '400px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.hoursActual') }}</label><input pInputText type="number" [(ngModel)]="hoursForm.hours_actual" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.hoursBudgeted') }}</label><input pInputText type="number" [(ngModel)]="hoursForm.hours_budgeted" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="hoursDialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="saveHours()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px 16px; display: flex; flex-direction: column; align-items: center; }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-value.high { color: var(--warning); } .health-value.medium { color: var(--warning); } .health-value.low { color: var(--success); }
    .health-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .font-semibold { font-weight: 600; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .cross-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: transparent; color: var(--text-color); font-size: var(--font-size-sm); cursor: pointer; transition: background 0.15s, color 0.15s; }
    .cross-link-btn:hover { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  `]
})
export class AuditTeamComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  auditOptions = signal<Record<string, any>[]>([]);
  selectedAuditId = '';
  roleFilter = '';
  dialogVisible = false;
  hoursDialogVisible = false;
  hoursEditId = '';
  form: Record<string, any> = { user_id: '', role: '', hours_budgeted: null };
  hoursForm: Record<string, any> = { hours_actual: 0, hours_budgeted: 0 };
  roleOptions = [
    { label: 'Lead Auditor', value: 'lead_auditor' }, { label: 'Auditor', value: 'auditor' },
    { label: 'Observer', value: 'observer' }, { label: 'Specialist', value: 'specialist' },
    { label: 'Reviewer', value: 'reviewer' }
  ];
  get leadAuditorCount() { return this.items().filter((i: Record<string, any>) => i.role === 'lead_auditor').length; }
  get auditorCount() { return this.items().filter((i: Record<string, any>) => i.role === 'auditor').length; }
  get observerCount() { return this.items().filter((i: Record<string, any>) => i.role === 'observer').length; }

  ngOnInit() { this.loadAudits(); }

  loadAudits() {
    this.api.getEngagements().subscribe({
      next: r => {
        const engagements = r.engagements || r.data || [];
        this.auditOptions.set(engagements.map((e: Record<string, any>) => ({ label: e.title, value: e.audit_id })));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  load() {
    if (!this.selectedAuditId) { this.items.set([]); this.filtered.set([]); return; }
    this.loading.set(true);
    this.api.getTeamMembers(this.selectedAuditId).subscribe({
      next: r => { this.items.set(r.members || r.data || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadTeam') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.roleFilter) list = list.filter(i => i.role === this.roleFilter);
    this.filtered.set(list);
  }

  utilization(e: Record<string, any>): number {
    if (!e.hours_budgeted || e.hours_budgeted === 0) return 0;
    return Math.round(((e.hours_actual || 0) / e.hours_budgeted) * 100);
  }

  openDialog() {
    this.form = { user_id: '', role: '', hours_budgeted: null };
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form, audit_id: this.selectedAuditId };
    this.api.addTeamMember(payload).subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.memberAdded') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToAddMember') })
    });
  }

  openHoursDialog(item: Record<string, any>) {
    this.hoursEditId = item.id;
    this.hoursForm = { hours_actual: item.hours_actual || 0, hours_budgeted: item.hours_budgeted || 0 };
    this.hoursDialogVisible = true;
  }

  saveHours() {
    this.api.updateTeamHours(this.hoursEditId, this.hoursForm.hours_actual).subscribe({
      next: () => { this.hoursDialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.hoursUpdated') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToUpdateHours') })
    });
  }

  deleteItem(id: string) {
    this.api.removeTeamMember(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.removed') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToRemoveMember') })
    });
  }
}
