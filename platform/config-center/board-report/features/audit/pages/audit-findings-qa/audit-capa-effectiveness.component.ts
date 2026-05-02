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
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-capa-effectiveness',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="check-circle"
      [title]="i18n.translate('audit.capaEffectiveness')"
      [subtitle]="i18n.translate('audit.trackAndTestCorrectivepreventiveActionEffectiveness')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-item"><span class="health-value">{{ rateData()?.total_tests || 0 }}</span><span class="health-label">{{ i18n.translate('audit.totalTests') }}</span></div>
        <div class="health-item health-success"><span class="health-value">{{ rateData()?.effective_pct || 0 }}%</span><span class="health-label">{{ i18n.translate('audit.effective') }}</span></div>
        <div class="health-item health-warning"><span class="health-value">{{ rateData()?.partially_effective || 0 }}</span><span class="health-label">{{ i18n.translate('audit.partiallyEffective') }}</span></div>
        <div class="health-item health-danger"><span class="health-value">{{ rateData()?.ineffective || 0 }}</span><span class="health-label">{{ i18n.translate('audit.ineffective') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <div style="display:flex;align-items:center;gap:12px">
            <label style="font-weight:600">{{ i18n.translate('audit.capaId') }}</label>
            <p-dropdown [options]="capaOptions()" [(ngModel)]="selectedCapaId" [placeholder]="i18n.translate('audit.selectCapa')"
              [showClear]="true" [filter]="true" (onChange)="loadTests()" styleClass="mr-2" />
          </div>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newTest')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="items()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="tested_at">{{ i18n.translate('audit.testDate') }} <p-sortIcon field="tested_at" /></th>
            <th>{{ i18n.translate('audit.tester') }}</th>
            <th>{{ i18n.translate('audit.result') }}</th>
            <th>{{ i18n.translate('audit.evidenceNotes') }}</th>
            <th>{{ i18n.translate('audit.reopenFinding') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-t>
          <tr>
            <td>{{ t.tested_at | appDate:'medium' }}</td>
            <td class="font-semibold">{{ t.tester_name || t.tester_id || '—' }}</td>
            <td>
              <p-tag [value]="t.result"
                [severity]="t.result === 'effective' ? 'success' : t.result === 'partially_effective' ? 'warning' : 'danger'" />
            </td>
            <td>{{ t.evidence_notes || '—' }}</td>
            <td>
              <i class="pi" [ngClass]="t.reopen_finding ? 'pi-check-circle text-danger' : 'pi-minus-circle text-muted'" [style.color]="t.reopen_finding ? 'var(--error)' : 'var(--text-muted)'"></i>
              {{ t.reopen_finding ? (i18n.translate('audit.yes')) : (i18n.translate('audit.no')) }}
            </td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openDialog(t)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noTestsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editTest') : i18n.translate('audit.newTest')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.capaId') }} *</label><input pInputText [(ngModel)]="form.capa_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.findingId') }}</label><input pInputText [(ngModel)]="form.finding_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.result') }} *</label>
            <p-dropdown [options]="resultOptions" [(ngModel)]="form.result" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.evidenceNotes') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.evidence_notes" [rows]="3" class="w-full"></textarea></div>
          <div class="field" style="flex-direction:row;align-items:center;gap:8px">
            <input type="checkbox" [(ngModel)]="form.reopen_finding" id="reopenChk" />
            <label for="reopenChk" style="margin:0;cursor:pointer">{{ i18n.translate('audit.reopenFinding') }}</label>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.capa_id || !form.result" />
        </ng-template>
      </p-dialog>

      <!-- Cross-Module Navigation -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/capa'])"><i class="pi pi-wrench"></i> CAPA Plans</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/validation'])"><i class="pi pi-check-square"></i> Validation</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/findings'])"><i class="pi pi-search"></i> Findings</button>
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
export class AuditCapaEffectivenessComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, unknown>[]>([]);
  rateData = signal<GrcRecord>({});
  capaOptions = signal<Record<string, unknown>[]>([]);
  selectedCapaId = '';
  dialogVisible = false;
  editing = false;
  form: Record<string, unknown> = { capa_id: '', finding_id: '', result: '', evidence_notes: '', reopen_finding: false };
  resultOptions = [
    { label: 'Effective', value: 'effective' },
    { label: 'Partially Effective', value: 'partially_effective' },
    { label: 'Ineffective', value: 'ineffective' }
  ];

  ngOnInit() { this.loadRate(); this.loading.set(false); }

  loadRate() {
    this.api.getCapaEffectivenessRate().subscribe({
      next: r => this.rateData.set(r),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  loadTests() {
    if (!this.selectedCapaId) { this.items.set([]); return; }
    this.loading.set(true);
    this.api.getCapaEffectiveness(this.selectedCapaId).subscribe({
      next: r => { this.items.set((r as any).tests || r || []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadTests') }); }
    });
  }

  openDialog(item?: Record<string, unknown>) {
    if (item) {
      this.editing = true;
      this.form = { capa_id: item.capa_id, finding_id: item.finding_id || '', result: item.result,
        evidence_notes: item.evidence_notes || '', reopen_finding: item.reopen_finding || false };
    } else {
      this.editing = false;
      this.form = { capa_id: this.selectedCapaId || '', finding_id: '', result: '', evidence_notes: '', reopen_finding: false };
    }
    this.dialogVisible = true;
  }

  save() {
    this.api.createCapaEffectiveness(this.form as any).subscribe({
      next: () => {
        this.dialogVisible = false;
        this.loadRate();
        if (this.selectedCapaId) this.loadTests();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('audit.testSaved') });
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSaveTest') })
    });
  }
}
