import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
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
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-engagements',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, EntityDetailDrawerComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, TagModule, TooltipModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="briefcase"
      [title]="i18nSvc.translate('audit.auditEngagements')"
      [subtitle]="i18nSvc.translate('audit.manageActiveAuditEngagements')"
      [loading]="loading()">
      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="statusOptions" [(ngModel)]="statusFilter" [placeholder]="i18nSvc.translate('audit.status')"
            [showClear]="true" (onChange)="filter()" styleClass="mr-2" />
          <p-dropdown [options]="typeOptions" [(ngModel)]="typeFilter" [placeholder]="i18nSvc.translate('audit.type')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18nSvc.translate('audit.newEngagement')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18nSvc.translate('audit.titleLabel') }} <p-sortIcon field="title" /></th>
            <th>{{ i18nSvc.translate('audit.type') }}</th>
            <th>{{ i18nSvc.translate('audit.status') }}</th>
            <th>{{ i18nSvc.translate('audit.start') }}</th>
            <th>{{ i18nSvc.translate('audit.end') }}</th>
            <th>{{ i18nSvc.translate('audit.findings') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr tabindex="0" role="button" (keyup.enter)="openDetail(e)" class="clickable-row" (click)="openDetail(e)">
            <td class="font-semibold">{{ e.title }}</td>
            <td><app-status-badge [status]="e.audit_type" /></td>
            <td><app-status-badge [status]="e.status" /></td>
            <td>{{ e.planned_start | appDate:'medium' }}</td>
            <td>{{ e.planned_end | appDate:'medium' }}</td>
            <td><p-tag [value]="'' + (e.finding_count || 0)" [severity]="e.finding_count > 0 ? 'danger' : 'success'" /></td>
            <td>
              <p-button icon="pi pi-play" [text]="true" severity="info" pTooltip="Start" *ngIf="e.status === 'planned'" (onClick)="changeStatus(e, 'in_progress'); $event.stopPropagation()" />
              <p-button icon="pi pi-check" [text]="true" severity="success" pTooltip="Complete" *ngIf="e.status === 'in_progress'" (onClick)="changeStatus(e, 'completed'); $event.stopPropagation()" />
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(e); $event.stopPropagation()" />
              <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteItem(e.audit_id); $event.stopPropagation()" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18nSvc.translate('audit.noEngagementsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Detail Drawer -->
      <app-entity-detail-drawer [(visible)]="drawerVisible" [title]="selectedItem?.title || ''"
        entityType="audit" [entityId]="selectedItem?.audit_id || ''">
        <div *ngIf="selectedItem" class="drawer-body">
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">{{ i18nSvc.translate('audit.type') }}</span><app-status-badge [status]="selectedItem.audit_type" /></div>
            <div class="detail-item"><span class="detail-label">{{ i18nSvc.translate('audit.status') }}</span><app-status-badge [status]="selectedItem.status" /></div>
            <div class="detail-item"><span class="detail-label">{{ i18nSvc.translate('audit.scope') }}</span><span>{{ selectedItem.scope || '—' }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ i18nSvc.translate('audit.plannedStart') }}</span><span>{{ selectedItem.planned_start | appDate:'medium' }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ i18nSvc.translate('audit.plannedEnd') }}</span><span>{{ selectedItem.planned_end | appDate:'medium' }}</span></div>
            <div class="detail-item" *ngIf="selectedItem.methodology"><span class="detail-label">{{ i18nSvc.translate('audit.methodology') }}</span><span>{{ selectedItem.methodology }}</span></div>
            <div class="detail-item" *ngIf="selectedItem.conclusion"><span class="detail-label">{{ i18nSvc.translate('audit.conclusion') }}</span><span>{{ selectedItem.conclusion }}</span></div>
          </div>
          <h4 *ngIf="detailData()?.findings?.length" style="margin-top:16px">{{ i18nSvc.translate('audit.linkedFindings') }}</h4>
          <div tabindex="0" role="button" (keyup.enter)="navigateToFinding(f.finding_id)" *ngFor="let f of detailData()?.findings || []" class="linked-item" (click)="navigateToFinding(f.finding_id)">
            <app-status-badge [status]="f.severity" /> <span>{{ f.title }}</span> <app-status-badge [status]="f.status" />
          </div>

          <!-- Cross-Module Links -->
          <h4 style="margin-top:16px">{{ i18nSvc.translate('audit.crossModuleLinks') || 'Related Modules' }}</h4>
          <div class="cross-links">
            <div tabindex="0" role="button" (keyup.enter)="navigateTo('/risk/register')" class="linked-item" (click)="navigateTo('/risk/register')">
              <i class="pi pi-shield" style="color:var(--primary)"></i> <span>{{ i18nSvc.translate('audit.riskRegister') || 'Risk Register' }}</span>
              <i class="pi pi-arrow-right" style="margin-inline-start:auto;color:var(--text-muted);font-size:var(--font-size-xs)"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigateTo('/compliance/controls')" class="linked-item" (click)="navigateTo('/compliance/controls')">
              <i class="pi pi-verified" style="color:var(--primary)"></i> <span>{{ i18nSvc.translate('audit.controls') || 'Controls' }}</span>
              <i class="pi pi-arrow-right" style="margin-inline-start:auto;color:var(--text-muted);font-size:var(--font-size-xs)"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigateTo('/foundation/evidence')" class="linked-item" (click)="navigateTo('/foundation/evidence')">
              <i class="pi pi-folder" style="color:var(--primary)"></i> <span>{{ i18nSvc.translate('audit.evidence') || 'Evidence' }}</span>
              <i class="pi pi-arrow-right" style="margin-inline-start:auto;color:var(--text-muted);font-size:var(--font-size-xs)"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigateTo('/audit/working-papers')" class="linked-item" (click)="navigateTo('/audit/working-papers')">
              <i class="pi pi-file-edit" style="color:var(--primary)"></i> <span>{{ i18nSvc.translate('audit.workingPapers') || 'Working Papers' }}</span>
              <i class="pi pi-arrow-right" style="margin-inline-start:auto;color:var(--text-muted);font-size:var(--font-size-xs)"></i>
            </div>
          </div>
        </div>
      </app-entity-detail-drawer>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18nSvc.translate('audit.editEngagement') : i18nSvc.translate('audit.newEngagement')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18nSvc.translate('audit.titleLabel') }} *</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label>{{ i18nSvc.translate('audit.type') }} *</label><p-dropdown [options]="typeOptions" [(ngModel)]="form.audit_type" class="w-full" /></div>
          <div class="field"><label>{{ i18nSvc.translate('audit.scope') }}</label><textarea pInputTextarea [(ngModel)]="form.scope" [rows]="2" class="w-full"></textarea></div>
          <div class="field"><label>{{ i18nSvc.translate('audit.methodology') }}</label><textarea pInputTextarea [(ngModel)]="form.methodology" [rows]="2" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>{{ i18nSvc.translate('audit.start') }}</label><p-calendar [(ngModel)]="form.planned_start" dateFormat="yy-mm-dd" class="w-full" /></div>
            <div class="field"><label>{{ i18nSvc.translate('audit.end') }}</label><p-calendar [(ngModel)]="form.planned_end" dateFormat="yy-mm-dd" class="w-full" /></div>
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
    .clickable-row { cursor: pointer; } .clickable-row:hover { background: var(--surface-50, #f9fafb); }
    .font-semibold { font-weight: 600; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w-full { width: 100%; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .drawer-body { padding: 16px; }
    .linked-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--radius); cursor: pointer; }
    .linked-item:hover { background: var(--surface-50); }
    .cross-links { display: flex; flex-direction: column; gap: 4px; }
  `]
})
export class AuditEngagementsComponent implements OnInit {
  private api = inject(AuditApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly i18nSvc = inject(I18nService);
  private msg = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  detailData = signal<GrcRecord | null>(null);
  statusFilter = '';
  typeFilter = '';
  drawerVisible = false;
  selectedItem: Record<string, any> | null = null;
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { title: '', audit_type: 'internal', scope: '', methodology: '', planned_start: null, planned_end: null };
  statusOptions = [{ label: 'Planned', value: 'planned' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' }];
  typeOptions = [{ label: 'Internal', value: 'internal' }, { label: 'External', value: 'external' }, { label: 'Regulatory', value: 'regulatory' }, { label: 'Special', value: 'special' }];

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      const st = p.get('status');
      const tp = p.get('type');
      if (st) this.statusFilter = st;
      if (tp) this.typeFilter = tp;
      const action = p.get('action');
      if (action === 'create') setTimeout(() => this.openDialog(), 100);
    });
    this.load();
  }

  load() {
    this.api.getEngagements().subscribe({
      next: r => { this.items.set((r as any).engagements || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToLoadEngagements') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.statusFilter) list = list.filter(i => i.status === this.statusFilter);
    if (this.typeFilter) list = list.filter(i => i.audit_type === this.typeFilter);
    this.filtered.set(list);
  }

  openDetail(item: Record<string, any>) {
    this.selectedItem = item;
    this.drawerVisible = true;
    this.api.getEngagement(item.audit_id).subscribe({ next: d => this.detailData.set(d) });
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.audit_id;
      this.form = { title: item.title, audit_type: item.audit_type, scope: item.scope || '', methodology: item.methodology || '',
        planned_start: item.planned_start ? new Date(item.planned_start) : null, planned_end: item.planned_end ? new Date(item.planned_end) : null };
    } else {
      this.editing = false; this.editId = '';
      this.form = { title: '', audit_type: 'internal', scope: '', methodology: '', planned_start: null, planned_end: null };
    }
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form,
      planned_start: this.form.planned_start ? new Date(this.form.planned_start).toISOString().slice(0, 10) : null,
      planned_end: this.form.planned_end ? new Date(this.form.planned_end).toISOString().slice(0, 10) : null,
    };
    const obs = this.editing ? this.api.updateEngagement(this.editId, payload as any) : this.api.createEngagement(payload as any);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.success') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToSave') })
    });
  }

  changeStatus(item: Record<string, any>, status: string) {
    this.api.updateEngagementStatus(item.audit_id, status).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('audit.statusUpdated') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToUpdateStatus') })
    });
  }

  deleteItem(id: string) {
    this.api.deleteEngagement(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.deleted') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToDelete') })
    });
  }

  navigateToFinding(id: string) { this.router.navigate(['/audit/findings'], { queryParams: { id } }); }

  navigateTo(path: string) { this.router.navigate([path]); }
}
