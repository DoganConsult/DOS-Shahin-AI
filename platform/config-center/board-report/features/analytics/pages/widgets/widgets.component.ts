import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-widgets',
    imports: [CommonModule, PageShellComponent, CardModule, TagModule],
    template: `
    <app-page-shell icon="th-large" [title]="'Widget Gallery'"
      [subtitle]="'Available dashboard widgets and embeddable components'"
      [breadcrumbs]="['Dashboard', 'Widgets']" [loading]="loading">
      <div class="widget-grid">
        <p-card *ngFor="let w of widgets" styleClass="widget-card">
          <div class="widget-header">
            <i class="pi" [ngClass]="w.icon || 'pi-chart-bar'"></i>
            <h3>{{ w.name }}</h3>
          </div>
          <p class="widget-desc">{{ w.description || 'Dashboard widget' }}</p>
          <div class="widget-meta">
            <p-tag [value]="w.category || 'general'" severity="info" />
            <p-tag [value]="w.size || 'medium'" />
          </div>
        </p-card>
      </div>
      <div *ngIf="widgets.length === 0 && !loading && !error" class="empty-state">
        <i class="pi pi-th-large empty-icon"></i>
        <p>No widgets available</p>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .widget-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .widget-header{display:flex;align-items:center;gap:10px}
    .widget-header i{font-size: var(--font-size-xl);color:var(--primary,#1e40af)}
    .widget-header h3{margin:0;font-size: var(--font-size-base);font-weight:700}
    .widget-desc{font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted));margin:8px 0}
    .widget-meta{display:flex;gap:6px}
    .empty-state{text-align:center;padding:48px;color:var(--text-muted)}
    .empty-icon{font-size:48px;display:block;margin-bottom:12px}
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class WidgetsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; widgets: Record<string, unknown>[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.loading = true;
    this.error = '';
    this.apiclientSvc.get('/widgets').subscribe({
      next: (d: Record<string, unknown>) => { this.widgets = Array.isArray(d) ? d : d.widgets || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

}
