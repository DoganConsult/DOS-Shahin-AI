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
import { InputSwitchModule } from 'primeng/toggleswitch';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    selector: 'app-ai-event-triggers',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, InputSwitchModule],
    template: `
    <app-page-shell icon="zap"
      [title]="i18n.translate('aiEventTriggers.title')"
      [subtitle]="i18n.translate('aiEventTriggers.subtitle')"
      [breadcrumbs]="['Dashboard', 'Event Triggers']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-plus" [label]="i18n.translate('common.add')" (onClick)="showCreate = true" class="mr-2" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>
      <p-card>
        <p-table [value]="bindings()" [paginator]="true" [rows]="20" [rowHover]="true" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Event Type</th>
              <th>Target Agent</th>
              <th>Action</th>
              <th>Cooldown</th>
              <th>Last Triggered</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-b>
            <tr>
              <td><p-tag [value]="b.event_type" /></td>
              <td>{{ b.target_agent_id }}</td>
              <td><p-tag [value]="b.action_type" [severity]="getActionSeverity(b.action_type)" /></td>
              <td>{{ b.cooldown_seconds }}s</td>
              <td>{{ b.last_triggered_at ? (b.last_triggered_at | date:'short') : 'Never' }}</td>
              <td><p-inputSwitch [(ngModel)]="b.enabled" (onChange)="toggleBinding(b)" /></td>
              <td>
                <p-button icon="pi pi-play" severity="info" [text]="true" pTooltip="Test Fire" (onClick)="testFire(b)" />
                <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="deleteBinding(b)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center p-4">No event triggers configured</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>

    <p-dialog header="Add Event Trigger" [(visible)]="showCreate" [modal]="true" [style]="{ width: '500px' }">
      <div class="flex flex-column gap-3 mt-3">
        <div class="flex flex-column gap-1">
          <label>Event Type</label>
          <input pInputText [(ngModel)]="newBinding.eventType" placeholder="e.g. risk.exceeded_appetite" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Target Agent ID</label>
          <input pInputText [(ngModel)]="newBinding.targetAgentId" placeholder="e.g. A07" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Action Type</label>
          <p-dropdown [options]="actionTypes" [(ngModel)]="newBinding.actionType" placeholder="Select action" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Cooldown (seconds)</label>
          <input pInputText type="number" [(ngModel)]="newBinding.cooldownSeconds" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showCreate = false" />
        <p-button label="Create" (onClick)="createBinding()" />
      </ng-template>
    </p-dialog>
  `
})
export class AiEventTriggersComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  bindings = signal<GrcRecord[]>([]);
  showCreate = false;
  newBinding = { eventType: '', targetAgentId: '', actionType: 'run_agent', cooldownSeconds: 60 };
  actionTypes = ['run_agent', 'notify', 'webhook', 'log'];

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    this.apiclientSvc.get('/api/ai-os/event-triggers').subscribe({
      next: (res) => { this.bindings.set(res?.items || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  createBinding() {
    this.apiclientSvc.post('/api/ai-os/event-triggers', this.newBinding).subscribe({
      next: () => { this.showCreate = false; this.loadData(); },
    });
  }

  toggleBinding(b: GrcRecord) {
    this.apiclientSvc.patch(`/api/ai-os/event-triggers/${b.binding_id}/toggle`, { enabled: b.enabled }).subscribe();
  }

  testFire(b: GrcRecord) {
    this.apiclientSvc.post(`/api/ai-os/event-triggers/${b.binding_id}/test-fire`, {}).subscribe();
  }

  deleteBinding(b: GrcRecord) {
    this.apiclientSvc.del(`/api/ai-os/event-triggers/${b.binding_id}`).subscribe({ next: () => this.loadData() });
  }

  getActionSeverity(action: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (action) {
      case 'run_agent': return 'success';
      case 'webhook': return 'warning';
      case 'notify': return 'info';
      default: return 'info';
    }
  }
}
