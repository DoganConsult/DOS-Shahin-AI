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
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-schedules',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
    ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, DropdownModule, CalendarModule, TagModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="calendar"
      [title]="i18n.translate('audit.auditSchedules')"
      [subtitle]="i18n.translate('audit.manageRecurringAuditSchedules')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.total') }}</span></div>
        <div class="health-card"><span class="health-value low">{{ enabledCount }}</span><span class="health-label">{{ i18n.translate('audit.enabled') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ disabledCount }}</span><span class="health-label">{{ i18n.translate('audit.disabled') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ dueNowCount() }}</span><span class="health-label">{{ i18n.translate('audit.dueNow') }}</span></div>
      </div>

      <!-- Cross-module navigation links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/plan'])"><i class="pi pi-list"></i> {{ i18n.translate('audit.auditPlan') || 'Audit Plan' }}</button>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="auditTypeOptions" [(ngModel)]="typeFilter" [placeholder]="i18n.translate('audit.auditType')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newSchedule')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18n.translate('audit.titleLabel') }} <p-sortIcon field="title" /></th>
            <th>{{ i18n.translate('audit.auditType') }}</th>
            <th>{{ i18n.translate('audit.cronExpression') }}</th>
            <th pSortableColumn="next_run">{{ i18n.translate('audit.nextRun') }} <p-sortIcon field="next_run" /></th>
            <th>{{ i18n.translate('audit.lastRun') }}</th>
            <th>{{ i18n.translate('audit.enabled') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="font-semibold">{{ e.title }}</td>
            <td><app-status-badge [status]="e.audit_type" /></td>
            <td><code>{{ e.cron_expression }}</code></td>
            <td>{{ e.next_run | appDate:'medium' }}</td>
            <td>{{ e.last_run | appDate:'medium' }}</td>
            <td>
              <p-button [icon]="e.enabled ? 'pi pi-check-circle' : 'pi pi-circle'" [text]="true"
                [severity]="e.enabled ? 'success' : 'secondary'" (onClick)="toggleEnabled(e)" />
            </td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(e)" />
              <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteItem(e.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noSchedulesYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editSchedule') : i18n.translate('audit.newSchedule')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.titleLabel') }} *</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.auditType') }} *</label><p-dropdown [options]="auditTypeOptions" [(ngModel)]="form.audit_type" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.cronExpression') }} *</label><input pInputText [(ngModel)]="form.cron_expression" class="w-full" placeholder="0 0 1 */3 *" aria-label="0 0 1 */3 *" /></div>
          <div class="field" style="flex-direction:row;align-items:center;gap:8px">
            <input type="checkbox" [(ngModel)]="form.auto_create" id="autoCreate" />
            <label for="autoCreate" style="margin:0">{{ i18n.translate('audit.autocreateEngagement') }}</label>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title || !form.audit_type || !form.cron_expression" />
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
    code { background: var(--surface-ice); padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); }
    .cross-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: transparent; color: var(--text-color); font-size: var(--font-size-sm); cursor: pointer; transition: background 0.15s, color 0.15s; }
    .cross-link-btn:hover { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  `]
})
export class AuditSchedulesComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  dueNowCount = signal(0);
  typeFilter = '';
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { title: '', audit_type: '', cron_expression: '', auto_create: false };
  auditTypeOptions = [
    { label: 'Internal', value: 'internal' }, { label: 'External', value: 'external' },
    { label: 'Regulatory', value: 'regulatory' }, { label: 'Special', value: 'special' }
  ];
  get enabledCount() { return this.items().filter((i: Record<string, any>) => i.enabled).length; }
  get disabledCount() { return this.items().filter((i: Record<string, any>) => !i.enabled).length; }

  ngOnInit() { this.load(); }

  load() {
    this.api.getSchedules().subscribe({
      next: r => {
        const list = r.schedules || r.data || [];
        this.items.set(list);
        const now = new Date();
        this.dueNowCount.set(list.filter((s: Record<string, any>) => s.enabled && s.next_run && new Date(s.next_run) <= now).length);
        this.filter();
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadSchedules') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.typeFilter) list = list.filter(i => i.audit_type === this.typeFilter);
    this.filtered.set(list);
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.id;
      this.form = { title: item.title, audit_type: item.audit_type, cron_expression: item.cron_expression, auto_create: item.auto_create || false };
    } else {
      this.editing = false; this.editId = '';
      this.form = { title: '', audit_type: '', cron_expression: '', auto_create: false };
    }
    this.dialogVisible = true;
  }

  save() {
    const obs = this.editing
      ? this.api.updateSchedule(this.editId, this.form)
      : this.api.createSchedule(this.form);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSave') })
    });
  }

  toggleEnabled(item: Record<string, any>) {
    this.api.toggleSchedule(item.id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(item.enabled ? 'common.disabled' : 'common.enabled') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToToggle') })
    });
  }

  deleteItem(id: string) {
    this.api.deleteSchedule(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToDelete') })
    });
  }
}
