import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnifiedSquadService } from '@app/services/unified-squad.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-erp-config',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, RouterLink],
  template: `
    <div class="erp-config">
      <div class="erp-header">
        <div class="erp-header-left">
          <div class="erp-nav">
            <a routerLink="/workspace-home" class="btn-nav">← Home</a>
            <a routerLink="/unified-squad" class="btn-nav">← Squad</a>
          </div>
          <h2>{{ i18n.translate('erpConfig.title') }}</h2>
        </div>
        <button class="btn-primary" (click)="showForm = !showForm">
          {{ showForm ? 'Cancel' : '+ New Connection' }}
        </button>
      </div>

      <!-- Connection Form -->
      <div class="connection-form" *ngIf="showForm">
        <div class="form-grid">
          <div class="form-group">
            <label>Connection Name</label>
            <input [(ngModel)]="form.name" [placeholder]="i18n.translate('erpConfig.connectionNamePlaceholder')" [attr.aria-label]="i18n.translate('erpConfig.connectionNamePlaceholder')" />
          </div>
          <div class="form-group">
            <label>ERP Type</label>
            <select [(ngModel)]="form.erpType">
              <option value="sap">SAP</option>
              <option value="oracle">Oracle ERP Cloud</option>
              <option value="dynamics365">Microsoft Dynamics 365</option>
              <option value="generic_rest">Generic REST/OData</option>
            </select>
          </div>
          <div class="form-group">
            <label>Endpoint URL</label>
            <input [(ngModel)]="form.endpointUrl" [placeholder]="i18n.translate('erpConfig.endpointUrlPlaceholder')" [attr.aria-label]="i18n.translate('erpConfig.endpointUrlPlaceholder')" />
          </div>
          <div class="form-group">
            <label>Auth Method</label>
            <select [(ngModel)]="form.authMethod">
              <option value="oauth2">OAuth 2.0</option>
              <option value="api_key">API Key</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>
          <div class="form-group" *ngIf="form.authMethod === 'api_key'">
            <label>API Key</label>
            <input [(ngModel)]="form.apiKey" type="password" [placeholder]="i18n.translate('erpConfig.enterApiKey')" [attr.aria-label]="i18n.translate('erpConfig.enterApiKey')" />
          </div>
          <div class="form-group" *ngIf="form.authMethod === 'basic'">
            <label>Username</label>
            <input [(ngModel)]="form.username" [placeholder]="i18n.translate('erpConfig.username')" [attr.aria-label]="i18n.translate('erpConfig.username')" />
          </div>
          <div class="form-group" *ngIf="form.authMethod === 'basic'">
            <label>Password</label>
            <input [(ngModel)]="form.password" type="password" [placeholder]="i18n.translate('erpConfig.password')" [attr.aria-label]="i18n.translate('erpConfig.password')" />
          </div>
          <div class="form-group">
            <label>Sync Schedule (cron)</label>
            <input [(ngModel)]="form.syncScheduleCron" placeholder="0 2 * * *" aria-label="0 2 * * *" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary" (click)="saveConnection()">Save Connection</button>
        </div>
        <div class="error-msg" *ngIf="formError">{{ formError }}</div>
      </div>

      <!-- Connections List -->
      <div class="connections-list">
        <div *ngFor="let conn of connections" class="conn-card">
          <div class="conn-info">
            <div class="conn-name">{{ conn.name }}</div>
            <div class="conn-meta">
              <span class="conn-type">{{ conn.erpType }}</span>
              <span class="conn-auth">{{ conn.authMethod }}</span>
              <span class="conn-status" [attr.data-status]="conn.validationStatus">{{ conn.validationStatus }}</span>
            </div>
            <div class="conn-url">{{ conn.endpointUrl }}</div>
          </div>
          <div class="conn-actions">
            <button class="btn-sm" (click)="validateConn(conn.connectionId)" title="Validate">✓</button>
            <button class="btn-sm" (click)="triggerSync(conn.connectionId)" title="Sync Now">🔄</button>
            <button class="btn-sm" (click)="viewHistory(conn.connectionId)" title="History">📋</button>
          </div>
        </div>
        <div *ngIf="!connections.length" class="empty-state">No ERP connections configured.</div>
      </div>

      <!-- Sync History -->
      <div class="sync-history" *ngIf="historyConnectionId">
        <h3>Sync History</h3>
        <div *ngFor="let h of syncHistory" class="history-entry" [class.failed]="h.status === 'failed'">
          <span class="h-status">{{ h.status }}</span>
          <span>Fetched: {{ h.recordsFetched }} | Created: {{ h.recordsCreated }} | Updated: {{ h.recordsUpdated }}</span>
          <span>{{ h.durationMs }}ms</span>
          <span>{{ h.startedAt | appDate:'short' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .erp-config { padding: 1.5rem; }
    .erp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .erp-header-left { display: flex; align-items: center; gap: 1rem; }
    .erp-nav { display: flex; gap: 0.5rem; }
    .btn-nav { padding: 0.4rem 0.75rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); background: var(--card-bg, #fff); color: var(--text-body); text-decoration: none; font-size: var(--font-size-tag); }
    .btn-nav:hover { background: var(--bg-subtle, #f4f4f4); }
    .erp-header h2 { margin: 0; font-size: var(--font-size-xl); }
    .btn-primary { padding: 0.5rem 1rem; border: none; border-radius: var(--radius-sm); background: #0f62fe; color: #fff; cursor: pointer; }
    .connection-form { padding: 1.25rem; border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius); margin-bottom: 1.5rem; background: var(--card-bg, #fff); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .form-group label { font-weight: 600; font-size: var(--font-size-tag); }
    .form-group input, .form-group select { padding: 0.5rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); }
    .form-actions { margin-top: 1rem; }
    .error-msg { color: var(--error); margin-top: 0.5rem; font-size: var(--font-size-tag); }
    .connections-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .conn-card { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius); background: var(--card-bg, #fff); }
    .conn-name { font-weight: 600; }
    .conn-meta { display: flex; gap: 0.75rem; margin-top: 0.25rem; font-size: var(--font-size-caption); }
    .conn-type { background: var(--tag-bg, #e0e0e0); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); }
    .conn-status[data-status="valid"] { color: #24a148; }
    .conn-status[data-status="invalid"] { color: var(--error); }
    .conn-status[data-status="pending"] { color: var(--text-muted, #6f6f6f); }
    .conn-url { font-size: var(--font-size-caption); color: var(--text-secondary, #888); margin-top: 0.25rem; }
    .conn-actions { display: flex; gap: 0.35rem; }
    .btn-sm { padding: 0.3rem 0.5rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-xs); background: transparent; cursor: pointer; }
    .empty-state { text-align: center; padding: 2rem; color: var(--text-secondary, #888); }
    .sync-history { margin-top: 1.5rem; }
    .sync-history h3 { font-size: var(--font-size-md); margin-bottom: 0.75rem; }
    .history-entry { display: flex; gap: 1rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-color, #eee); font-size: var(--font-size-tag); }
    .history-entry.failed { color: var(--error); }
    .h-status { font-weight: 600; min-width: 80px; }
  `]
})
export class ERPConfigComponent implements OnInit {
  i18n = inject(I18nService);
  private svc = inject(UnifiedSquadService);
  connections: GrcRecord[] = [];
  syncHistory: GrcRecord[] = [];
  historyConnectionId = '';
  showForm = false;
  formError = '';
  form = { name: '', erpType: 'sap', endpointUrl: '', authMethod: 'oauth2', apiKey: '', username: '', password: '', syncScheduleCron: '0 2 * * *' };

