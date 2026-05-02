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
    selector: 'app-audit-capa',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule,
        InputTextarea, DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="wrench"
      [title]="i18nSvc.translate('audit.capaCorrectivePreventiveActions')"
      [subtitle]="i18nSvc.translate('audit.remediationPlansLinkedToFindings')"
      [loading]="loading()">
      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="statusOptions" [(ngModel)]="statusFilter" [placeholder]="i18nSvc.translate('audit.status')"
            [showClear]="true" (onChange)="applyFilter()" styleClass="mr-2" />
          <p-dropdown [options]="priorityOptions" [(ngModel)]="priorityFilter" [placeholder]="i18nSvc.translate('audit.priority')"
            [showClear]="true" (onChange)="applyFilter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18nSvc.translate('audit.newCapa')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18nSvc.translate('audit.titleLabel') }} <p-sortIcon field="title" /></th>
            <th>{{ i18nSvc.translate('audit.finding') }}</th>
            <th>{{ i18nSvc.translate('audit.priority') }}</th>
            <th>{{ i18nSvc.translate('audit.status') }}</th>
            <th pSortableColumn="target_date">{{ i18nSvc.translate('audit.targetDate') }} <p-sortIcon field="target_date" /></th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr [class.overdue]="isOverdue(c)">
            <td class="font-semibold">{{ c.title }}</td>
            <td>
              <a class="finding-link" (click)="navigateToFinding(c.finding_id); $event.stopPropagation()">
                {{ c.finding_title || c.finding_id?.slice(0, 8) }}
              </a>
            </td>
            <td><app-status-badge [status]="c.priority || 'medium'" /></td>
            <td><app-status-badge [status]="c.status" /></td>
            <td [class.text-danger]="isOverdue(c)">{{ c.target_date | appDate:'medium' }}</td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(c)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18nSvc.translate('audit.noCapaPlansYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Cross-Module Links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="navigateTo('/audit/findings')"><i class="pi pi-search"></i> {{ i18nSvc.translate('audit.allFindings') || 'All Findings' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/validation')"><i class="pi pi-check-circle"></i> {{ i18nSvc.translate('audit.validation') || 'Validation' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/capa-effectiveness')"><i class="pi pi-gauge"></i> {{ i18nSvc.translate('audit.capaEffectiveness') || 'CAPA Effectiveness' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/risk/register')"><i class="pi pi-shield"></i> {{ i18nSvc.translate('audit.riskRegister') || 'Risk Register' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/compliance/controls')"><i class="pi pi-verified"></i> {{ i18nSvc.translate('audit.controls') || 'Controls' }}</button>
      </div>

      <p-dialog [header]="editing ? i18nSvc.translate('audit.editCapa') : i18nSvc.translate('audit.newCapa')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18nSvc.translate('audit.titleLabel') }} *</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label>{{ i18nSvc.translate('audit.findingId') }} *</label><input pInputText [(ngModel)]="form.finding_id" class="w-full" [disabled]="editing" /></div>
          <div class="field"><label>{{ i18nSvc.translate('audit.description') }}</label><textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
          <div class="field"><label>{{ i18nSvc.translate('audit.approach') }}</label><textarea pInputTextarea [(ngModel)]="form.approach" [rows]="2" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>{{ i18nSvc.translate('audit.priority') }}</label><p-dropdown [options]="priorityOptions" [(ngModel)]="form.priority" class="w-full" /></div>
            <div class="field"><label>{{ i18nSvc.translate('audit.status') }}</label><p-dropdown [options]="statusOptions" [(ngModel)]="form.status" class="w-full" /></div>
          </div>
          <div class="field"><label>{{ i18nSvc.translate('audit.targetDate') }}</label><p-calendar [(ngModel)]="form.target_date" dateFormat="yy-mm-dd" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18nSvc.translate('audit.cancel')" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18nSvc.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title || !form.finding_id" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .font-semibold { font-weight: 600; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w-full { width: 100%; }
    .finding-link { color: var(--primary); cursor: pointer; text-decoration: underline; }
    .overdue { background: rgba(var(--module-accent-red-rgb), .04); }
    .text-danger { color: var(--error); font-weight: 600; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditCapaComponent implements OnInit {
  private api = inject(AuditApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly i18nSvc = inject(I18nService);
  private msg = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  statusFilter = '';
  priorityFilter = '';
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { title: '', finding_id: '', description: '', approach: '', priority: 'medium', status: 'open', target_date: null };

  statusOptions = [{ label: 'Open', value: 'open' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Done', value: 'completed' }, { label: 'Validated', value: 'validated' }];
  priorityOptions = [{ label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }];

  ngOnInit() {
    this.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      const fid = p.get('finding_id');
      if (fid) {
        this.form.finding_id = fid;
        this.form.title = p.get('finding_title') || '';
        this.dialogVisible = true;
      }
    });
  }

  load() {
    this.api.getCapaPlans().subscribe({
      next: r => { this.items.set((r as any).capa_plans || []); this.applyFilter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToLoadCAPAPlans') }); }
    });
  }

  applyFilter() {
    let list = this.items();
    if (this.statusFilter) list = list.filter(i => i.status === this.statusFilter);
    if (this.priorityFilter) list = list.filter(i => i.priority === this.priorityFilter);
    this.filtered.set(list);
  }

  isOverdue(c: Record<string, any>) {
    return c.target_date && new Date(c.target_date) < new Date() && !['completed', 'validated'].includes(c.status);
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.plan_id;
      this.form = { title: item.title, finding_id: item.finding_id, description: item.description || '', approach: item.approach || '', priority: item.priority || 'medium', status: item.status, target_date: item.target_date ? new Date(item.target_date) : null };
    } else {
      this.editing = false; this.editId = '';
      this.form = { title: '', finding_id: '', description: '', approach: '', priority: 'medium', status: 'open', target_date: null };
    }
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form,
      target_date: this.form.target_date ? new Date(this.form.target_date).toISOString().slice(0, 10) : null,
    };
    const obs = this.editing ? this.api.updateCapaPlan(this.editId, payload as any) : this.api.createCapaPlan(payload as any);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.success') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToSaveCAPA') })
    });
  }

  navigateToFinding(id: string) { this.router.navigate(['/audit/findings'], { queryParams: { id } }); }

  navigateTo(path: string) { this.router.navigate([path]); }
}
