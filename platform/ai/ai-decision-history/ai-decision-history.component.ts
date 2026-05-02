import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  selector: 'app-ai-decision-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule],
  template: `
    <app-page-shell icon="history"
      [title]="i18n.translate('aiDecisions.title')"
      [subtitle]="i18n.translate('aiDecisions.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Decision History']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-list" label="View in AI OS Dashboard" severity="secondary" (onClick)="goToDecisionsList()" class="me-2" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>
      <p-card>
        <p-table [value]="decisions()" [paginator]="true" [rows]="20" [rowHover]="true" responsiveLayout="scroll"
          styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>Agent</th>
              <th>Type</th>
              <th>Entity</th>
              <th>Confidence</th>
              <th>Explanation</th>
              <th>Created</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-dec>
            <tr style="cursor: pointer" (click)="onRowSelect(dec)">
              <td>{{ dec.agent_id }}</td>
              <td><p-tag [value]="dec.decision_type" /></td>
              <td>{{ dec.entity_type ? dec.entity_type + ':' + (dec.entity_id || '') : '-' }}</td>
              <td>{{ dec.confidence ? (dec.confidence * 100).toFixed(0) + '%' : '-' }}</td>
              <td class="max-w-xs truncate">{{ dec.explanation || '-' }}</td>
              <td>{{ dec.created_at | date:'short' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center p-4">No decisions recorded</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>
  `,
})
export class AiDecisionHistoryComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private router = inject(Router);
  loading = signal(true);
  decisions = signal<GrcRecord[]>([]);

  ngOnInit() { this.loadData(); }

  goToDecisionsList(): void {
    this.router.navigate(['/ai-os-dashboard', 'decisions']);
  }

  onRowSelect(dec: GrcRecord): void {
    const id = dec?.decision_id ?? dec?.id;
    if (id) this.router.navigate(['/ai-os-dashboard', 'decisions', id]);
  }

  loadData() {
    this.loading.set(true);
    this.apiclientSvc.get('/api/ai-os/decisions').subscribe({
      next: (res) => { this.decisions.set(res?.decisions || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
