import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-ratings',
    imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="star"
      [title]="i18n.translate('audit.auditRatings')"
      [subtitle]="i18n.translate('audit.evaluateControlAndAuditEffectiveness')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-item"><span class="health-value">{{ summary()?.total || 0 }}</span><span class="health-label">{{ i18n.translate('audit.totalRated') }}</span></div>
        <div class="health-item health-success"><span class="health-value">{{ summary()?.effective || 0 }}</span><span class="health-label">{{ i18n.translate('audit.effective') }}</span></div>
        <div class="health-item health-warning"><span class="health-value">{{ summary()?.needs_improvement || 0 }}</span><span class="health-label">{{ i18n.translate('audit.needsImprovement') }}</span></div>
        <div class="health-item health-danger"><span class="health-value">{{ summary()?.ineffective || 0 }}</span><span class="health-label">{{ i18n.translate('audit.ineffective') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="ratingOptions" [(ngModel)]="ratingFilter" [placeholder]="i18n.translate('audit.rating')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newRating')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="audit_id">{{ i18n.translate('audit.auditId') }} <p-sortIcon field="audit_id" /></th>
            <th>{{ i18n.translate('audit.overallRating') }}</th>
            <th>{{ i18n.translate('audit.controlDesign') }}</th>
            <th>{{ i18n.translate('audit.controlOperating') }}</th>
            <th>{{ i18n.translate('audit.summary') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-semibold">{{ r.audit_id }}</td>
            <td><app-status-badge [status]="r.overall_rating" /></td>
            <td><app-status-badge [status]="r.control_design_rating || 'not_rated'" /></td>
            <td><app-status-badge [status]="r.control_operating_rating || 'not_rated'" /></td>
            <td>{{ r.summary || '—' }}</td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(r)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noRatingsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editRating') : i18n.translate('audit.newRating')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.auditId') }} *</label><input pInputText [(ngModel)]="form.audit_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.overallRating') }} *</label>
            <p-dropdown [options]="ratingOptions" [(ngModel)]="form.overall_rating" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.controlDesignRating') }}</label>
            <p-dropdown [options]="ratingOptions" [(ngModel)]="form.control_design_rating" [showClear]="true" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.controlOperatingRating') }}</label>
            <p-dropdown [options]="ratingOptions" [(ngModel)]="form.control_operating_rating" [showClear]="true" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.summary') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.summary" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.audit_id || !form.overall_rating" />
        </ng-template>
      </p-dialog>

      <!-- Cross-Module Navigation -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> Engagements</button>
        <button class="cross-link-btn" (click)="router.navigate(['/compliance/controls'])"><i class="pi pi-verified"></i> Controls</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/test-plans'])"><i class="pi pi-list-check"></i> Test Plans</button>
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
    .health-danger .health-value { color: var(--error); }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditRatingsComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, unknown>[]>([]);
  filtered = signal<Record<string, unknown>[]>([]);
  summary = signal<GrcRecord>({});
  ratingFilter = '';
  dialogVisible = false;
  editing = false;
  form: Record<string, unknown> = { audit_id: '', overall_rating: '', control_design_rating: '', control_operating_rating: '', summary: '' };
  ratingOptions = [
    { label: 'Effective', value: 'effective' },
    { label: 'Needs Improvement', value: 'needs_improvement' },
    { label: 'Ineffective', value: 'ineffective' },
    { label: 'Not Rated', value: 'not_rated' }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getRatingSummary().subscribe({
      next: r => this.summary.set(r),
      error: (e: unknown) => devError("[API]", e)
    });
    this.api.getAllRatings().subscribe({
      next: r => { this.items.set((r as any).ratings || r || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadRatings') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.ratingFilter) list = list.filter(i => i.overall_rating === this.ratingFilter);
    this.filtered.set(list);
  }

  openDialog(item?: Record<string, unknown>) {
    if (item) {
      this.editing = true;
      this.form = { audit_id: item.audit_id, overall_rating: item.overall_rating, control_design_rating: item.control_design_rating || '',
        control_operating_rating: item.control_operating_rating || '', summary: item.summary || '' };
    } else {
      this.editing = false;
      this.form = { audit_id: '', overall_rating: '', control_design_rating: '', control_operating_rating: '', summary: '' };
    }
    this.dialogVisible = true;
  }

  save() {
    this.api.createRating(this.form as any).subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('audit.ratingSaved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSaveRating') })
    });
  }
}
