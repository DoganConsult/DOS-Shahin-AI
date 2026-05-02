import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { devError } from '../../../core/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-public-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TagModule, TabViewModule],
  template: `
    <app-page-shell icon="globe" [title]="'Public Content Explorer'"
      [subtitle]="'Browse publicly available GRC content and templates'"
      [breadcrumbs]="['Dashboard', 'Public Explorer']" [loading]="loading">
      <p-tabView *ngIf="!error">
        <p-tabPanel header="AI Agents">
          <div class="content-grid">
            <p-card *ngFor="let a of agents" styleClass="content-card">
              <h4>{{ a.name }}</h4>
              <p>{{ a.description }}</p>
              <p-tag [value]="a.category || 'general'" severity="info" />
            </p-card>
          </div>
        </p-tabPanel>
        <p-tabPanel header="Report Templates">
          <div class="content-grid">
            <p-card *ngFor="let r of reports" styleClass="content-card">
              <h4>{{ r.name }}</h4>
              <p>{{ r.description }}</p>
              <p-tag [value]="r.format || 'pdf'" />
            </p-card>
          </div>
        </p-tabPanel>
      </p-tabView>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .content-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .content-card h4{margin:0 0 6px;font-size: var(--font-size-base);font-weight:700}
    .content-card p{font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted));margin:0 0 10px}
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class PublicExplorerComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; agents: Record<string, unknown>[] = []; reports: Record<string, unknown>[] = [];
  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}
  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getPublicAgents().subscribe({
      next: (d: Record<string, unknown>) => { this.agents = Array.isArray(d) ? d : d.agents || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
    this.operationsSvc.getPublicReportTemplates().subscribe({
      next: (d: Record<string, unknown>) => { this.reports = Array.isArray(d) ? d : d.templates || []; },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
