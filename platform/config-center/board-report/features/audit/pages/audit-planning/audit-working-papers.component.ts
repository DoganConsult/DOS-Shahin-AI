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
import { TooltipModule } from 'primeng/tooltip';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-working-papers',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
    ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
    DropdownModule, CalendarModule, TagModule, TooltipModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="file-edit"
      [title]="i18n.translate('audit.workingPapers')"
      [subtitle]="i18n.translate('audit.manageAuditWorkingPapers')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.total') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ draftCount }}</span><span class="health-label">{{ i18n.translate('audit.draft') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ reviewedCount }}</span><span class="health-label">{{ i18n.translate('audit.reviewed') }}</span></div>
        <div class="health-card"><span class="health-value low">{{ approvedCount }}</span><span class="health-label">{{ i18n.translate('audit.approved') }}</span></div>
      </div>

      <!-- Cross-module navigation links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/foundation/evidence'])"><i class="pi pi-file"></i> {{ i18n.translate('audit.evidenceLibrary') || 'Evidence Library' }}</button>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="auditOptions()" [(ngModel)]="selectedAuditId"
            [placeholder]="i18n.translate('audit.selectAuditEngagement')" optionLabel="label" optionValue="value"
            (onChange)="load()" styleClass="mr-2" />
          <p-dropdown [options]="paperTypeOptions" [(ngModel)]="typeFilter" [placeholder]="i18n.translate('audit.paperType')"
            [showClear]="true" (onChange)="filter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newPaper')" icon="pi pi-plus" (onClick)="openDialog()" [disabled]="!selectedAuditId" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18n.translate('audit.titleLabel') }} <p-sortIcon field="title" /></th>
            <th>{{ i18n.translate('audit.paperType') }}</th>
            <th>{{ i18n.translate('audit.status') }}</th>
            <th>{{ i18n.translate('audit.preparedBy') }}</th>
            <th>{{ i18n.translate('audit.reference') }}</th>
            <th pSortableColumn="created_at">{{ i18n.translate('audit.created') }} <p-sortIcon field="created_at" /></th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="font-semibold">{{ e.title }}</td>
            <td><app-status-badge [status]="e.paper_type" /></td>
            <td><app-status-badge [status]="e.status" /></td>
            <td>{{ e.prepared_by || '—' }}</td>
            <td>{{ e.reference_number || '—' }}</td>
            <td>{{ e.created_at | appDate:'medium' }}</td>
            <td>
              <p-button icon="pi pi-send" [text]="true" severity="info" pTooltip="Submit for Review"
                *ngIf="e.status === 'draft'" (onClick)="submitForReview(e.id)" />
              <p-button icon="pi pi-check" [text]="true" severity="success" pTooltip="Approve"
                *ngIf="e.status === 'reviewed'" (onClick)="approve(e.id)" />
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(e)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noWorkingPapersYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editPaper') : i18n.translate('audit.newPaper')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '560px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.titleLabel') }} *</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.paperType') }} *</label><p-dropdown [options]="paperTypeOptions" [(ngModel)]="form.paper_type" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.content') }}</label><textarea pInputTextarea [(ngModel)]="form.content" [rows]="4" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>{{ i18n.translate('audit.controlId') }}</label><input pInputText [(ngModel)]="form.control_id" class="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('audit.referenceNumber') }}</label><input pInputText [(ngModel)]="form.reference_number" class="w-full" /></div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title || !form.paper_type" />
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
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w-full { width: 100%; }
    .cross-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: transparent; color: var(--text-color); font-size: var(--font-size-sm); cursor: pointer; transition: background 0.15s, color 0.15s; }
    .cross-link-btn:hover { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  `]
})
export class AuditWorkingPapersComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  filtered = signal<Record<string, any>[]>([]);
  auditOptions = signal<Record<string, any>[]>([]);
  selectedAuditId = '';
  typeFilter = '';
  dialogVisible = false;
  editing = false;
  editId = '';
  form: Record<string, any> = { title: '', paper_type: '', content: '', control_id: '', reference_number: '' };
  paperTypeOptions = [
    { label: 'Test Procedure', value: 'test_procedure' }, { label: 'Observation', value: 'observation' },
    { label: 'Sampling', value: 'sampling' }, { label: 'Walkthrough', value: 'walkthrough' },
    { label: 'Interview Notes', value: 'interview_notes' }
  ];
  get draftCount() { return this.items().filter((i: Record<string, any>) => i.status === 'draft').length; }
  get reviewedCount() { return this.items().filter((i: Record<string, any>) => i.status === 'reviewed').length; }
  get approvedCount() { return this.items().filter((i: Record<string, any>) => i.status === 'approved').length; }

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
    this.api.getWorkingPapers(this.selectedAuditId).subscribe({
      next: r => { this.items.set(r.working_papers || r.data || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadWorkingPapers') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.typeFilter) list = list.filter(i => i.paper_type === this.typeFilter);
    this.filtered.set(list);
  }

  openDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.id;
      this.form = { title: item.title, paper_type: item.paper_type, content: item.content || '',
        control_id: item.control_id || '', reference_number: item.reference_number || '' };
    } else {
      this.editing = false; this.editId = '';
      this.form = { title: '', paper_type: '', content: '', control_id: '', reference_number: '' };
    }
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form, audit_id: this.selectedAuditId };
    const obs = this.editing
      ? this.api.updateWorkingPaper(this.editId, payload)
      : this.api.createWorkingPaper(payload);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSave') })
    });
  }

  submitForReview(id: string) {
    this.api.submitWorkingPaperReview(id, '').subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.submittedForReview') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSubmit') })
    });
  }

  approve(id: string) {
    this.api.approveWorkingPaper(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.approved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToApprove') })
    });
  }
}
