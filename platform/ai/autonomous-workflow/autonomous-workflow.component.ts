import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-autonomous-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, TableModule, TagModule, ButtonModule, TabViewModule, InputSwitchModule, InputNumberModule, ToastModule, EmptyStateComponent],
  providers: [MessageService],
  template: `
    @if (!embedded) {
      <app-page-shell icon="bolt" [title]="i18n.translate('autonomousWorkflow.title')"
        [subtitle]="i18n.translate('autonomousWorkflow.subtitle')"
        [breadcrumbs]="['Dashboard', i18n.translate('autonomousWorkflow.title')]" [loading]="loading">
        <ng-container *ngTemplateOutlet="body" />
      </app-page-shell>
    } @else {
      <ng-container *ngTemplateOutlet="body" />
    }
    <ng-template #body>
      <p-tabView *ngIf="!error">
        <p-tabPanel [header]="i18n.translate('autonomousWorkflow.aiQueue')">
          <p-table [attr.aria-label]="i18n.translate('autonomousWorkflow.queueTable')" [value]="queue" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Execution</th><th>Workflow</th><th>Step</th><th>Status</th><th>Actions</th></tr></ng-template>
            <ng-template pTemplate="body" let-q>
              <tr>
                <td><code>{{ q.execution_id || q.id }}</code></td>
                <td>{{ q.workflow_id }}</td>
                <td>{{ q.step_id }}</td>
                <td><p-tag [value]="q.status || 'pending'" [severity]="q.status === 'completed' ? 'success' : q.status === 'rejected' ? 'danger' : 'warning'" /></td>
                <td class="actions">
                  <p-button [label]="i18n.translate('autonomousWorkflow.accept')" icon="pi pi-check" class="p-button-sm p-button-success" (onClick)="review(q, 'accepted')" />
                  <p-button [label]="i18n.translate('autonomousWorkflow.reject')" icon="pi pi-times" class="p-button-sm p-button-danger" (onClick)="review(q, 'rejected')" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="p-0"><app-empty-state [title]="i18n.translate('autonomousWorkflow.noItemsInQueue')" [description]="i18n.translate('autonomousWorkflow.noItemsInQueueDesc')" variant="default" /></td></tr></ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('autonomousWorkflow.configuration')">
          <div class="config-form" *ngIf="config">
            <div class="field"><label>Enabled</label><p-inputSwitch [(ngModel)]="config.enabled" /></div>
            <div class="field"><label>AI Can Execute Actions</label><p-inputSwitch [(ngModel)]="config.aiCanExecuteActions" /></div>
            <div class="field"><label>AI Can Draft Approvals</label><p-inputSwitch [(ngModel)]="config.aiCanDraftApprovals" /></div>
            <div class="field"><label>Require Human Review</label><p-inputSwitch [(ngModel)]="config.requireHumanReview" /></div>
            <div class="field"><label>SLA Grace Multiplier</label><p-inputNumber [(ngModel)]="config.slaGraceMultiplier" [min]="0.1" [max]="10" [step]="0.1" /></div>
            <div class="field"><label>Cron Interval (minutes)</label><p-inputNumber [(ngModel)]="config.cronIntervalMinutes" [min]="1" [max]="1440" /></div>
            <p-button label="Save Configuration" icon="pi pi-save" (onClick)="saveConfig()" />
          </div>
        </p-tabPanel>
      </p-tabView>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="retry()">{{ i18n.translate('common.retry') }}</button>
      </div>
    </ng-template>
    <p-toast />
  `,
  styles: [`
    .config-form { max-width: 500px; }
    .field { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; }
    .actions { display: flex; gap: 4px; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class AutonomousWorkflowComponent implements OnInit {
  @Input() embedded = false;
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  error = '';
  queue: GrcRecord[] = [];
  config: GrcRecord | null = null;

  constructor(public i18n: I18nService, private msg: MessageService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/autonomous/workflows/ai-queue').subscribe({
      next: (d) => { this.queue = asArray(d, 'queue'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('common.failedToLoad'); this.loading = false; this.cdr.markForCheck(); }
    });
    this.apiclientSvc.get('/autonomous/workflows/autonomous/config').subscribe({
      next: (d) => { this.config = d; },
      error: () => { this.config = { enabled: false, aiCanExecuteActions: false, aiCanDraftApprovals: false, requireHumanReview: true, slaGraceMultiplier: 1, cronIntervalMinutes: 60 }; }
    });
  }

  retry() { this.error = ''; this.ngOnInit(); }

  review(item: GrcRecord, decision: string) {
    const id = item.execution_id || item.id;
    this.apiclientSvc.post(`/autonomous/workflows/ai-queue/${id}/review`, { decision }).subscribe({
      next: () => { item.status = decision; this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('autonomousWorkflow.stepReviewed') }); this.cdr.markForCheck(); },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error }); }
    });
  }

  saveConfig() {
    this.apiclientSvc.put('/autonomous/workflows/autonomous/config', this.config).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('autonomousWorkflow.configSaved') }); },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error }); }
    });
  }
}
