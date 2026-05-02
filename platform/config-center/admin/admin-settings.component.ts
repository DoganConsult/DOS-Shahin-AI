import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabs';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '@env/environment';
import { ToastService } from '@app/dos/shell/toast.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

interface ConfigFile {
  key: string;
  filename: string;
  description: string;
  sensitiveFields: string[];
  data: Record<string, any>;
  exists: boolean;
}

interface EnvVar {
  key: string;
  value: string;
  sensitive: boolean;
}

interface SecretExpiry {
  name: string;
  expiryDate: string;
  daysLeft: number;
  status: 'ok' | 'warning' | 'expired';
}

interface ConnectivityResult {
  service: string;
  status: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}

interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule,
    CardModule, InputTextModule, DialogModule, TabViewModule,
    ProgressBarModule, TooltipModule,
  ],
  template: `
    <div class="settings-page">
      <h1 class="page-title"><i class="pi pi-cog"></i> {{ i18n.translate('adminSettings.pageTitle') }}</h1>

      <!-- Secret Expiry Alerts -->
      <div class="alert-bar" *ngIf="expiryWarnings.length > 0">
        <div *ngFor="let w of expiryWarnings" class="alert-item"
             [class.alert-expired]="w.status === 'expired'"
             [class.alert-warning]="w.status === 'warning'"
             [class.alert-ok]="w.status === 'ok'">
          <i class="pi" [ngClass]="w.status === 'ok' ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
          <span>{{ w.name }}: {{ w.daysLeft > 0 ? w.daysLeft + ' days left' : 'EXPIRED' }} ({{ w.expiryDate }})</span>
        </div>
      </div>

      <p-tabView>
        <!-- Tab 1: Config Files -->
        <p-tabPanel [header]="i18n.translate('adminSettings.configFiles')" leftIcon="pi pi-file">
          <div class="config-grid">
            <div *ngFor="let cfg of configs" class="config-card">
              <div class="config-header">
                <span class="config-key">{{ cfg.key }}</span>
                <span class="config-file">{{ cfg.filename }}</span>
                <p-tag [value]="cfg.exists ? 'Active' : 'Missing'" [severity]="cfg.exists ? 'success' : 'danger'" />
              </div>
              <p class="config-desc">{{ cfg.description }}</p>

              <div class="config-fields" *ngIf="cfg.data">
                <div *ngFor="let entry of flattenConfig(cfg.data, cfg.sensitiveFields)" class="field-row">
                  <span class="field-key" [class.sensitive]="entry.sensitive">
                    <i class="pi pi-lock" *ngIf="entry.sensitive"></i>
                    {{ entry.path }}
                  </span>
                  <span class="field-value" [class.masked]="entry.sensitive">{{ entry.value }}</span>
                  <button [attr.aria-label]="i18n.translate('adminSettings.refresh')" *ngIf="entry.sensitive" pButton icon="pi pi-refresh" class="p-button-sm p-button-text p-button-warning"
                          [pTooltip]="i18n.translate('adminSettings.rotateSecret')" (click)="openRotateDialog(cfg.key, entry.path)"></button>
                </div>
              </div>

              <div class="config-actions">
                <button pButton [label]="i18n.translate('adminSettings.edit')" icon="pi pi-pencil" class="p-button-sm p-button-outlined"
                        (click)="openEditDialog(cfg)"></button>
              </div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 2: Environment Variables -->
        <p-tabPanel [header]="i18n.translate('adminSettings.envVars')" leftIcon="pi pi-server">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('adminSettings.envVarsTable')" [value]="envVars" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr><th>Variable</th><th>Value</th><th>Sensitive</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-v>
              <tr>
                <td><code>{{ v.key }}</code></td>
                <td class="env-value" [class.masked]="v.sensitive">{{ v.value || '(not set)' }}</td>
                <td><p-tag [value]="v.sensitive ? 'Secret' : 'Public'" [severity]="v.sensitive ? 'warning' : 'info'" /></td>
              </tr>
            </ng-template>
          </p-table>
          <p class="env-note"><i class="pi pi-info-circle"></i> Environment variables are read-only from the UI. Edit <code>.env</code> on the server and restart PM2 to change.</p>
        </p-tabPanel>

        <!-- Tab 3: Connectivity -->
        <p-tabPanel [header]="i18n.translate('adminSettings.serviceHealth')" leftIcon="pi pi-wifi">
          <div class="connectivity-section">
            <button pButton [label]="i18n.translate('adminSettings.testAllConnections')" icon="pi pi-play" class="p-button-sm p-button-info mb-3"
                    [loading]="connectivityLoading" (click)="testConnectivity()"></button>

            <div class="service-grid" *ngIf="connectivityResults.length > 0">
              <div *ngFor="let r of connectivityResults" class="service-card"
                   [class.service-ok]="r.status === 'ok'" [class.service-error]="r.status !== 'ok'">
                <div class="service-icon">
                  <i class="pi" [ngClass]="r.status === 'ok' ? 'pi-check-circle' : 'pi-times-circle'"></i>
                </div>
                <div class="service-info">
                  <div class="service-name">{{ r.service }}</div>
                  <div class="service-detail" *ngIf="r.latencyMs !== undefined">{{ r.latencyMs }}ms</div>
                  <div class="service-detail error" *ngIf="r.error">{{ r.error }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ollama / LLM Status -->
          <div class="ollama-section">
            <h3>Local LLM (Ollama)</h3>
            <button pButton [label]="i18n.translate('adminSettings.checkOllama')" icon="pi pi-search" class="p-button-sm p-button-outlined mb-2"
                    [loading]="ollamaLoading" (click)="checkOllama()"></button>
            <div *ngIf="ollamaStatus">
              <p-tag [value]="ollamaStatus.running ? 'Running' : 'Stopped'" [severity]="ollamaStatus.running ? 'success' : 'danger'" />
              <div class="model-list" *ngIf="ollamaStatus?.models?.length">
                <div *ngFor="let m of ollamaStatus.models" class="model-item">
                  <span class="model-name">{{ m.name }}</span>
                  <span class="model-size">{{ formatBytes(m.size) }}</span>
                </div>
              </div>
              <p *ngIf="ollamaStatus.running && ollamaStatus.models?.length === 0" class="env-note">No models downloaded yet</p>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 4: AI Agents -->
        <p-tabPanel [header]="i18n.translate('adminSettings.aiAgents')" leftIcon="pi pi-users">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('adminSettings.agentsTable')" [value]="agents" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>ID</th><th>Name</th><th>Domain</th><th>Engine</th><th>Status</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-a>
              <tr>
                <td><code>{{ a.id }}</code></td>
                <td>{{ a.name }}</td>
                <td>{{ a.domain }}</td>
                <td><p-tag [value]="a.engine" severity="info" /></td>
                <td><p-tag value="Active" severity="success" /></td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <!-- Rotate Secret Dialog -->
      <p-dialog [header]="i18n.translate('adminSettings.rotateSecretDialog')" [(visible)]="rotateDialogVisible" [modal]="true" [style]="{width: '450px'}">
        <div class="rotate-form">
          <label>Config: <strong>{{ rotateConfigKey }}</strong></label>
          <label>Field: <code>{{ rotateFieldPath }}</code></label>
          <label>New Value:</label>
          <input pInputText [(ngModel)]="rotateNewValue" type="password" class="w-full" [placeholder]="i18n.translate('adminSettings.pasteNewSecret')" [attr.aria-label]="i18n.translate('adminSettings.pasteNewSecret')" />
        </div>
        <ng-template pTemplate="footer">
          <button pButton [label]="i18n.translate('adminSettings.cancel')" icon="pi pi-times" class="p-button-text" (click)="rotateDialogVisible = false"></button>
          <button pButton [label]="i18n.translate('adminSettings.rotate')" icon="pi pi-refresh" class="p-button-warning" (click)="executeRotate()"></button>
        </ng-template>
      </p-dialog>

      <!-- Edit Config Dialog -->
      <p-dialog [header]="i18n.translate('adminSettings.editConfig')" [(visible)]="editDialogVisible" [modal]="true" [style]="{width: '600px'}">
        <div class="edit-form">
          <label>{{ editConfigKey }} — {{ editConfigFilename }}</label>
          <textarea [(ngModel)]="editConfigJson" rows="20" class="config-editor"></textarea>
        </div>
        <ng-template pTemplate="footer">
          <button pButton [label]="i18n.translate('adminSettings.cancel')" icon="pi pi-times" class="p-button-text" (click)="editDialogVisible = false"></button>
          <button pButton [label]="i18n.translate('adminSettings.save')" icon="pi pi-save" class="p-button-success" (click)="saveConfig()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .settings-page { padding: 32px; max-width: 1400px; margin: 0 auto; }
    .page-title { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); margin: 0 0 20px; display: flex; align-items: center; gap: 10px; letter-spacing: -0.02em; }
    .page-title .pi { color: var(--primary); }

    .alert-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .alert-item {
      display: flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: var(--radius-md); font-size: var(--font-size-sm); font-weight: 600;
    }
    .alert-expired { background: var(--status-danger-bg); color: var(--status-danger); border: 1px solid var(--status-danger-bg, #fff1f1); }
    .alert-warning { background: var(--status-warning-bg); color: var(--status-warning); border: 1px solid #fde68a; }
    .alert-ok { background: var(--status-success-bg); color: var(--status-success); border: 1px solid #bbf7d0; }

    .config-grid { display: flex; flex-direction: column; gap: 16px; }
    .config-card {
      background: var(--surface); border-radius: var(--radius); padding: 20px;
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
    }
    .config-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .config-key { font-size: var(--font-size-md); font-weight: 700; color: var(--primary); }
    .config-file { font-size: var(--font-size-sm); color: var(--text-caption); font-family: monospace; }
    .config-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 12px; }
    .config-fields { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .field-row {
      display: flex; align-items: center; gap: 8px; padding: 6px 10px;
      background: var(--surface-sunken); border-radius: var(--radius-sm); font-size: var(--font-size-sm);
    }
    .field-key { color: var(--text-muted); min-width: 260px; display: flex; align-items: center; gap: 4px; }
    .field-key.sensitive { color: var(--status-warning); }
    .field-key .pi { font-size: var(--font-size-xs); }
    .field-value { color: var(--text-body); flex: 1; font-family: monospace; word-break: break-all; }
    .field-value.masked { color: var(--text-caption); }
    .config-actions { display: flex; gap: 8px; }

    .env-value { font-family: monospace; font-size: var(--font-size-sm); }
    .env-value.masked { color: var(--text-caption); }
    .env-note { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 12px; display: flex; align-items: center; gap: 6px; }

    .mb-3 { margin-bottom: 12px; }
    .mb-2 { margin-bottom: 8px; }
    .w-full { width: 100%; }

    .service-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .service-card {
      display: flex; align-items: center; gap: 12px; padding: 16px;
      border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card);
    }
    .service-ok { background: var(--status-success-bg); border-color: #bbf7d0; }
    .service-error { background: var(--status-danger-bg); border-color: var(--status-danger-bg, #fff1f1); }
    .service-icon .pi { font-size: var(--font-size-2xl); }
    .service-ok .pi { color: var(--status-success); }
    .service-error .pi { color: var(--status-danger); }
    .service-name { font-size: var(--font-size-base); font-weight: 600; color: var(--text-heading); }
    .service-detail { font-size: var(--font-size-xs); color: var(--text-muted); }
    .service-detail.error { color: var(--status-danger); }

    .ollama-section { margin-top: 24px; }
    .ollama-section h3 { font-size: var(--font-size-md); font-weight: 700; color: var(--text-heading); margin: 0 0 8px; }
    .model-list { margin-top: 8px; }
    .model-item {
      display: flex; justify-content: space-between; padding: 8px 14px;
      background: var(--surface-sunken); border-radius: var(--radius); margin-bottom: 4px; font-size: var(--font-size-sm);
    }
    .model-name { color: var(--text-heading); font-weight: 600; }
    .model-size { color: var(--text-caption); }

    .rotate-form { display: flex; flex-direction: column; gap: 12px; }
    .rotate-form label { font-size: var(--font-size-sm); color: var(--text-muted); }
    .edit-form { display: flex; flex-direction: column; gap: 10px; }
    .edit-form label { font-size: var(--font-size-sm); color: var(--text-muted); }
    .config-editor {
      width: 100%; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: var(--font-size-sm);
      background: var(--surface-sunken); color: var(--text); border: 1.5px solid var(--border);
      border-radius: var(--radius-sm); padding: 14px; resize: vertical;
    }
    .config-editor:focus { outline: none; border-color: var(--primary-light); box-shadow: var(--shadow-glow); }
  `],
})
export class AdminSettingsComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  configs: ConfigFile[] = [];
  envVars: EnvVar[] = [];
  expiryWarnings: SecretExpiry[] = [];
  connectivityResults: ConnectivityResult[] = [];
  connectivityLoading = false;
  ollamaStatus: { running: boolean; models: OllamaModel[] } | null = null;
  ollamaLoading = false;

  // Rotate dialog
  rotateDialogVisible = false;
  rotateConfigKey = '';
  rotateFieldPath = '';
  rotateNewValue = '';

  // Edit dialog
  editDialogVisible = false;
  editConfigKey = '';
  editConfigFilename = '';
  editConfigJson = '';

  // 10 Agents — loaded from API
  agents: Record<string, any>[] = [];
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.loadPlatformConfig();
    this.loadAgents();
  }

  private loadAgents(): void {
    this.operationsSvc.getPublicAgents().subscribe({
      next: (res: Record<string, any>) => {
        this.agents = (res.agents || []).map((a: Record<string, any>) => ({
          id: a.id, name: a.name, domain: a.domain || a.role || '', engine: 'Azure OpenAI + Ollama',
        }));
      },
      error: (e: any) => devError("[API]", e),
    });
  }

  loadPlatformConfig(): void {
    this.http.get<any>(`${this.api}/admin/platform-config`).subscribe({
      next: (data) => {
        this.configs = data.configs || [];
        this.envVars = data.envVars || [];
        this.expiryWarnings = data.secretExpiry || [];
      },
      error: (e: any) => devError("[API]", e),
    });
  }

  testConnectivity(): void {
    this.connectivityLoading = true;
    this.http.get<ConnectivityResult[]>(`${this.api}/admin/platform-config/check/connectivity`).subscribe({
      next: (data) => { this.connectivityResults = data; this.connectivityLoading = false; },
      error: () => { this.connectivityLoading = false; },
    });
  }

  checkOllama(): void {
    this.ollamaLoading = true;
    this.http.get<any>(`${this.api}/admin/platform-config/check/ollama`).subscribe({
      next: (data) => { this.ollamaStatus = data; this.ollamaLoading = false; },
      error: () => { this.ollamaLoading = false; },
    });
  }

  openRotateDialog(configKey: string, fieldPath: string): void {
    this.rotateConfigKey = configKey;
    this.rotateFieldPath = fieldPath;
    this.rotateNewValue = '';
    this.rotateDialogVisible = true;
  }

  executeRotate(): void {
    if (!this.rotateNewValue) return;
    this.http.post(`${this.api}/admin/platform-config/${this.rotateConfigKey}/rotate`, {
      fieldPath: this.rotateFieldPath,
      newValue: this.rotateNewValue,
    }).subscribe({
      next: () => {
        this.rotateDialogVisible = false;
        this.rotateNewValue = '';
        this.loadPlatformConfig();
      },
      error: (err) => this.toast.error(((err as GrcRecord).error)?.error || 'Failed to rotate secret'),
    });
  }

  openEditDialog(cfg: ConfigFile): void {
    this.editConfigKey = cfg.key;
    this.editConfigFilename = cfg.filename;
    // We need the full unmasked config for editing — fetch it fresh
    this.http.get<any>(`${this.api}/admin/platform-config/${cfg.key}`).subscribe({
      next: (data) => {
        this.editConfigJson = JSON.stringify(data.data, null, 2);
        this.editDialogVisible = true;
      },
    });
  }

  saveConfig(): void {
    try {
      const parsed = JSON.parse(this.editConfigJson);
      // Send every top-level key as a field update
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(parsed)) {
        updates[k] = v;
      }
      this.http.put(`${this.api}/admin/platform-config/${this.editConfigKey}`, updates).subscribe({
        next: () => {
          this.editDialogVisible = false;
          this.loadPlatformConfig();
        },
        error: (err) => this.toast.error(((err as GrcRecord).error)?.error || 'Failed to save'),
      });
    } catch {
      this.toast.error('Invalid JSON');
    }
  }

  flattenConfig(obj: Record<string, any>, sensitiveFields: string[], prefix = ''): { path: string; value: string; sensitive: boolean }[] {
    const result: { path: string; value: string; sensitive: boolean }[] = [];
    for (const [key, value] of Object.entries(obj || {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result.push(...this.flattenConfig(value, sensitiveFields, path));
      } else {
        const displayValue = Array.isArray(value) ? `[${value.length} items]` : String(value);
        result.push({
          path,
          value: displayValue.length > 80 ? displayValue.slice(0, 80) + '...' : displayValue,
          sensitive: sensitiveFields.includes(path),
        });
      }
    }
    return result;
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(1) + ' ' + units[i];
  }

}
