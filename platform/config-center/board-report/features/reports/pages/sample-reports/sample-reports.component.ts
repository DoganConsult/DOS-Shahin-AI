import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sample-reports',
    imports: [CommonModule, PageShellComponent, CardModule, TagModule, ButtonModule],
    template: `
    <app-page-shell icon="file" [title]="'Sample Reports'"
      [subtitle]="'Pre-built report templates and sample outputs'"
      [breadcrumbs]="['Dashboard', 'Sample Reports']" [loading]="loading">
      <div class="report-grid" *ngIf="!error">
        <p-card *ngFor="let r of reports" styleClass="report-card">
          <div class="report-header">
            <i class="pi pi-file-pdf report-icon"></i>
            <div>
              <h3>{{ r.name || r.title }}</h3>
              <p>{{ r.description }}</p>
            </div>
          </div>
          <div class="report-meta">
            <p-tag [value]="r.category || 'general'" severity="info" />
            <p-tag [value]="r.format || 'PDF'" />
          </div>
          <p-button label="Preview" icon="pi pi-eye" size="small" [outlined]="true" (onClick)="preview(r)" />
        </p-card>
      </div>
      <div *ngIf="reports.length === 0 && !loading && !error" class="empty-state">
        <i class="pi pi-file empty-icon"></i>
        <p>No sample reports available</p>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .report-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
    .report-header{display:flex;gap:12px;align-items:flex-start}
    .report-icon{font-size: var(--font-size-3xl);color:var(--error);flex-shrink:0}
    .report-header h3{margin:0;font-size: var(--font-size-base);font-weight:700}
    .report-header p{margin:4px 0 0;font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
    .report-meta{display:flex;gap:6px;margin:12px 0}
    .empty-state{text-align:center;padding:48px;color:var(--text-muted)}
    .empty-icon{font-size:48px;display:block;margin-bottom:12px}
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class SampleReportsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; reports: Record<string, any>[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/public/sample-reports').subscribe({
      next: (d: Record<string, any>) => { this.reports = Array.isArray(d) ? d : d.reports || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }
  preview(r: Record<string, any>) { /* open preview */ }

}
