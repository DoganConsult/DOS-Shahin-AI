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
    selector: 'app-audit-repeat-findings',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, CalendarModule, TagModule, TooltipModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="refresh"
      [title]="i18n.translate('audit.repeatFindings')"
      [subtitle]="i18n.translate('audit.trackFindingsThatRecurAcrossAudits')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.totalRepeats') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ thisQuarterCount() }}</span><span class="health-label">{{ i18n.translate('audit.thisQuarter') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ criticalRepeatCount }}</span><span class="health-label">{{ i18n.translate('audit.criticalRepeats') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="text-muted" style="font-size: var(--font-size-sm)">{{ i18n.translate('audit.clickARowToViewHistory') }}</span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.linkRepeatFinding')" icon="pi pi-plus" (onClick)="openDialog()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="items()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="finding_title">{{ i18n.translate('audit.findingTitle') }} <p-sortIcon field="finding_title" /></th>
            <th>{{ i18n.translate('audit.originalFinding') }}</th>
            <th pSortableColumn="occurrence_count">{{ i18n.translate('audit.occurrenceCount') }} <p-sortIcon field="occurrence_count" /></th>
            <th>{{ i18n.translate('audit.notes') }}</th>
            <th pSortableColumn="created_at">{{ i18n.translate('audit.created') }} <p-sortIcon field="created_at" /></th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr tabindex="0" role="button" (keyup.enter)="viewHistory(e)" class="clickable-row" (click)="viewHistory(e)">
            <td class="font-semibold">{{ e.finding_title || e.finding_id }}</td>
            <td>{{ e.original_finding_title || e.original_finding_id }}</td>
            <td>
              <p-tag [value]="'' + (e.occurrence_count || 0)"
                [severity]="e.occurrence_count >= 3 ? 'danger' : e.occurrence_count >= 2 ? 'warning' : 'info'" />
            </td>
            <td>{{ e.notes || '—' }}</td>
            <td>{{ e.created_at | appDate:'medium' }}</td>
            <td>
              <p-button icon="pi pi-history" [text]="true" severity="info" pTooltip="View History" (onClick)="viewHistory(e); $event.stopPropagation()" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noRepeatFindingsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Link Repeat Finding Dialog -->
      <p-dialog [header]="i18n.translate('audit.linkRepeatFinding')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.findingId') }} *</label><input pInputText [(ngModel)]="form.finding_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.originalFindingId') }} *</label><input pInputText [(ngModel)]="form.original_finding_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.notes') }}</label><textarea pInputTextarea [(ngModel)]="form.notes" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.link')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.finding_id || !form.original_finding_id" />
        </ng-template>
      </p-dialog>

      <!-- History Drawer Dialog -->
      <p-dialog [header]="i18n.translate('audit.repeatHistory')"
        [(visible)]="historyVisible" [modal]="true" [style]="{ width: '560px' }">
        <div *ngIf="historyItems().length === 0" class="text-center p-4" style="color:var(--text-muted)">
          {{ i18n.translate('audit.noHistoryAvailable') }}
        </div>
        <div *ngFor="let h of historyItems()" class="history-item">
          <div class="history-header">
            <span class="font-semibold">{{ h.audit_title || h.audit_id }}</span>
            <span class="text-muted">{{ h.found_at | appDate:'medium' }}</span>
          </div>
          <p *ngIf="h.notes" style="margin:4px 0 0;color:var(--text-muted);font-size: var(--font-size-sm)">{{ h.notes }}</p>
        </div>
      </p-dialog>

      <!-- Cross-Module Navigation -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/findings'])"><i class="pi pi-search"></i> All Findings</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/finding-trends'])"><i class="pi pi-chart-line"></i> Finding Trends</button>
        <button class="cross-link-btn" (click)="router.navigate(['/risk/register'])"><i class="pi pi-shield"></i> Risk Register</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px 16px; display: flex; flex-direction: column; align-items: center; }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-value.high { color: var(--warning); } .health-value.medium { color: var(--warning); } .health-value.low { color: var(--success); }
    .health-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .font-semibold { font-weight: 600; }
    .clickable-row { cursor: pointer; } .clickable-row:hover { background: var(--surface-50, #f9fafb); }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .text-muted { color: var(--text-muted); }
    .history-item { padding: 12px; border-bottom: 1px solid var(--surface-border); }
    .history-header { display: flex; justify-content: space-between; align-items: center; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditRepeatFindingsComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  historyItems = signal<Record<string, any>[]>([]);
  thisQuarterCount = signal(0);
  dialogVisible = false;
  historyVisible = false;
  form: Record<string, any> = { finding_id: '', original_finding_id: '', notes: '' };
  get criticalRepeatCount() { return this.items().filter((i: Record<string, any>) => i.occurrence_count >= 3).length; }

  ngOnInit() { this.load(); }

  load() {
    this.api.getRepeatFindings().subscribe({
      next: r => {
        const list = (r as any).repeat_findings || (r as any).data || [];
        this.items.set(list);
        const qStart = new Date(); qStart.setMonth(qStart.getMonth() - (qStart.getMonth() % 3), 1); qStart.setHours(0, 0, 0, 0);
        this.thisQuarterCount.set(list.filter((i: Record<string, any>) => i.created_at && new Date(i.created_at) >= qStart).length);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadRepeatFindings') }); }
    });
  }

  openDialog() {
    this.form = { finding_id: '', original_finding_id: '', notes: '' };
    this.dialogVisible = true;
  }

  save() {
    this.api.linkRepeatFinding(this.form as any).subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.linked') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLinkFinding') })
    });
  }

  viewHistory(item: Record<string, any>) {
    const findingId = item.finding_id || item.id;
    this.historyItems.set([]);
    this.historyVisible = true;
    this.api.getRepeatFindingHistory(findingId).subscribe({
      next: r => this.historyItems.set((r as any).history || (r as any).data || []),
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadHistory') })
    });
  }

}
