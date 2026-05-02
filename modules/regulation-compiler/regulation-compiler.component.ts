import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-regulation-compiler',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, InputTextModule, ButtonModule, TagModule, TableModule, ToastModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="gavel" title="Regulation Compiler"
      subtitle="Compile regulatory instruments into structured control frameworks"
      [breadcrumbs]="['Dashboard', 'Regulation Compiler']" [loading]="loading">
      <div class="search-row" *ngIf="!error">
        <input pInputText [(ngModel)]="instrumentId" placeholder="Enter Instrument ID (e.g. NCA-ECC)" aria-label="Enter Instrument ID (e.g. NCA-ECC)" class="search-input" />
        <p-button label="Compile" icon="pi pi-cog" (onClick)="compile()" />
      </div>
      <div *ngIf="result && !error" class="result-section">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Instrument</div><div class="stat-value small">{{ result.instrumentId || instrumentId }}</div></div>
          <div class="stat-card"><div class="stat-label">Controls</div><div class="stat-value">{{ result.controls?.length || 0 }}</div></div>
          <div class="stat-card"><div class="stat-label">Domains</div><div class="stat-value">{{ result.domains?.length || 0 }}</div></div>
        </div>
        <p-table aria-label="Data table" [value]="result.controls || []" [paginator]="true" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>Control ID</th><th>Title</th><th>Domain</th><th>Level</th></tr></ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td><code>{{ c.id || c.control_id }}</code></td>
              <td>{{ c.title || c.name }}</td>
              <td>{{ c.domain }}</td>
              <td><p-tag [value]="c.level || 'standard'" /></td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; compile()">Retry</button>
      </div>
    </app-page-shell>
    <p-toast />
  `,
  styles: [`
    .search-row { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
    .search-input { width: 400px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--surface); border-radius: var(--radius, 8px); padding: 20px; border: 1px solid var(--border-subtle); }
    .stat-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-caption); font-weight: 600; margin-bottom: 6px; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); }
    .stat-value.small { font-size: var(--font-size-base); font-weight: 600; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class RegulationCompilerComponent {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  instrumentId = '';
  result: GrcRecord | null = null;

  constructor(public i18n: I18nService, private msg: MessageService, private complianceSvc: GrcComplianceService) {}

  compile() {
    if (!this.instrumentId) return;
    this.loading = true;
    this.complianceSvc.compileRegulation(this.instrumentId).subscribe({
      next: (d) => { this.result = d; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.i18n.translate('common.failedToLoadData'); this.loading = false; this.cdr.markForCheck(); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error }); }
    });
  }
}
