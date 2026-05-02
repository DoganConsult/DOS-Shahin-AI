import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  selector: 'app-ai-recommendation-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule],
  template: `
    <app-page-shell icon="lightbulb"
      [title]="i18n.translate('aiRecommendations.title')"
      [subtitle]="i18n.translate('aiRecommendations.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Recommendations']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>
      <p-card>
        <p-table [value]="recommendations()" [paginator]="true" [rows]="20" [rowHover]="true" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Agent</th>
              <th>Type</th>
              <th>Title</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-rec>
            <tr>
              <td>{{ rec.agent_id }}</td>
              <td>{{ rec.decision_type }}</td>
              <td>{{ rec.outcome?.title || rec.explanation || '-' }}</td>
              <td>{{ rec.confidence ? (rec.confidence * 100).toFixed(0) + '%' : '-' }}</td>
              <td><p-tag [value]="rec.outcome?.status || 'pending'" [severity]="getStatusSeverity(rec.outcome?.status)" /></td>
              <td>{{ rec.created_at | date:'short' }}</td>
              <td>
                <p-button *ngIf="rec.outcome?.status === 'pending'" icon="pi pi-check" severity="success" [text]="true" (onClick)="accept(rec)" />
                <p-button *ngIf="rec.outcome?.status === 'pending'" icon="pi pi-times" severity="danger" [text]="true" (onClick)="reject(rec)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center p-4">No recommendations found</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>
  `,
})
export class AiRecommendationInboxComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  recommendations = signal<GrcRecord[]>([]);

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    this.apiclientSvc.get('/api/ai-os/recommendations').subscribe({
      next: (res) => { this.recommendations.set(res?.items || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  accept(rec: GrcRecord) {
    this.apiclientSvc.post(`/api/ai-os/recommendations/${rec.decision_id}/accept`, {}).subscribe({ next: () => this.loadData() });
  }

  reject(rec: GrcRecord) {
    this.apiclientSvc.post(`/api/ai-os/recommendations/${rec.decision_id}/reject`, {}).subscribe({ next: () => this.loadData() });
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'accepted': return 'success';
      case 'rejected': return 'danger';
      case 'pending': return 'warning';
      default: return 'info';
    }
  }
}
