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
import { InputSwitchModule } from 'primeng/toggleswitch';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  selector: 'app-ai-runtime-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputSwitchModule],
  template: `
    <app-page-shell icon="settings"
      [title]="i18n.translate('aiRuntimeConfig.title')"
      [subtitle]="i18n.translate('aiRuntimeConfig.subtitle')"
      [breadcrumbs]="['Dashboard', 'Runtime Config']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>
      <p-card>
        <p-table [value]="configs()" [paginator]="true" [rows]="20" [rowHover]="true" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Agent ID</th>
              <th>Enabled</th>
              <th>Max Retries</th>
              <th>Retry Delay</th>
              <th>Cooldown</th>
              <th>Stuck Threshold</th>
              <th>Escalation</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td><strong>{{ c.agent_id }}</strong></td>
              <td><p-tag [value]="c.enabled ? 'Active' : 'Disabled'" [severity]="c.enabled ? 'success' : 'danger'" /></td>
              <td>{{ c.max_retries }}</td>
              <td>{{ c.retry_delay_ms }}ms</td>
              <td>{{ c.cooldown_seconds }}s</td>
              <td>{{ c.stuck_threshold_ms / 1000 }}s</td>
              <td><p-tag [value]="c.escalation_on_failure" /></td>
              <td>
                <p-button icon="pi pi-pencil" severity="info" [text]="true" (onClick)="openEdit(c)" />
                <p-button [icon]="c.enabled ? 'pi pi-pause' : 'pi pi-play'" [severity]="c.enabled ? 'warning' : 'success'" [text]="true" (onClick)="toggleAgent(c)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center p-4">No runtime configs found</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>

    <p-dialog header="Edit Runtime Config" [(visible)]="showEdit" [modal]="true" [style]="{ width: '500px' }">
      <div class="flex flex-column gap-3 mt-3" *ngIf="editConfig">
        <div class="flex flex-column gap-1">
          <label>Agent: <strong>{{ editConfig.agent_id }}</strong></label>
        </div>
        <div class="flex align-items-center gap-2">
          <label>Enabled</label>
          <p-inputSwitch [(ngModel)]="editConfig.enabled" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Max Retries</label>
          <input pInputText type="number" [(ngModel)]="editConfig.max_retries" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Retry Delay (ms)</label>
          <input pInputText type="number" [(ngModel)]="editConfig.retry_delay_ms" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Cooldown (seconds)</label>
          <input pInputText type="number" [(ngModel)]="editConfig.cooldown_seconds" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Stuck Threshold (ms)</label>
          <input pInputText type="number" [(ngModel)]="editConfig.stuck_threshold_ms" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Escalation on Failure</label>
          <input pInputText [(ngModel)]="editConfig.escalation_on_failure" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showEdit = false" />
        <p-button label="Save" (onClick)="saveConfig()" />
      </ng-template>
    </p-dialog>
  `,
})
export class AiRuntimeConfigComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  configs = signal<GrcRecord[]>([]);
  showEdit = false;
  editConfig: GrcRecord | null = null;

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    this.apiclientSvc.get('/api/ai-os/agents/runtime-configs').subscribe({
      next: (res) => { this.configs.set(res?.items || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openEdit(c: GrcRecord) {
    this.editConfig = { ...c };
    this.showEdit = true;
  }

  saveConfig() {
    if (!this.editConfig) return;
    this.apiclientSvc.put(`/api/ai-os/agents/${this.editConfig.agent_id}/runtime`, {
      enabled: this.editConfig.enabled,
      maxRetries: this.editConfig.max_retries,
      retryDelayMs: this.editConfig.retry_delay_ms,
      cooldownSeconds: this.editConfig.cooldown_seconds,
      stuckThresholdMs: this.editConfig.stuck_threshold_ms,
      escalationOnFailure: this.editConfig.escalation_on_failure,
    }).subscribe({
      next: () => { this.showEdit = false; this.loadData(); },
    });
  }

  toggleAgent(c: GrcRecord) {
    this.apiclientSvc.patch(`/api/ai-os/agents/${c.agent_id}/enable`, { enabled: !c.enabled }).subscribe({
      next: () => this.loadData(),
    });
  }
}
