import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-ext',
    imports: [CommonModule, AppDatePipe, PageShellComponent, TableModule, TagModule, ButtonModule, ToastModule, RaciPanelComponent],
    providers: [MessageService],
    template: `
    <app-page-shell icon="sitemap" title="Workflow Extensions"
      subtitle="Predefined workflow templates, instantiation, and activation"
      [breadcrumbs]="['Admin', 'Workflow Extensions']" [loading]="loading">
      <app-raci-panel entityType="policy" entityId="" [canEdit]="true" />
      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Templates table" [value]="templates" styleClass="p-datatable-sm" *ngIf="!error">
        <ng-template pTemplate="header"><tr><th>Template</th><th>Description</th><th>Steps</th><th>Category</th><th>Actions</th></tr></ng-template>
        <ng-template pTemplate="body" let-t>
          <tr>
            <td><strong>{{ t.name || t.id }}</strong></td>
            <td>{{ t.description || '—' }}</td>
            <td>{{ t.steps?.length || t.stepCount || '—' }}</td>
            <td><p-tag [value]="t.category || 'general'" /></td>
            <td><p-button label="Instantiate" icon="pi pi-copy" class="p-button-sm" (onClick)="instantiate(t)" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No workflow templates</td></tr></ng-template>
      </p-table>

      <div class="section" *ngIf="instantiated.length > 0 && !error">
        <h3>Instantiated Workflows</h3>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Instantiated table" [value]="instantiated" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>Workflow ID</th><th>Template</th><th>Status</th><th>Created</th></tr></ng-template>
          <ng-template pTemplate="body" let-w>
            <tr>
              <td><code>{{ w.workflowId || w.id }}</code></td>
              <td>{{ w.templateName || w.template }}</td>
              <td><p-tag [value]="w.status || 'created'" severity="success" /></td>
              <td>{{ w.createdAt | appDate:'short' }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
    <p-toast />
  `,
    styles: [`.section { margin-top: 24px; } .section h3 { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 12px; } .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}`]
})
export class WorkflowExtComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  templates: GrcRecord[] = [];
  instantiated: GrcRecord[] = [];

  constructor(public i18n: I18nService, private msg: MessageService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/workflow-ext/workflow-templates').subscribe({
      next: (d) => { this.templates = asArray(d, 'templates'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  instantiate(t: GrcRecord) {
    const id = t.id || t.name;
    this.apiclientSvc.post(`/workflow-ext/workflow-templates/${id}/instantiate`, {}).subscribe({
      next: (d) => {
        this.instantiated.unshift({ ...d, templateName: t.name || id, createdAt: new Date().toISOString() });
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.workflowInstantiated') });
      },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error }); }
    });
  }
}
