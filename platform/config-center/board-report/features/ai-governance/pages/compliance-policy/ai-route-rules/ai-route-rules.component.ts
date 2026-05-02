import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    selector: 'app-ai-route-rules',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule],
    template: `
    <app-page-shell icon="git-branch"
      [title]="i18n.translate('aiRouteRules.title')"
      [subtitle]="i18n.translate('aiRouteRules.subtitle')"
      [breadcrumbs]="['Dashboard', 'Route Rules']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-plus" [label]="i18n.translate('common.add')" (onClick)="showCreate = true" class="mr-2" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>
      <p-card>
        <p-table [value]="rules()" [paginator]="true" [rows]="20" [rowHover]="true" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Rule Name</th>
              <th>Entity Type</th>
              <th>Target Agent</th>
              <th>Priority</th>
              <th>Condition</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>{{ r.rule_name || r.route_rule_id }}</td>
              <td><p-tag [value]="r.entity_type" /></td>
              <td>{{ r.target_agent_id }}</td>
              <td>{{ r.priority }}</td>
              <td><code>{{ r.condition_json | json }}</code></td>
              <td>
                <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="deleteRule(r)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center p-4">No route rules configured</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>

    <p-dialog header="Add Route Rule" [(visible)]="showCreate" [modal]="true" [style]="{ width: '500px' }">
      <div class="flex flex-column gap-3 mt-3">
        <div class="flex flex-column gap-1">
          <label>Entity Type</label>
          <input pInputText [(ngModel)]="newRule.entityType" placeholder="e.g. risk, incident" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Target Agent ID</label>
          <input pInputText [(ngModel)]="newRule.targetAgentId" placeholder="e.g. A01" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Priority</label>
          <input pInputText type="number" [(ngModel)]="newRule.priority" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showCreate = false" />
        <p-button label="Create" (onClick)="createRule()" />
      </ng-template>
    </p-dialog>
  `
})
export class AiRouteRulesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  rules = signal<GrcRecord[]>([]);
  showCreate = false;
  newRule = { entityType: '', targetAgentId: '', priority: 100 };

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    this.apiclientSvc.get('/api/ai-os/route-rules').subscribe({
      next: (res) => { this.rules.set(res?.items || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  createRule() {
    this.apiclientSvc.post('/api/ai-os/route-rules', this.newRule).subscribe({
      next: () => { this.showCreate = false; this.loadData(); },
    });
  }

  deleteRule(r: GrcRecord) {
    this.apiclientSvc.del(`/api/ai-os/route-rules/${r.route_rule_id}`).subscribe({ next: () => this.loadData() });
  }
}
