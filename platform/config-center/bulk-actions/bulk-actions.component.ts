import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bulk-actions',
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, InputTextModule, InputTextarea, DropdownModule, ButtonModule, TagModule, ToastModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="list-check" [title]="i18n.translate('bulkActions.title')"
      [subtitle]="i18n.translate('bulkActions.subtitle')"
      [breadcrumbs]="['Admin', i18n.translate('bulkActions.title')]" [loading]="loading">
      <p-card [header]="i18n.translate('bulkActions.executeBulkAction')" *ngIf="!error">
        <div class="form-grid">
          <div class="field"><label>Entity Type</label>
            <p-dropdown [options]="entityTypes" [(ngModel)]="entityType" [placeholder]="i18n.translate('bulkActions.selectEntityType')" appendTo="body" class="w-full" />
          </div>
          <div class="field"><label>Action Type</label>
            <p-dropdown [options]="actionTypes" [(ngModel)]="actionType" [placeholder]="i18n.translate('bulkActions.selectAction')" appendTo="body" class="w-full" />
          </div>
          <div class="field"><label>Entity IDs (comma-separated)</label>
            <input pInputText [(ngModel)]="entityIds" class="w-full" placeholder="id1, id2, id3" aria-label="id1, id2, id3" />
          </div>
          <div class="field"><label>Parameters (JSON)</label>
            <textarea pInputTextarea [(ngModel)]="params" rows="4" class="w-full mono" placeholder='{"status":"active"}'></textarea>
          </div>
          <p-button [label]="i18n.translate('bulkActions.execute')" icon="pi pi-bolt" (onClick)="execute()" />
        </div>
      </p-card>
      <div class="result-section" *ngIf="result && !error">
        <p-card [header]="i18n.translate('bulkActions.result')">
          <p-tag [value]="result.success ? (i18n.translate('common.success')) : (i18n.translate('common.error'))" [severity]="result.success ? 'success' : 'danger'" />
          <pre class="mono">{{ result.data | json }}</pre>
        </p-card>
      </div>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="retry()">{{ i18n.translate('common.retry') }}</button>
      </div>
    </app-page-shell>
    <p-toast />
  `,
    styles: [`
    .form-grid { max-width: 600px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; }
    .mono { font-family: 'Fira Code', monospace; font-size: var(--font-size-sm); }
    .result-section { margin-top: 24px; }
    pre { background: var(--surface-ground); padding: 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); overflow-x: auto; margin-top: 8px; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class BulkActionsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  error = '';
  entityType = '';
  actionType = '';
  entityIds = '';
  params = '{}';
  result: GrcRecord | null = null;
  entityTypes = [
    { label: 'Risks', value: 'risks' }, { label: 'Controls', value: 'controls' },
    { label: 'Policies', value: 'policies' }, { label: 'Findings', value: 'findings' },
    { label: 'Assets', value: 'assets' }, { label: 'Evidence', value: 'evidence' },
  ];
  actionTypes = [
    { label: 'Update Status', value: 'update_status' }, { label: 'Assign Owner', value: 'assign_owner' },
    { label: 'Archive', value: 'archive' }, { label: 'Delete', value: 'delete' },
  ];

  constructor(public i18n: I18nService, private msg: MessageService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/auto-crud/schemas').subscribe({
      next: () => { this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('common.failedToLoad'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  execute() {
    if (!this.entityType || !this.actionType || !this.entityIds) return;
    this.loading = true;
    try {
      const ids = this.entityIds.split(',').map(s => s.trim()).filter(Boolean);
      const p = JSON.parse(this.params);
      this.apiclientSvc.post(`/bulk-actions/${this.entityType}`, { entityIds: ids, actionType: this.actionType, params: p }).subscribe({
        next: (d) => { this.result = d; this.loading = false; this.cdr.markForCheck(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('bulkActions.executed') }); },
        error: (e) => { this.loading = false; this.cdr.markForCheck(); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error || e.error?.errors?.join(', ') }); }
      });
    } catch { this.loading = false; this.cdr.markForCheck(); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('bulkActions.invalidJson') }); }
  }

  retry() { this.error = ''; this.ngOnInit(); }
}
