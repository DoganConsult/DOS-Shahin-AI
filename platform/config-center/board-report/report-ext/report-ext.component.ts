import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-report-ext',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, TabViewModule, ToastModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="file-export" [title]="i18n.translate('reportExt.title')"
      [subtitle]="i18n.translate('reportExt.subtitle')"
      [breadcrumbs]="[i18n.translate('reportExt.breadcrumbDashboard'), i18n.translate('reportExt.breadcrumbExtendedReports')]" [loading]="loading">
      <p-tabView *ngIf="!error">
        <p-tabPanel [header]="i18n.translate('reportExt.templates')">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('reportExt.ariaTemplatesTable')" [value]="templates" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>{{ i18n.translate('reportExt.template') }}</th><th>{{ i18n.translate('reportExt.type') }}</th><th>{{ i18n.translate('reportExt.actions') }}</th></tr></ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td><strong>{{ t.name || t.id }}</strong></td>
                <td><p-tag [value]="t.type || 'report'" /></td>
                <td><p-button [label]="i18n.translate('reportExt.generate')" icon="pi pi-file" class="p-button-sm" (onClick)="generateReport(t)" /></td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('reportExt.maturityScorecard')">
          <div class="stats-grid" *ngIf="scorecard">
            <div class="stat-card" *ngFor="let s of scorecardItems">
              <div class="stat-label">{{ s.label }}</div>
              <div class="stat-value">{{ s.value }}</div>
            </div>
          </div>
          <p *ngIf="!scorecard" class="empty-msg">{{ i18n.translate('reportExt.loadingScorecard') }}</p>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('reportExt.boardView')">
          <div *ngIf="boardView" class="board-view">
            <pre class="mono">{{ boardView | json }}</pre>
          </div>
          <p *ngIf="!boardView" class="empty-msg">{{ i18n.translate('reportExt.loadingBoardView') }}</p>
        </p-tabPanel>
      </p-tabView>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">{{ i18n.translate('reportExt.retry') }}</button>
      </div>
    </app-page-shell>
    <p-toast />
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--surface); border-radius: var(--radius, 8px); padding: 20px; border: 1px solid var(--border-subtle); }
    .stat-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-caption); font-weight: 600; margin-bottom: 6px; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); }
    .empty-msg { text-align: center; color: var(--text-caption); padding: 32px; }
    .mono { font-family: 'Fira Code', monospace; font-size: var(--font-size-sm); }
    pre { background: var(--surface-ground); padding: 12px; border-radius: var(--radius-sm); overflow-x: auto; max-height: 400px; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class ReportExtComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  templates: Record<string, unknown>[] = [];
  scorecard: Record<string, unknown> | null = null;
  scorecardItems: Record<string, unknown>[] = [];
  boardView: Record<string, unknown> | null = null;

  constructor(public i18n: I18nService, private msg: MessageService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getReportExtTemplates().subscribe({
      next: (d: Record<string, unknown>) => { this.templates = asArray(d, 'templates'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('reportExt.failedToLoadData'); this.loading = false; this.cdr.markForCheck(); }
    });
    this.apiclientSvc.get('/report-ext/maturity-scorecard').subscribe({
      next: (d: Record<string, unknown>) => {
        this.scorecard = d;
        this.scorecardItems = Object.entries(d || {}).filter(([k]) => k !== 'timestamp').map(([k, v]) => ({ label: k, value: v }));
      }
    });
    this.apiclientSvc.get('/report-ext/board-view').subscribe({ next: (d: Record<string, unknown>) => { this.boardView = d; } });
  }

  generateReport(t: Record<string, unknown>) {
    const id = t.id || t.name;
    this.apiclientSvc.post('/report-ext/generate', { templateId: id }).subscribe({
      next: (d: Record<string, unknown>) => { this.msg.add({ severity: 'success', summary: this.i18n.translate('reportExt.reportGenerated'), detail: d.report_id || 'OK' }); },
      error: (e: unknown) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('reportExt.error'), detail: e.error?.error }); }
    });
  }

}