  ngOnInit() { this.loadConnections(); }

  async loadConnections() {
    try { this.connections = await this.svc.getERPConnections(); } catch (e) { devError("[catch]", e); }
  }

  async saveConnection() {
    this.formError = '';
    try {
      const credentials: Record<string, string> = {};
      if (this.form.authMethod === 'api_key') credentials['api_key'] = this.form.apiKey;
      if (this.form.authMethod === 'basic') { credentials['username'] = this.form.username; credentials['password'] = this.form.password; }
      await this.svc.createERPConnection({
        name: this.form.name, erpType: this.form.erpType, endpointUrl: this.form.endpointUrl,
        authMethod: this.form.authMethod, credentials, syncScheduleCron: this.form.syncScheduleCron,
      });
      this.showForm = false;
      this.loadConnections();
    } catch (err: unknown) { this.formError = (err as GrcRecord)?.error?.error || 'Failed to save connection'; }
  }

  async validateConn(id: string) {
    try { await this.svc.validateERPConnection(id); this.loadConnections(); } catch (e) { devError("[catch]", e); }
  }

  async triggerSync(id: string) {
    try { await this.svc.triggerERPSync(id); } catch (e) { devError("[catch]", e); }
  }

  async viewHistory(id: string) {
    this.historyConnectionId = id;
    try { this.syncHistory = await this.svc.getERPSyncHistory(id); } catch (e) { devError("[catch]", e); }
  }

}
