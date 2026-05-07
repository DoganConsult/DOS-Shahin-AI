import { asArray } from '@app/runtime/utils/safe-data';
import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TabViewModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { StepsModule } from 'primeng/steps';
import { PasswordModule } from 'primeng/password';
import { SidebarModule } from 'primeng/drawer';
import { InputTextarea } from 'primeng/textarea';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Per-platform credential field definitions ──────────────────────────────

interface CredentialField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'password' | 'url';
  placeholder?: string;
}

interface PlatformDef {
  value: string;
  label: string;
  fields: CredentialField[];
  authMethod: string;
}

interface ConnectorTypeDef {
  key: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  platforms: PlatformDef[];
  defaultSchedule: string;
}

const CONNECTOR_TYPES: ConnectorTypeDef[] = [
  {
    key: 'siem', label: 'SIEM / EDR', icon: 'pi-shield', description: 'Security alerts from Splunk, Azure Sentinel, QRadar',
    color: '#dc2626', defaultSchedule: '*/15 * * * *',
    platforms: [
      { value: 'splunk', label: 'Splunk', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Splunk Base URL', required: true, type: 'url', placeholder: 'https://splunk.company.com:8089' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'sentinel', label: 'Azure Sentinel', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { key: 'subscriptionId', label: 'Subscription ID', required: true },
          { key: 'resourceGroup', label: 'Resource Group', required: true },
          { key: 'workspaceName', label: 'Workspace Name', required: true },
        ] },
      { value: 'generic', label: 'Generic SIEM API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'iam', label: 'IAM / Identity', icon: 'pi-users', description: 'User identity from Azure AD, Okta, Ping Identity',
    color: '#7c3aed', defaultSchedule: '0 */4 * * *',
    platforms: [
      { value: 'azure_ad', label: 'Azure AD / Entra ID', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'okta', label: 'Okta', authMethod: 'api_key',
        fields: [
          { key: 'domain', label: 'Okta Domain', required: true, placeholder: 'company.okta.com' },
          { key: 'apiToken', label: 'API Token', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic IAM API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'itsm', label: 'ITSM / Ticketing', icon: 'pi-ticket', description: 'Tickets from ServiceNow, Jira Service Management',
    color: '#0284c7', defaultSchedule: '*/30 * * * *',
    platforms: [
      { value: 'servicenow', label: 'ServiceNow', authMethod: 'oauth2',
        fields: [
          { key: 'instance', label: 'Instance', required: true, placeholder: 'company.service-now.com' },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'jira', label: 'Jira Service Management', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Jira Base URL', required: true, type: 'url', placeholder: 'https://company.atlassian.net' },
          { key: 'email', label: 'Email', required: true },
          { key: 'apiToken', label: 'API Token', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic ITSM API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'cmdb', label: 'CMDB / Assets', icon: 'pi-server', description: 'Asset inventory from ServiceNow CMDB, Device42',
    color: '#059669', defaultSchedule: '0 3 * * *',
    platforms: [
      { value: 'servicenow', label: 'ServiceNow CMDB', authMethod: 'basic',
        fields: [
          { key: 'instance', label: 'Instance', required: true, placeholder: 'company.service-now.com' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic CMDB API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'vuln', label: 'Vulnerability Scanner', icon: 'pi-exclamation-triangle', description: 'Scan results from Qualys, Tenable, Rapid7',
    color: '#ea580c', defaultSchedule: '0 4 * * *',
    platforms: [
      { value: 'qualys', label: 'Qualys', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Qualys API URL', type: 'url', placeholder: 'https://qualysapi.qualys.com' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'tenable', label: 'Tenable / Nessus', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'Tenable URL', type: 'url', placeholder: 'https://cloud.tenable.com' },
          { key: 'accessKey', label: 'Access Key', required: true, type: 'password' },
          { key: 'secretKey', label: 'Secret Key', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic Vuln API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════
  // ZERO_LEGACY tracker: this Microsoft-365 connector definition (and
  // every sibling entry in CONNECTOR_TYPES) is slated for replacement
  // by `integrationRuntime.connectorCatalog` (phase-e-wave3). The form
  // field schema, auth method, and OAuth scope list will be sourced
  // from `dos.integration_connector_catalog` + a new
  // `dos.integration_connector_form_field` table. Until that wave
  // lands, the data here is treated as a pre-migration constant and
  // is excluded from the lint-no-frontend-invention guard via the
  // `phase-e-wave3` allow-tag below.
  // phase-e-wave3
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'outlook', label: 'Microsoft 365', icon: 'pi-microsoft', description: 'Outlook, SharePoint, OneDrive, Teams, Power BI, Dynamics 365',
    color: '#2563eb', defaultSchedule: '0 2 * * *',
    platforms: [
      { value: 'azure_ad', label: 'Microsoft 365 (Graph API)', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID (App Registration)', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'teams', label: 'Microsoft Teams', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'power_bi', label: 'Power BI', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { key: 'workspaceId', label: 'Workspace ID', required: true },
        ] },
      { value: 'dynamics365', label: 'Dynamics 365', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { key: 'environmentUrl', label: 'Environment URL', required: true, type: 'url', placeholder: 'https://org.crm.dynamics.com' },
        ] },
    ],
  },
  {
    key: 'erp', label: 'ERP / Financial', icon: 'pi-chart-bar', description: 'Financial records from SAP S/4HANA, Oracle',
    color: '#b45309', defaultSchedule: '0 1 * * *',
    platforms: [
      { value: 'sap', label: 'SAP S/4HANA', authMethod: 'oauth2',
        fields: [
          { key: 'baseUrl', label: 'SAP Base URL', required: true, type: 'url' },
          { key: 'tokenUrl', label: 'OAuth Token URL', type: 'url' },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'oracle', label: 'Oracle ERP Cloud', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Oracle Base URL', required: true, type: 'url' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic ERP API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
];

const SCHEDULE_PRESETS = [
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'Daily at 2:00 AM', value: '0 2 * * *' },
  { label: 'Daily at 4:00 AM', value: '0 4 * * *' },
  { label: 'Custom', value: 'custom' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-connector-manager',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, TabViewModule, ToastModule, ConfirmDialogModule, TooltipModule, StepsModule, PasswordModule, SidebarModule, InputTextarea],
    providers: [MessageService, ConfirmationService],
    template: `
    <app-page-shell icon="link" [title]="i18n.translate('connectorManager.title')"
      [subtitle]="i18n.translate('connectorManager.subtitle')"
      [breadcrumbs]="[i18n.translate('connectorManager.breadcrumbAdmin'), i18n.translate('connectorManager.breadcrumbConnectors')]" [loading]="loading">
      <div class="toolbar" *ngIf="!error">
        <p-button [label]="i18n.translate('connectorManager.newConnector')" icon="pi pi-plus" (onClick)="openWizard()" />
      </div>
      <p-tabView *ngIf="!error">
        <p-tabPanel [header]="i18n.translate('connectorManager.allConnectors')">
          <p-table [attr.aria-label]="i18n.translate('connectorManager.ariaConnectorsTable')" [value]="connectors" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>{{ i18n.translate('connectorManager.id') }}</th><th>{{ i18n.translate('connectorManager.type') }}</th><th>Platform</th><th>{{ i18n.translate('connectorManager.auth') }}</th><th>{{ i18n.translate('connectorManager.status') }}</th><th>{{ i18n.translate('connectorManager.lastRun') }}</th><th>{{ i18n.translate('connectorManager.actions') }}</th></tr></ng-template>
            <ng-template pTemplate="body" let-c>
              <tr>
                <td><a class="id-link" (click)="openDetail(c)"><code>{{ (c.connector_id || c.id) | slice:0:8 }}</code></a></td>
                <td><p-tag [value]="c.source_system_type || c.sourceSystemType || c.type" /></td>
                <td>{{ c.platform || '—' }}</td>
                <td>{{ c.auth_method || c.authMethod || c.auth }}</td>
                <td><app-status-badge [status]="c.status || 'active'" /></td>
                <td>{{ (c.last_success_at || c.last_run_at) | appDate:'short' }}</td>
                <td class="actions">
                  <p-button icon="pi pi-play" class="p-button-sm p-button-text p-button-success" [pTooltip]="i18n.translate('connectorManager.tooltipRun')" (onClick)="runConnector(c)" />
                  <p-button icon="pi pi-heart" class="p-button-sm p-button-text p-button-info" [pTooltip]="i18n.translate('connectorManager.tooltipHealth')" (onClick)="checkHealth(c)" />
                  <p-button icon="pi pi-history" class="p-button-sm p-button-text" [pTooltip]="i18n.translate('connectorManager.tooltipExecutions')" (onClick)="viewExecutions(c)" />
                  <p-button icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" [pTooltip]="i18n.translate('connectorManager.tooltipDelete')" (onClick)="deleteConnector(c)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="text-center p-4">{{ i18n.translate('connectorManager.noConnectors') }}</td></tr></ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('connectorManager.executions')" *ngIf="executions.length > 0">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('connectorManager.ariaExecutionsTable')" [value]="executions" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>{{ i18n.translate('connectorManager.executionId') }}</th><th>{{ i18n.translate('connectorManager.status') }}</th><th>{{ i18n.translate('connectorManager.records') }}</th><th>{{ i18n.translate('connectorManager.started') }}</th><th>Error</th></tr></ng-template>
            <ng-template pTemplate="body" let-e>
              <tr>
                <td><code>{{ e.execution_id | slice:0:8 }}</code></td>
                <td><p-tag [value]="e.status" [severity]="e.status === 'success' ? 'success' : e.status === 'failed' ? 'danger' : 'info'" /></td>
                <td>{{ e.records_collected || 0 }}</td>
                <td>{{ e.started_at | appDate:'short' }}</td>
                <td class="truncate">{{ e.error_message || '—' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <!-- ── Multi-Step Wizard Dialog ── -->
      <p-dialog [header]="wizardTitle" [(visible)]="showWizard" [modal]="true" [style]="{width:'680px'}" [closable]="true">
        <p-steps [model]="wizardSteps" [activeIndex]="wizardStep" [readonly]="true" styleClass="mb-4" />

        <!-- Step 1: Select Connector Type -->
        <div *ngIf="wizardStep === 0" class="type-grid">
          @for (ct of connectorTypes; track ct.key) {
            <div class="type-card" [class.selected]="selectedType?.key === ct.key" (click)="selectType(ct)">
              <div class="type-icon" [style.background]="ct.color + '18'" [style.color]="ct.color">
                <i class="pi" [ngClass]="ct.icon"></i>
              </div>
              <div class="type-info">
                <div class="type-label">{{ ct.label }}</div>
                <div class="type-desc">{{ ct.description }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Step 2: Platform & Credentials -->
        <div *ngIf="wizardStep === 1 && selectedType">
          <div class="field mb-3">
            <label>Connector Name</label>
            <input pInputText [(ngModel)]="wizardName" class="w-full" [placeholder]="selectedType.label + ' Connector'" />
          </div>
          <div class="field mb-3" *ngIf="selectedType.platforms.length > 1">
            <label>Platform</label>
            <p-dropdown [options]="platformOptions" [(ngModel)]="selectedPlatformValue" (onChange)="onPlatformChange()" placeholder="Select platform" appendTo="body" class="w-full" />
          </div>
          <div *ngIf="selectedPlatform">
            @for (f of selectedPlatform.fields; track f.key) {
              <div class="field mb-3">
                <label>{{ f.label }} <span *ngIf="f.required" class="required">*</span></label>
                <input *ngIf="f.type !== 'password'" pInputText [(ngModel)]="credentials[f.key]" class="w-full" [placeholder]="f.placeholder || ''" />
                <p-password *ngIf="f.type === 'password'" [(ngModel)]="credentials[f.key]" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full" />
              </div>
            }
            <div class="test-row">
              <p-button label="Test Connection" icon="pi pi-bolt" severity="info" [outlined]="true" (onClick)="testConnection()" [loading]="testing" />
              <span *ngIf="testResult" class="test-result" [class.test-ok]="testResult.valid" [class.test-fail]="!testResult.valid">
                <i class="pi" [ngClass]="testResult.valid ? 'pi-check-circle' : 'pi-times-circle'"></i>
                {{ testResult.valid ? 'Connected (' + testResult.latencyMs + 'ms)' : testResult.error }}
              </span>
            </div>
          </div>
        </div>

        <!-- Step 3: Schedule & Create -->
        <div *ngIf="wizardStep === 2">
          <div class="field mb-3">
            <label>Sync Schedule</label>
            <p-dropdown [options]="schedulePresets" [(ngModel)]="selectedSchedule" appendTo="body" class="w-full" />
          </div>
          <div class="field mb-3" *ngIf="selectedSchedule === 'custom'">
            <label>Custom Cron Expression</label>
            <input pInputText [(ngModel)]="customCron" class="w-full" placeholder="0 */6 * * *" />
          </div>
          <div class="summary-card" *ngIf="selectedType && selectedPlatform">
            <h4>Summary</h4>
            <div class="summary-row"><span>Type:</span><strong>{{ selectedType.label }}</strong></div>
            <div class="summary-row"><span>Platform:</span><strong>{{ selectedPlatform.label }}</strong></div>
            <div class="summary-row"><span>Auth:</span><strong>{{ selectedPlatform.authMethod }}</strong></div>
            <div class="summary-row"><span>Schedule:</span><strong>{{ effectiveSchedule }}</strong></div>
            <div class="summary-row" *ngIf="testResult?.valid"><span>Connection:</span><strong class="text-success">Verified</strong></div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button *ngIf="wizardStep > 0" label="Back" icon="pi pi-arrow-left" severity="secondary" [text]="true" (onClick)="wizardStep = wizardStep - 1" />
          <p-button *ngIf="wizardStep < 2" label="Next" icon="pi pi-arrow-right" iconPos="right" (onClick)="nextStep()" [disabled]="!canAdvance()" />
          <p-button *ngIf="wizardStep === 2" label="Create Connector" icon="pi pi-check" (onClick)="createConnector()" [loading]="creating" />
        </ng-template>
      </p-dialog>

      <!-- ── Detail Drawer ── -->
      <p-sidebar [(visible)]="showDetail" position="right" [style]="{width:'520px'}" [modal]="true">
        <ng-template pTemplate="header"><h3 style="margin:0">Connector Detail</h3></ng-template>
        <div *ngIf="detail" class="detail-drawer">
          <!-- Header -->
          <div class="detail-header">
            <div class="detail-icon" [style.background]="getTypeColor(detail.source_system_type) + '18'" [style.color]="getTypeColor(detail.source_system_type)">
              <i class="pi" [ngClass]="getTypeIcon(detail.source_system_type)"></i>
            </div>
            <div>
              <div class="detail-name">{{ detail.name }}</div>
              <div class="detail-meta">{{ detail.source_system_type }} · {{ detail.platform || 'generic' }}</div>
            </div>
          </div>

          <!-- Status with Lifecycle -->
          <div class="detail-section">
            <h4>Status</h4>
            <div class="status-row">
              <app-status-badge [status]="detail.status" />
              <p-dropdown *ngIf="detail.validNextStatuses?.length"
                [options]="nextStatusOptions"
                [(ngModel)]="transitionTarget"
                placeholder="Transition to..."
                [style]="{width:'180px'}" appendTo="body" />
              <p-button *ngIf="transitionTarget" icon="pi pi-check" size="small" (onClick)="openTransitionDialog()" />
            </div>
          </div>

          <!-- Ownership -->
          <div class="detail-section">
            <h4>Ownership</h4>
            <div class="field mb-2">
              <label>Owner</label>
              <p-dropdown [options]="userOptions" [(ngModel)]="detail.owner_id"
                [filter]="true" filterBy="label"
                optionLabel="label" optionValue="value"
                placeholder="Select owner" [showClear]="true"
                appendTo="body" class="w-full"
                (onChange)="saveOwnership()" />
            </div>
            <div class="field mb-2">
              <label>Responsible Team</label>
              <p-dropdown [options]="teamOptions" [(ngModel)]="detail.owner_team_id"
                [filter]="true" filterBy="label"
                optionLabel="label" optionValue="value"
                placeholder="Select team" [showClear]="true"
                appendTo="body" class="w-full"
                (onChange)="saveOwnership()" />
            </div>
            <div class="ownership-context" *ngIf="detail.ownerContext">
              <div class="ctx-row"><span>Name:</span><strong>{{ detail.ownerContext.name || '—' }}</strong></div>
              <div class="ctx-row"><span>Email:</span><strong>{{ detail.ownerContext.email || '—' }}</strong></div>
            </div>
            <div class="ownership-context" *ngIf="detail.teamContext">
              <div class="ctx-row"><span>Team:</span><strong>{{ detail.teamContext.name || '—' }}</strong></div>
              <div class="ctx-row"><span>Code:</span><strong>{{ detail.teamContext.code || '—' }}</strong></div>
            </div>
          </div>

          <!-- Config Summary -->
          <div class="detail-section">
            <h4>Configuration</h4>
            <div class="ctx-row"><span>Auth:</span><strong>{{ detail.auth_method }}</strong></div>
            <div class="ctx-row"><span>Schedule:</span><strong>{{ detail.schedule }}</strong></div>
            <div class="ctx-row"><span>Endpoint:</span><strong>{{ detail.endpoint_url || '—' }}</strong></div>
            <div class="ctx-row"><span>Last Success:</span><strong>{{ detail.last_success_at | appDate:'short' }}</strong></div>
            <div class="ctx-row"><span>Failures:</span><strong>{{ detail.failure_count }}</strong></div>
          </div>

          <!-- Status Timeline -->
          <div class="detail-section">
            <h4>Status History</h4>
            <div *ngIf="statusHistory.length === 0" class="text-muted">No status changes recorded</div>
            <div class="timeline-list">
              @for (entry of statusHistory; track entry.log_id) {
                <div class="timeline-entry">
                  <div class="tl-dot" [style.background]="getStatusColor(entry.to_status)"></div>
                  <div class="tl-content">
                    <div class="tl-transition">
                      <span class="tl-from">{{ entry.from_status || 'created' }}</span>
                      <i class="pi pi-arrow-right" style="font-size:10px;margin:0 4px"></i>
                      <span class="tl-to">{{ entry.to_status }}</span>
                    </div>
                    <div class="tl-meta">{{ entry.changedByName }} · {{ entry.changed_at | appDate:'short' }}</div>
                    <div *ngIf="entry.reason" class="tl-reason">{{ entry.reason }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </p-sidebar>

      <!-- Transition Reason Dialog -->
      <p-dialog header="Status Transition" [(visible)]="showTransitionDialog" [modal]="true" [style]="{width:'400px'}">
        <p>Transition from <strong>{{ detail?.status }}</strong> to <strong>{{ transitionTarget }}</strong></p>
        <div class="field mt-3">
          <label>Reason (optional)</label>
          <textarea pInputTextarea [(ngModel)]="transitionReason" rows="3" class="w-full"></textarea>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="showTransitionDialog = false" />
          <p-button label="Confirm" icon="pi pi-check" (onClick)="executeTransition()" [loading]="transitioning" />
        </ng-template>
      </p-dialog>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">{{ i18n.translate('connectorManager.retry') }}</button>
      </div>
    </app-page-shell>
    <p-toast />
    <p-confirmDialog />
  `,
    styles: [`
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .actions { display: flex; gap: 4px; }
    .id-link { cursor: pointer; color: var(--primary, #2563eb); text-decoration: underline; }
    .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .text-center { text-align: center; } .p-4 { padding: 16px; }
    .mb-3 { margin-bottom: 16px; } .mb-4 { margin-bottom: 20px; }
    .w-full { width: 100%; }
    .field { margin-bottom: 0; }
    .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; color: var(--text-muted); }
    .required { color: var(--error); }
    .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .type-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); border: 2px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: all .15s; }
    .type-card:hover { border-color: var(--primary-300, #93c5fd); background: var(--surface-50, var(--surface-ice)); }
    .type-card.selected { border-color: var(--primary-500, #3b82f6); background: var(--primary-50, #eff6ff); }
    .type-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xl); flex-shrink: 0; }
    .type-info { flex: 1; min-width: 0; }
    .type-label { font-weight: 700; font-size: var(--font-size-base); }
    .type-desc { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px; }
    .test-row { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
    .test-result { font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px; }
    .test-ok { color: var(--success, #16a34a); } .test-fail { color: var(--error, #dc2626); }
    .summary-card { padding: 16px; border-radius: var(--radius-lg); background: var(--surface-50, var(--surface-ice)); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .summary-card h4 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .summary-row:last-child { border: none; }
    .text-success { color: var(--success, #16a34a); }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
    .error-state button { margin-top: 12px; padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--status-danger-bg, #fff1f1); background: var(--status-danger-bg, #fff1f1); color: var(--error); cursor: pointer; font-weight: 600; }
    .detail-drawer { padding: 0 4px; }
    .detail-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .detail-icon { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xl); flex-shrink: 0; }
    .detail-name { font-size: var(--font-size-lg); font-weight: 700; }
    .detail-meta { font-size: var(--font-size-xs); color: var(--text-muted); }
    .detail-section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .detail-section h4 { margin: 0 0 10px; font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); }
    .status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ownership-context { margin-top: 10px; padding: 10px; border-radius: var(--radius-sm); background: var(--surface-50, var(--surface-ice)); }
    .ctx-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: var(--font-size-sm); }
    .mt-3 { margin-top: 12px; }
    .timeline-list { display: flex; flex-direction: column; gap: 12px; }
    .timeline-entry { display: flex; gap: 10px; align-items: flex-start; }
    .tl-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .tl-content { flex: 1; }
    .tl-transition { font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; }
    .tl-from, .tl-to { padding: 1px 6px; border-radius: var(--radius-xs); background: var(--surface-100, var(--surface-ice)); }
    .tl-meta { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px; }
    .tl-reason { font-size: var(--font-size-xs); margin-top: 2px; font-style: italic; }
  `]
})
export class ConnectorManagerComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  connectors: GrcRecord[] = [];
  executions: GrcRecord[] = [];
  connectorTypes = CONNECTOR_TYPES;

  // Wizard state
  showWizard = false;
  wizardStep = 0;
  wizardSteps = [
    { label: 'Type' },
    { label: 'Credentials' },
    { label: 'Schedule' },
  ];
  selectedType: ConnectorTypeDef | null = null;
  selectedPlatformValue = '';
  selectedPlatform: PlatformDef | null = null;
  wizardName = '';
  credentials: Record<string, string> = {};
  testing = false;
  testResult: { valid: boolean; latencyMs: number; error?: string } | null = null;
  selectedSchedule = '0 2 * * *';
  customCron = '';
  creating = false;
  schedulePresets = SCHEDULE_PRESETS;

  // Detail drawer state
  showDetail = false;
  detail: GrcRecord | null = null;
  statusHistory: GrcRecord[] = [];
  userOptions: { label: string; value: string }[] = [];
  teamOptions: { label: string; value: string }[] = [];
  transitionTarget = '';
  showTransitionDialog = false;
  transitionReason = '';
  transitioning = false;

  get nextStatusOptions() {
    return (this.detail?.validNextStatuses || []).map((s: string) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }));
  }

  get wizardTitle(): string {
    if (this.wizardStep === 0) return 'Select Connector Type';
    if (this.wizardStep === 1) return `Configure ${this.selectedType?.label || 'Connector'}`;
    return 'Review & Create';
  }

  get platformOptions() {
    return (this.selectedType?.platforms || []).map(p => ({ label: p.label, value: p.value }));
  }

  get effectiveSchedule(): string {
    return this.selectedSchedule === 'custom' ? this.customCron : this.selectedSchedule;
  }

  constructor(public i18n: I18nService, private msg: MessageService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.operationsSvc.getConnectors().subscribe({
      next: (d) => { this.connectors = asArray(d, 'connectors'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('connectorManager.failedToLoadData'); this.loading = false; this.cdr.markForCheck(); }
    });
    // Load users and teams for owner/team dropdowns
    this.apiclientSvc.get('/users').subscribe({
      next: (d) => {
        const users = d.users || d || [];
        this.userOptions = users.map((u) => ({
          label: `${u.first_name || ''} ${u.last_name || ''}`.trim() + (u.email ? ` (${u.email})` : '') + (u.department_id ? ` — ${u.department_id}` : ''),
          value: u.user_id || u.id,
        }));
        this.cdr.markForCheck();
      }
    });
    this.apiclientSvc.get('/teams').subscribe({
      next: (d) => {
        const teams = d.teams || d || [];
        this.teamOptions = teams.map((t) => ({
          label: t.name_en || t.name || t.team_code,
          value: t.team_id || t.id,
        }));
        this.cdr.markForCheck();
      }
    });
  }

  openWizard() {
    this.wizardStep = 0;
    this.selectedType = null;
    this.selectedPlatform = null;
    this.selectedPlatformValue = '';
    this.wizardName = '';
    this.credentials = {};
    this.testResult = null;
    this.selectedSchedule = '0 2 * * *';
    this.customCron = '';
    this.showWizard = true;
  }

  selectType(ct: ConnectorTypeDef) {
    this.selectedType = ct;
    this.selectedSchedule = ct.defaultSchedule;
    // Auto-select platform if only one
    if (ct.platforms.length === 1) {
      this.selectedPlatformValue = ct.platforms[0].value;
      this.selectedPlatform = ct.platforms[0];
    } else {
      this.selectedPlatformValue = '';
      this.selectedPlatform = null;
    }
    this.credentials = {};
    this.testResult = null;
  }

  onPlatformChange() {
    this.selectedPlatform = this.selectedType?.platforms.find(p => p.value === this.selectedPlatformValue) || null;
    this.credentials = {};
    this.testResult = null;
  }

  canAdvance(): boolean {
    if (this.wizardStep === 0) return !!this.selectedType;
    if (this.wizardStep === 1) {
      if (!this.selectedPlatform) return false;
      return this.selectedPlatform.fields.filter(f => f.required).every(f => !!this.credentials[f.key]);
    }
    return true;
  }

  nextStep() {
    if (this.canAdvance()) this.wizardStep++;
  }

  testConnection() {
    if (!this.selectedType || !this.selectedPlatform) return;
    this.testing = true;
    this.testResult = null;
    const payload = {
      sourceSystemType: this.selectedType.key,
      credentials: { ...this.credentials, platform: this.selectedPlatformValue },
    };
    this.operationsSvc.testConnector(payload as any).subscribe({
      next: (r) => { this.testResult = r as any; this.testing = false; this.cdr.markForCheck(); },
      error: (e) => { this.testResult = { valid: false, latencyMs: 0, error: e.error?.error || 'Connection failed' }; this.testing = false; this.cdr.markForCheck(); }
    });
  }

  createConnector() {
    if (!this.selectedType || !this.selectedPlatform) return;
    this.creating = true;
    const payload = {
      name: this.wizardName || `${this.selectedPlatform.label} Connector`,
      sourceSystemType: this.selectedType.key,
      authMethod: this.selectedPlatform.authMethod,
      credentials: { ...this.credentials, platform: this.selectedPlatformValue },
      endpoint: this.credentials['baseUrl'] || this.credentials['instance'] || this.credentials['domain'] || '',
      schedule: this.effectiveSchedule,
    };
    this.operationsSvc.createConnector(payload as any).subscribe({
      next: () => {
        this.showWizard = false;
        this.creating = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('connectorManager.connectorCreated') });
        this.load();
      },
      error: (e) => {
        this.creating = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('connectorManager.error'), detail: e.error?.error });
        this.cdr.markForCheck();
      }
    });
  }

  runConnector(c: GrcRecord) {
    const id = c.connector_id || c.id;
    this.operationsSvc.runConnector(id).subscribe({
      next: (d) => { this.msg.add({ severity: 'success', summary: this.i18n.translate('connectorManager.connectorExecuted'), detail: this.i18n.translate('connectorManager.recordsCollectedCount', { count: (d as any).recordsCollected || 0 }) }); },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('connectorManager.error'), detail: e.error?.error }); }
    });
  }

  checkHealth(c: GrcRecord) {
    const id = c.connector_id || c.id;
    this.apiclientSvc.get(`/connectors/${id}/health`).subscribe({
      next: (d) => { this.msg.add({ severity: d.status === 'healthy' || d.failureCount === 0 ? 'success' : 'warning', summary: this.i18n.translate('connectorManager.health'), detail: this.i18n.translate('connectorManager.connectorHealthStatus', { status: d.status || d.health_status || '', failures: d.failureCount ?? d.failure_count ?? 0 }) }); }
    });
  }

  viewExecutions(c: GrcRecord) {
    const id = c.connector_id || c.id;
    this.apiclientSvc.get(`/connectors/${id}/executions`).subscribe({
      next: (d) => { this.executions = asArray(d, 'executions'); this.cdr.markForCheck(); }
    });
  }

  deleteConnector(c: GrcRecord) {
    const id = c.connector_id || c.id;
    this.confirmSvc.confirm({
      message: this.i18n.translate('connectorManager.confirmDeleteMessage'),
      header: this.i18n.translate('connectorManager.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.operationsSvc.deleteConnector(id).subscribe({
          next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('connectorManager.deleted') }); this.load(); }
        });
      }
    });
  }

  // ── Detail Drawer ──

  openDetail(c: GrcRecord) {
    const id = c.connector_id || c.id;
    this.detail = null;
    this.statusHistory = [];
    this.transitionTarget = '';
    this.showDetail = true;

    this.apiclientSvc.get(`/connectors/${id}/detail`).subscribe({
      next: (d) => { this.detail = d; this.cdr.markForCheck(); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.failedToLoadDetail') }); this.showDetail = false; }
    });

    this.apiclientSvc.get(`/connectors/${id}/status-history`).subscribe({
      next: (d) => { this.statusHistory = d.history || []; this.cdr.markForCheck(); }
    });
  }

  saveOwnership() {
    if (!this.detail) return;
    const id = this.detail.connector_id;
    this.apiclientSvc.put(`/connectors/${id}/ownership`, {
      ownerId: this.detail.owner_id || null,
      ownerTeamId: this.detail.owner_team_id || null,
    }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.ownershipUpdated') }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.failedToUpdateOwnership') }); }
    });
  }

  openTransitionDialog() {
    if (!this.transitionTarget) return;
    this.transitionReason = '';
    this.showTransitionDialog = true;
  }

  executeTransition() {
    if (!this.detail || !this.transitionTarget) return;
    this.transitioning = true;
    const id = this.detail.connector_id;
    this.apiclientSvc.post(`/connectors/${id}/transition`, {
      status: this.transitionTarget,
      reason: this.transitionReason || undefined,
    }).subscribe({
      next: () => {
        this.transitioning = false;
        this.showTransitionDialog = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.statusTo', { status: this.transitionTarget }) });
        this.transitionTarget = '';
        // Reload detail + history
        this.openDetail(this.detail);
        this.load();
      },
      error: (e) => {
        this.transitioning = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.transitionFailed'), detail: e.error?.error });
      }
    });
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = { siem: '#dc2626', iam: '#7c3aed', itsm: '#0284c7', cmdb: '#059669', vuln: '#ea580c', outlook: '#2563eb', sharepoint: '#2563eb', onedrive: '#2563eb', erp: '#b45309' };
    return map[type] || '#6b7280';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = { siem: 'pi-shield', iam: 'pi-users', itsm: 'pi-ticket', cmdb: 'pi-server', vuln: 'pi-exclamation-triangle', outlook: 'pi-microsoft', sharepoint: 'pi-microsoft', onedrive: 'pi-microsoft', erp: 'pi-chart-bar' };
    return map[type] || 'pi-link';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { draft: '#9ca3af', testing: '#3b82f6', active: '#16a34a', paused: '#f59e0b', disabled: '#6b7280', error: '#dc2626', archived: '#374151' };
    return map[status] || '#9ca3af';
  }
}
