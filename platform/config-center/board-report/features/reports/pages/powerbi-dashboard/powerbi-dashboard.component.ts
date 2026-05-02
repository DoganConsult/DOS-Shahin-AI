import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { PowerBIEmbedComponent } from '@app/shared/components/grc-core/powerbi-embed.component';
import { TabViewModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-powerbi-dashboard',
    imports: [
        CommonModule, PageShellComponent, PowerBIEmbedComponent,
        TabViewModule, MessageModule, ButtonModule, SkeletonModule,
    ],
    template: `
    <app-page-shell icon="chart-bar" title="Power BI Dashboards"
      subtitle="Interactive Power BI reports embedded from your organization"
      [breadcrumbs]="['Dashboard', 'Power BI']" [loading]="loading">

      <p-message *ngIf="!configured && !loading" severity="info"
        text="Power BI is not configured. Go to Integrations Hub to set up your Azure AD credentials and workspace."
        styleClass="w-full mb-3" />

      <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3" />

      <div *ngIf="configured && reports.length === 0 && !loading">
        <p-message severity="warning" text="No Power BI reports found in the configured workspace." styleClass="w-full" />
      </div>

      <div *ngIf="configured && reports.length > 0">
        <p-tabView *ngIf="reports.length > 1">
          <p-tabPanel *ngFor="let report of reports" [header]="report.name">
            <app-powerbi-embed [reportId]="report.id" height="700px" />
          </p-tabPanel>
        </p-tabView>

        <app-powerbi-embed *ngIf="reports.length === 1"
          [reportId]="reports[0].id" height="700px" />
      </div>
    </app-page-shell>
  `,
    styles: [`
    :host { display: block; }
    .mb-3 { margin-bottom: 16px; }
    .w-full { width: 100%; }
  `]
})
export class PowerBIDashboardComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  configured = false;
  reports: Record<string, any>[] = [];
  error = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    // Check if Power BI is configured
    this.apiclientSvc.get('/powerbi/status').subscribe({
      next: (d: Record<string, any>) => {
        this.configured = d.configured;
        if (this.configured) {
          this.loadReports();
        } else {
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.configured = false;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadReports() {
    this.apiclientSvc.get('/powerbi/reports').subscribe({
      next: (d: Record<string, any>) => {
        this.reports = d.reports || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e: any) => {
        this.error = e.error?.error || 'Failed to load Power BI reports';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

}
