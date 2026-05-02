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
import { TagModule } from 'primeng/tag';
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-universe',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="globe"
      [title]="i18n.translate('audit.auditUniverse')"
      [subtitle]="i18n.translate('audit.manageAuditableEntities')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.totalEntities') }}</span></div>
        <div class="health-card"><span class="health-value critical">{{ criticalCount }}</span><span class="health-label">{{ i18n.translate('audit.criticalRisk') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ highCount }}</span><span class="health-label">{{ i18n.translate('audit.highRisk') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ mediumCount }}</span><span class="health-label">{{ i18n.translate('audit.mediumRisk') }}</span></div>
        <div class="health-card"><span class="health-value low">{{ lowCount }}</span><span class="health-label">{{ i18n.translate('audit.lowRisk') }}</span></div>
      </div>

      <!-- Cross-module navigation links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/risk/register'])"><i class="pi pi-shield"></i> {{ i18n.translate('audit.riskRegister') || 'Risk Register' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/risk-planning'])"><i class="pi pi-chart-bar"></i> {{ i18n.translate('audit.riskPlanning') || 'Risk Planning' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/compliance/controls'])"><i class="pi pi-verified"></i> {{ i18n.translate('audit.controls') || 'Controls' }}</button>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="entityTypeOptions" [(ngModel)]="entityTypeFilter" [placeholder]="i18n.translate('audit.entityType')"
            [showClear]="true" (onChange)="filter()" styleClass="mr-2" />
          <p-dropdown [options]="riskRatingOptions" [(ngModel)]="riskRatingFilter" [placeholder]="i18n.translate('audit.riskRating')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newEntity')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="entity_name">{{ i18n.translate('audit.entityName') }} <p-sortIcon field="entity_name" /></th>
            <th>{{ i18n.translate('audit.entityType') }}</th>
            <th>{{ i18n.translate('audit.riskRating') }}</th>
            <th pSortableColumn="last_audited">{{ i18n.translate('audit.lastAudited') }} <p-sortIcon field="last_audited" /></th>
            <th pSortableColumn="next_audit_due">{{ i18n.translate('audit.nextAuditDue') }} <p-sortIcon field="next_audit_due" /></th>
            <th>{{ i18n.translate('audit.frequencyMonths') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="font-semibold">{{ e.entity_name }}</td>
            <td><app-status-badge [status]="e.entity_type" /></td>
            <td><app-status-badge [status]="e.risk_rating" /></td>
            <td>{{ e.last_audited | appDate:'medium' }}</td>
            <td>{{ e.next_audit_due | appDate:'medium' }}</td>
            <td>{{ e.audit_frequency_months || '—' }}</td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(e)" />
              <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteItem(e.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noEntitiesYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editEntity') : i18n.translate('audit.newEntity')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.entityName') }} *</label><input pInputText [(ngModel)]="form.entity_name" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.entityType') }} *</label><p-dropdown [options]="entityTypeOptions" [(ngModel)]="form.entity_type" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.riskRating') }}</label><p-dropdown [options]="riskRatingOptions" [(ngModel)]="form.risk_rating" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.frequencyMonths') }}</label><input pInputText type="number" [(ngModel)]="form.audit_frequency_months" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.notes') }}</label><textarea pInputTextarea [(ngModel)]="form.notes" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.entity_name || !form.entity_type" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px 16px; display: flex; flex-direction: column; align-items: center; }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-value.critical { color: var(--error); } .health-value.high { color: var(--warning); } .health-value.medium { color: var(--warning); } .health-value.low { color: var(--success); }
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
export class AuditUniverseComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  entityTypeFilter = '';
  riskRatingFilter = '';
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { entity_name: '', entity_type: '', risk_rating: '', audit_frequency_months: null, notes: '' };
  entityTypeOptions = [
    { label: 'Process', value: 'process' }, { label: 'Department', value: 'department' },
    { label: 'System', value: 'system' }, { label: 'Vendor', value: 'vendor' }, { label: 'Project', value: 'project' }
  ];
  riskRatingOptions = [
    { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }
  ];
  get criticalCount() { return this.items().filter((i: Record<string, any>) => i.risk_rating === 'critical').length; }
  get highCount() { return this.items().filter((i: Record<string, any>) => i.risk_rating === 'high').length; }
  get mediumCount() { return this.items().filter((i: Record<string, any>) => i.risk_rating === 'medium').length; }
  get lowCount() { return this.items().filter((i: Record<string, any>) => i.risk_rating === 'low').length; }

  ngOnInit() { this.load(); }

  load() {
    this.api.getUniverseEntities().subscribe({
      next: r => { this.items.set((r as any).entities || (r as any).data || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadAuditUniverse') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.entityTypeFilter) list = list.filter(i => i.entity_type === this.entityTypeFilter);
    if (this.riskRatingFilter) list = list.filter(i => i.risk_rating === this.riskRatingFilter);
    this.filtered.set(list);
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.id;
      this.form = { entity_name: item.entity_name, entity_type: item.entity_type, risk_rating: item.risk_rating || '',
        audit_frequency_months: item.audit_frequency_months, notes: item.notes || '' };
    } else {
      this.editing = false; this.editId = '';
      this.form = { entity_name: '', entity_type: '', risk_rating: '', audit_frequency_months: null, notes: '' };
    }
    this.dialogVisible = true;
  }

  save() {
    const obs = this.editing
      ? this.api.updateUniverseEntity(this.editId, this.form as any)
      : this.api.createUniverseEntity(this.form as any);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSave') })
    });
  }

  deleteItem(id: string) {
    this.api.deleteUniverseEntity(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToDelete') })
    });
  }
}
