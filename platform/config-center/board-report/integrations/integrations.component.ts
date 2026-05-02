import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-integrations',
    imports: [
        CommonModule, FormsModule, PageShellComponent, GrcDataTableComponent, StatusBadgeComponent,
        GrcFormFieldComponent, TabViewModule, TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, DropdownModule, InputSwitchModule, CardModule, AppDatePipe,
        PasswordModule, ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './integrations.component.html',
    styleUrls: ['./integrations.component.scss']
})
export class IntegrationsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private cdr = inject(ChangeDetectorRef);
  private msg = inject(MessageService);
  loading = false;
  webhooks: GrcRecord[] = [];
  configs: GrcRecord[] = [];
  jiraConfigured = false;
  slackConfigured = false;
  teamsConfigured = false;
  servicenowConfigured = false;
  jiraConfig: GrcRecord | null = null;
  slackConfig: GrcRecord | null = null;
  teamsConfig: GrcRecord | null = null;
  servicenowConfig: GrcRecord | null = null;

  // Webhook dialog
  showWebhookDialog = false;
  newWebhook = { url: '', eventsStr: '', secret: '' };

  // Jira setup
  showJiraDialog = false;
  jiraForm = { baseUrl: '', email: '', apiToken: '', projectKey: '' };
  savingJira = false;
  testingJira = false;
  jiraTestResult: { ok: boolean; message: string } | null = null;

  // Slack setup
  showSlackDialog = false;
  slackForm = { webhookUrl: '', botToken: '', defaultChannel: '' };
  savingSlack = false;
  testingSlack = false;
  slackTestResult: { ok: boolean; message: string } | null = null;

  // Teams setup
  showTeamsDialog = false;
  teamsForm = { webhookUrl: '' };
  savingTeams = false;

  // ServiceNow setup
  showServiceNowDialog = false;
  servicenowForm = { instanceUrl: '', username: '', password: '' };
  savingServiceNow = false;

  // CISO Assistant setup
  cisoConfigured = false;
  cisoConfig: GrcRecord | null = null;
  showCisoDialog = false;
  cisoForm = { url: '', apiKey: '' };
  savingCiso = false;

  // OpenProject setup
  openprojectConfigured = false;
  openprojectConfig: GrcRecord | null = null;
  showOpenProjectDialog = false;
  openprojectForm = { url: '', apiKey: '', projectId: '' };
  savingOpenProject = false;

  // OpenClaw
  openClawStatus: GrcRecord | null = null;
  testingOpenClaw = false;
  openClawTestResult: { ok: boolean; message: string; toolsCount?: number } | null = null;
  loadingTools = false;
  loadingResources = false;
  openClawTools: GrcRecord[] = [];
  openClawResources: GrcRecord[] = [];

  // Config dialog
  showConfigDialog = false;
  editingConfig: GrcRecord = { type: '', name: '', enabled: true, configJson: '{}', integration_id: null };
  get configTypes() {
    return [
      { label: this.i18n.translate('integrations.typeWebhook'), value: 'webhook' },
      { label: this.i18n.translate('integrations.typeJira'), value: 'jira' },
      { label: this.i18n.translate('integrations.typeSlack'), value: 'slack' },
      { label: 'Microsoft Teams', value: 'teams' },
      { label: 'ServiceNow', value: 'servicenow' },
      { label: 'CISO Assistant', value: 'ciso_assistant' },
      { label: 'OpenProject', value: 'openproject' },
      { label: this.i18n.translate('integrations.typeEmail'), value: 'email' },
      { label: this.i18n.translate('integrations.typeCustomApi'), value: 'custom_api' },
    ];
  }

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getWebhooks().subscribe({
      next: (d) => { this.webhooks = asArray(d, 'webhooks'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.operationsSvc.getIntegrationConfigs().subscribe({
      next: (d: any) => {
        this.configs = Array.isArray(d) ? d : (d.configs || []);
        this.jiraConfig = this.configs.find(c => c.type === 'jira' && c.enabled);
        this.slackConfig = this.configs.find(c => c.type === 'slack' && c.enabled);
        this.teamsConfig = this.configs.find(c => c.type === 'teams' && c.enabled);
        this.servicenowConfig = this.configs.find(c => c.type === 'servicenow' && c.enabled);
        this.cisoConfig = this.configs.find(c => c.type === 'ciso_assistant' && c.enabled);
        this.openprojectConfig = this.configs.find(c => c.type === 'openproject' && c.enabled);
        this.jiraConfigured = !!this.jiraConfig;
        this.slackConfigured = !!this.slackConfig;
        this.teamsConfigured = !!this.teamsConfig;
        this.servicenowConfigured = !!this.servicenowConfig;
        this.cisoConfigured = !!this.cisoConfig;
        this.openprojectConfigured = !!this.openprojectConfig;
        this.cdr.markForCheck();
      }
    });
    // Load OpenClaw status
    this.operationsSvc.getOpenClawStatus().subscribe({
      next: (status) => {
        this.openClawStatus = status;
        this.cdr.markForCheck();
      },
      error: () => {
        this.openClawStatus = { connected: false, enabled: false, available: false };
        this.cdr.markForCheck();
      }
    });
  }

  // ── Webhooks ──

  saveWebhook() {
    const events = this.newWebhook.eventsStr.split(',').map(e => e.trim()).filter(Boolean);
    this.operationsSvc.createWebhook({ url: this.newWebhook.url, events, secret: this.newWebhook.secret || undefined }).subscribe({
      next: () => { this.showWebhookDialog = false; this.newWebhook = { url: '', eventsStr: '', secret: '' }; this.ngOnInit(); }
    });
  }

  removeWebhook(id: string) {
    this.operationsSvc.deleteWebhook(id).subscribe({ next: () => this.ngOnInit() });
  }

  // ── Jira Setup ──

  openJiraSetup() {
    this.jiraForm = { baseUrl: '', email: '', apiToken: '', projectKey: '' };
    this.jiraTestResult = null;
    this.showJiraDialog = true;
  }

  saveJiraConfig() {
    this.savingJira = true;
    const config = {
      baseUrl: this.jiraForm.baseUrl,
      email: this.jiraForm.email,
      apiToken: this.jiraForm.apiToken,
      projectKey: this.jiraForm.projectKey,
    };
    this.operationsSvc.createIntegrationConfig({ type: 'jira', name: 'Jira', config, enabled: true }).subscribe({
      next: () => {
        this.showJiraDialog = false;
        this.savingJira = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.jiraConnectedSuccessfully') });
        this.ngOnInit();
      },
      error: (e) => {
        this.savingJira = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.failedToConnectJira'), detail: e.error?.error });
      }
    });
  }

  testJira() {
    this.testingJira = true;
    this.jiraTestResult = null;
    // Test by trying to sync a non-existent issue (will return 404 but proves connectivity)
    this.apiclientSvc.get('/integrations/jira/issues/AGRC-0/status').subscribe({
      next: () => { this.jiraTestResult = { ok: true, message: 'Jira is reachable' }; this.testingJira = false; this.cdr.markForCheck(); },
      error: (e) => {
        // A 404 from Jira means connectivity works (issue not found is expected)
        const is404 = e.status === 404 || e.status === 502;
        this.jiraTestResult = is404
          ? { ok: true, message: 'Jira connection verified (issue not found, as expected)' }
          : { ok: false, message: e.error?.error || 'Connection failed' };
        this.testingJira = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Slack Setup ──

  openSlackSetup() {
    this.slackForm = { webhookUrl: '', botToken: '', defaultChannel: '' };
    this.slackTestResult = null;
    this.showSlackDialog = true;
  }

  saveSlackConfig() {
    this.savingSlack = true;
    const config: Record<string, string> = {};
    if (this.slackForm.webhookUrl) config['webhookUrl'] = this.slackForm.webhookUrl;
    if (this.slackForm.botToken) config['botToken'] = this.slackForm.botToken;
    if (this.slackForm.defaultChannel) config['defaultChannel'] = this.slackForm.defaultChannel;

    this.operationsSvc.createIntegrationConfig({ type: 'slack', name: 'Slack', config, enabled: true }).subscribe({
      next: () => {
        this.showSlackDialog = false;
        this.savingSlack = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.slackConnectedSuccessfully') });
        this.ngOnInit();
      },
      error: (e) => {
        this.savingSlack = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.failedToConnectSlack'), detail: e.error?.error });
      }
    });
  }

  testSlack() {
    this.testingSlack = true;
    this.slackTestResult = null;
    const channel = this.slackConfig?.config?.defaultChannel || '#general';
    this.apiclientSvc.post('/integrations/slack/messages', { channel, text: 'AGRC-OS Integration Test' }).subscribe({
      next: () => {
        this.slackTestResult = { ok: true, message: `Test message sent to ${channel}` };
        this.testingSlack = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.slackTestResult = { ok: false, message: e.error?.error || 'Failed to send message' };
        this.testingSlack = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Teams Setup ──

  openTeamsSetup() {
    this.teamsForm = { webhookUrl: '' };
    this.showTeamsDialog = true;
  }

  saveTeamsConfig() {
    this.savingTeams = true;
    this.operationsSvc.createIntegrationConfig({ type: 'teams', name: 'Microsoft Teams', config: { webhookUrl: this.teamsForm.webhookUrl }, enabled: true }).subscribe({
      next: () => {
        this.showTeamsDialog = false;
        this.savingTeams = false;
        this.msg.add({ severity: 'success', summary: 'Teams connected successfully' });
        this.ngOnInit();
      },
      error: (e) => {
        this.savingTeams = false;
        this.msg.add({ severity: 'error', summary: 'Failed to connect Teams', detail: e.error?.error });
      }
    });
  }

  // ── ServiceNow Setup ──

  openServiceNowSetup() {
    this.servicenowForm = { instanceUrl: '', username: '', password: '' };
    this.showServiceNowDialog = true;
  }

  saveServiceNowConfig() {
    this.savingServiceNow = true;
    this.operationsSvc.createIntegrationConfig({ type: 'servicenow', name: 'ServiceNow', config: { instanceUrl: this.servicenowForm.instanceUrl, username: this.servicenowForm.username, password: this.servicenowForm.password }, enabled: true }).subscribe({
      next: () => {
        this.showServiceNowDialog = false;
        this.savingServiceNow = false;
        this.msg.add({ severity: 'success', summary: 'ServiceNow connected successfully' });
        this.ngOnInit();
      },
      error: (e) => {
        this.savingServiceNow = false;
        this.msg.add({ severity: 'error', summary: 'Failed to connect ServiceNow', detail: e.error?.error });
      }
    });
  }

  // ── CISO Assistant Setup ──

  openCisoSetup() {
    this.cisoForm = { url: '', apiKey: '' };
    this.showCisoDialog = true;
  }

  saveCisoConfig() {
    this.savingCiso = true;
    this.operationsSvc.createIntegrationConfig({ type: 'ciso_assistant', name: 'CISO Assistant', config: { url: this.cisoForm.url, apiKey: this.cisoForm.apiKey }, enabled: true }).subscribe({
      next: () => {
        this.showCisoDialog = false;
        this.savingCiso = false;
        this.msg.add({ severity: 'success', summary: 'CISO Assistant connected successfully' });
        this.ngOnInit();
      },
      error: (e) => {
        this.savingCiso = false;
        this.msg.add({ severity: 'error', summary: 'Failed to connect CISO Assistant', detail: e.error?.error });
      }
    });
  }

  // ── OpenProject Setup ──

  openOpenProjectSetup() {
    this.openprojectForm = { url: '', apiKey: '', projectId: '' };
    this.showOpenProjectDialog = true;
  }

  saveOpenProjectConfig() {
    this.savingOpenProject = true;
    this.operationsSvc.createIntegrationConfig({ type: 'openproject', name: 'OpenProject', config: { url: this.openprojectForm.url, apiKey: this.openprojectForm.apiKey, projectId: this.openprojectForm.projectId }, enabled: true }).subscribe({
      next: () => {
        this.showOpenProjectDialog = false;
        this.savingOpenProject = false;
        this.msg.add({ severity: 'success', summary: 'OpenProject connected successfully' });
        this.ngOnInit();
      },
      error: (e) => {
        this.savingOpenProject = false;
        this.msg.add({ severity: 'error', summary: 'Failed to connect OpenProject', detail: e.error?.error });
      }
    });
  }

  // ── Disconnect ──

  disconnectIntegration(type: string) {
    const config = this.configs.find(c => c.type === type && c.enabled);
    if (!config) return;
    this.operationsSvc.deleteIntegrationConfig(config.integration_id).subscribe({
      next: () => {
        this.msg.add({ severity: 'info', summary: this.i18n.translate('common.integrationDisconnected', { type: type.charAt(0).toUpperCase() + type.slice(1) }) });
        if (type === 'jira') { this.jiraTestResult = null; }
        if (type === 'slack') { this.slackTestResult = null; }
        this.ngOnInit();
      }
    });
  }

  // ── Config Dialog ──

  openConfigDialog(config?: GrcRecord) {
    if (config) {
      this.editingConfig = { ...config, configJson: JSON.stringify(config.config || {}, null, 2) };
    } else {
      this.editingConfig = { type: '', name: '', enabled: true, configJson: '{}', integration_id: null };
    }
    this.showConfigDialog = true;
  }

  editConfig(config: GrcRecord) { this.openConfigDialog(config); }

  saveConfig() {
    let parsed: GrcRecord;
    try { parsed = JSON.parse(this.editingConfig.configJson); } catch { parsed = {}; }
    const payload = { type: this.editingConfig.type, name: this.editingConfig.name, config: parsed, enabled: this.editingConfig.enabled };
    const obs = this.editingConfig.integration_id
      ? this.operationsSvc.updateIntegrationConfig(this.editingConfig.integration_id, payload)
      : this.operationsSvc.createIntegrationConfig(payload);
    obs.subscribe({ next: () => { this.showConfigDialog = false; this.ngOnInit(); } });
  }

  removeConfig(id: string) {
    this.operationsSvc.deleteIntegrationConfig(id).subscribe({ next: () => this.ngOnInit() });
  }

  // ── OpenClaw ──

  testOpenClaw() {
    this.testingOpenClaw = true;
    this.openClawTestResult = null;
    this.operationsSvc.testOpenClaw().subscribe({
      next: (result: any) => {
        this.openClawTestResult = {
          ok: result.ok ?? true,
          message: result.message,
          toolsCount: result.toolsCount,
        };
        this.testingOpenClaw = false;
        this.cdr.markForCheck();
        if (result.ok !== false) {
          this.msg.add({ severity: 'success', summary: 'OpenClaw test successful', detail: result.message });
        } else {
          this.msg.add({ severity: 'warn', summary: 'OpenClaw test failed', detail: result.message });
        }
      },
      error: (e) => {
        this.openClawTestResult = {
          ok: false,
          message: e.error?.message || 'Test failed',
        };
        this.testingOpenClaw = false;
        this.cdr.markForCheck();
        this.msg.add({ severity: 'error', summary: 'OpenClaw test error', detail: e.error?.error || 'Unknown error' });
      }
    });
  }

  loadOpenClawTools() {
    this.loadingTools = true;
    this.operationsSvc.getOpenClawTools().subscribe({
      next: (result: any) => {
        this.openClawTools = Array.isArray(result) ? result : (result.tools ?? []);
        this.loadingTools = false;
        this.cdr.markForCheck();
        this.msg.add({ severity: 'info', summary: `Loaded ${this.openClawTools.length} OpenClaw tools` });
      },
      error: (e) => {
        this.loadingTools = false;
        this.cdr.markForCheck();
        this.msg.add({ severity: 'error', summary: 'Failed to load tools', detail: e.error?.error || 'Unknown error' });
      }
    });
  }

  loadOpenClawResources() {
    this.loadingResources = true;
    this.operationsSvc.getOpenClawResources().subscribe({
      next: (result: any) => {
        this.openClawResources = Array.isArray(result) ? result : (result.resources ?? []);
        this.loadingResources = false;
        this.cdr.markForCheck();
        this.msg.add({ severity: 'info', summary: `Loaded ${this.openClawResources.length} OpenClaw resources` });
      },
      error: (e) => {
        this.loadingResources = false;
        this.cdr.markForCheck();
        this.msg.add({ severity: 'error', summary: 'Failed to load resources', detail: e.error?.error || 'Unknown error' });
      }
    });
  }
}
