import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EntitlementsService } from '@app/core/services/platform/entitlements.service';
import type { PlatformMode } from '@app/core/models/tenant-entitlements.model';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { devError } from '../../core/utils/dev-logger';
import { TenantConfigWorkspaceComponent } from './components/tenant-config-workspace.component';
import { TenantConfigEmailComponent } from './components/tenant-config-email.component';
import { TenantConfigRiskComponent } from './components/tenant-config-risk.component';
import { TenantConfigHistoryComponent } from './components/tenant-config-history.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';
import { ApiClientService } from "@app/core/services/api-client.service";

interface SettingsSection { key: string; labelEn: string; labelAr: string; icon: string; }

const SECTIONS: SettingsSection[] = [
  { key: 'workspace', labelEn: 'Workspace', labelAr: 'مساحة العمل', icon: 'pi-building' },
  { key: 'entitlements', labelEn: 'Modules & Entitlements', labelAr: 'الوحدات والصلاحيات', icon: 'pi-th-large' },
  { key: 'operation-mode', labelEn: 'Operation Mode (Agents)', labelAr: 'وضع التشغيل (الوكلاء)', icon: 'pi-sliders-h' },
  { key: 'email', labelEn: 'Email & Integrations', labelAr: 'البريد والتكاملات', icon: 'pi-envelope' },
  { key: 'risk', labelEn: 'Risk Model', labelAr: 'نموذج المخاطر', icon: 'pi-exclamation-triangle' },
  { key: 'raci', labelEn: 'RACI Matrix', labelAr: 'مصفوفة RACI', icon: 'pi-table' },
  { key: 'cadence', labelEn: 'Cadence Overrides', labelAr: 'تجاوزات التكرار', icon: 'pi-calendar' },
  { key: 'history', labelEn: 'Configuration History', labelAr: 'سجل التكوين', icon: 'pi-history' },
];

/**
 * Orchestrator component for the tenant configuration page.
 * Manages navigation between sections and delegates rendering
 * to presentational child components.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    selector: 'app-tenant-config',
    imports: [
        CommonModule, FormsModule, PageShellComponent, ButtonModule, DialogModule, ToastModule,
        GrcFormFieldComponent, TenantConfigWorkspaceComponent, TenantConfigEmailComponent,
        TenantConfigRiskComponent, TenantConfigHistoryComponent,
    ],
    providers: [MessageService],
    templateUrl: './tenant-config.component.html',
    styleUrls: ['./tenant-config.component.scss']
})
export class TenantConfigComponent implements OnInit {
  private router = inject(Router);
  private msg = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private entitlementsSvc = inject(EntitlementsService);

  breadcrumbs = this.router.url.startsWith('/foundation') ? ['Foundation', 'Settings'] : ['Dashboard', 'Tenant Config'];
  loading = false;
  raciLoading = false;
  cadenceLoading = false;
  riskModelLoading = false;
  config: GrcRecord = { org_name: '', sectors: '' };
  configSnapshot: GrcRecord = {};
  history: GrcRecord[] = [];
  raciMatrix: GrcRecord[] = [];
  cadenceOverrides: GrcRecord[] = [];
  riskModel: GrcRecord = { impact_scale: 5, likelihood_scale: 5, appetite_threshold: 12, formula: 'impact * likelihood' };

  emailConfig: GrcRecord = { provider: 'microsoft_graph', enabled: false };
  emailConfigLoading = signal(false);
  emailSaving = signal(false);
  emailTesting = signal(false);
  emailSendingTest = signal(false);
  emailTestResult = signal<GrcRecord | null>(null);
  emailProviderOptions = [
    { label: 'Microsoft Graph (OAuth2)', value: 'microsoft_graph' },
    { label: 'SMTP', value: 'smtp' },
  ];

  platformApproval = signal<GrcRecord | null>(null);
  platformApprovalRequesting = signal(false);

  platformMode: PlatformMode = 'human';
  platformModeSaving = signal(false);
  qiyasModuleEnabled = false;
  agrcModuleEnabled = true;

  dirtyFlags: Record<string, boolean> = {};

  showConfirmDialog = false;
  confirmMessage = '';
  pendingConfirmAction: (() => void) | null = null;

  safetyControls = { maxActionsPerDay: 100, requireApprovalHighRisk: true };
  scopeModules = [
    { key: 'governance', label: 'Governance', enabled: true },
    { key: 'risk', label: 'Risk', enabled: true },
    { key: 'compliance', label: 'Compliance', enabled: true },
    { key: 'evidence', label: 'Evidence', enabled: true },
    { key: 'audit', label: 'Audit', enabled: false },
    { key: 'reporting', label: 'Reporting', enabled: false },
  ];

  exampleRisk = { impact: 3, likelihood: 4, score: 12 };

  historySectionFilterOptions = [
    { label: 'Workspace', value: 'workspace' },
    { label: 'Email', value: 'email' },
    { label: 'Risk Model', value: 'risk' },
    { label: 'Cadence', value: 'cadence' },
    { label: 'Operation Mode', value: 'operation_mode' },
    { label: 'Entitlements', value: 'entitlements' },
  ];

  readonly platformModeOptions = [
    { value: 'human' as PlatformMode, label: 'Human Only', desc: 'All decisions require human approval. Agents are advisory only.', icon: 'user' },
    { value: 'shadow_agent' as PlatformMode, label: 'Shadow Agent', desc: 'Agents work in parallel and suggest; humans approve every step.', icon: 'eye' },
    { value: 'hybrid' as PlatformMode, label: 'Hybrid Active', desc: 'Agents execute low-risk tasks autonomously; high-risk requires approval.', icon: 'bolt' },
    { value: 'full_autonomous' as PlatformMode, label: 'Fully Autonomous', desc: 'Agents execute all tasks autonomously with post-hoc audit trail.', icon: 'microchip-ai' },
  ];

  sections = SECTIONS;
  activeSection = 'workspace';

  testEmailDialogVisible = false;
  testEmailAddress = '';

  private static readonly SECTION_MAP: Record<string, string> = {
    org: 'workspace', raci: 'raci', cadence: 'cadence', risk: 'risk',
    history: 'history', email: 'email', platform: 'operation-mode',
    entitlements: 'entitlements', 'operation-mode': 'operation-mode',
  };

  constructor(public i18n: I18nService, private route: ActivatedRoute, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(p => {
      const tab = p.get('tab');
      if (tab) {
        const mapped = TenantConfigComponent.SECTION_MAP[tab] || tab;
        if (SECTIONS.some(s => s.key === mapped)) this.activeSection = mapped;
      }
    });
    this.loading = true;
    // GET /tenant-config returns { tenant, settings, featureFlags, activeModules }
    this.apiclientSvc.get('/tenant-config').subscribe({
      next: (d) => {
        const settings = d.settings || {};
        const tenant = d.tenant || {};
        this.config = { org_name: tenant.name || '', sectors: settings.sectors || '', ...settings, updated_at: tenant.createdAt };
        this.configSnapshot = { ...this.config };
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    // History, RACI, Cadence, Risk, Email endpoints don't exist yet — skip calls
    this.history = [];
    this.platformMode = this.entitlementsSvc.operationMode();
    this.qiyasModuleEnabled = this.entitlementsSvc.qiyasEnabled();
    this.agrcModuleEnabled = this.entitlementsSvc.agrcEnabled();
  }

  // -- Shared helpers --

  markDirty(section: string): void {
    this.dirtyFlags[section] = true;
  }

  navigateToAudit(entityType: string): void {
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType } });
  }

  executeConfirmedAction(): void {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
      this.pendingConfirmAction = null;
    }
    this.showConfirmDialog = false;
  }

  // -- Workspace --

  resetWorkspace(): void {
    this.config = { ...this.configSnapshot };
    this.dirtyFlags['workspace'] = false;
  }

  saveConfig() {
    this.apiclientSvc.patch('/tenant-config/config', this.config).subscribe({
      next: () => {
        this.configSnapshot = { ...this.config };
        this.dirtyFlags['workspace'] = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.saved') });
      }
    });
  }

  // -- Entitlements --

  confirmModuleToggle(key: 'qiyas' | 'agrc', enabled: boolean): void {
    this.confirmMessage = this.i18n.localize(
      `Are you sure you want to ${enabled ? 'enable' : 'disable'} the ${key === 'qiyas' ? 'Qiyas' : 'AGRC-OS'} module? Changes take effect immediately on sidebar and available features.`,
      `هل أنت متأكد من ${enabled ? 'تفعيل' : 'تعطيل'} وحدة ${key === 'qiyas' ? 'Qiyas' : 'AGRC-OS'}؟ التغييرات تؤثر فوراً على الشريط الجانبي والميزات المتاحة.`
    );
    this.pendingConfirmAction = () => {
      this.entitlementsSvc.setModuleEnabled(key, enabled);
      this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.moduleUpdated') });
    };
    this.showConfirmDialog = true;
  }

  // -- Operation Mode --

  setPlatformMode(mode: PlatformMode): void {
    this.platformMode = mode;
    this.markDirty('operation-mode');
  }

  confirmSaveMode(): void {
    if (this.platformMode === 'full_autonomous' || this.platformMode === 'hybrid') {
      this.confirmMessage = this.i18n.translate('tenantConfig.areYouSureYouWantToChangeTheOperationMod');
      this.pendingConfirmAction = () => this.savePlatformMode();
      this.showConfirmDialog = true;
    } else {
      this.savePlatformMode();
    }
  }

  savePlatformMode(): void {
    this.platformModeSaving.set(true);
    this.entitlementsSvc.setOperationMode(this.platformMode);
    this.dirtyFlags['operation-mode'] = false;
    this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.modeSaved') });
    setTimeout(() => this.platformModeSaving.set(false), 800);
  }

  // -- RACI --

  loadRaci() {
    this.raciLoading = true;
    this.apiclientSvc.get('/tenant-config/raci').subscribe({
      next: (d) => { this.raciMatrix = asArray(d, 'matrix'); this.raciLoading = false; },
      error: () => { this.raciLoading = false; }
    });
  }

  saveRaci() {
    this.apiclientSvc.put('/tenant-config/raci', { matrix: this.raciMatrix }).subscribe({
      next: () => {
        this.dirtyFlags['raci'] = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.raciSaved') });
      }
    });
  }

  // -- Cadence --

  loadCadenceOverrides() {
    this.cadenceLoading = true;
    this.apiclientSvc.get('/cadence/overrides').subscribe({
      next: (d) => { this.cadenceOverrides = asArray(d, 'overrides'); this.cadenceLoading = false; },
      error: () => { this.cadenceLoading = false; }
    });
  }

  saveCadenceOverrides() {
    this.apiclientSvc.post('/cadence/overrides', { overrides: this.cadenceOverrides }).subscribe({
      next: () => {
        this.dirtyFlags['cadence'] = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.overridesSaved') });
      }
    });
  }

  addCadenceOverride(): void {
    this.cadenceOverrides = [...this.cadenceOverrides, {
      domain: '', default_frequency: 'monthly', override_frequency: '', effective_from: new Date().toISOString().split('T')[0]
    }];
    this.markDirty('cadence');
  }

  removeCadenceOverride(index: number): void {
    this.cadenceOverrides = this.cadenceOverrides.filter((_, i) => i !== index);
    this.markDirty('cadence');
  }

  // -- Risk Model --

  loadRiskModel() {
    this.riskModelLoading = true;
    this.apiclientSvc.get('/risk-scoring/models').subscribe({
      next: (d) => { this.riskModel = d.model || d || this.riskModel; this.riskModelLoading = false; },
      error: () => { this.riskModelLoading = false; }
    });
  }

  saveRiskModel() {
    this.apiclientSvc.put('/risk-scoring/models', this.riskModel).subscribe({
      next: () => {
        this.dirtyFlags['risk'] = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.riskModelSaved') });
      }
    });
  }

  // -- Email --

  loadEmailConfig() {
    this.emailConfigLoading.set(true);
    this.apiclientSvc.get('/tenant-email-config').subscribe({
      next: (d) => {
        if (d.config) this.emailConfig = { ...this.emailConfig, ...d.config };
        this.emailConfigLoading.set(false);
      },
      error: () => { this.emailConfigLoading.set(false); }
    });
  }

  saveEmailConfig() {
    this.emailSaving.set(true);
    this.apiclientSvc.put('/tenant-email-config', this.emailConfig).subscribe({
      next: (d) => {
        this.emailConfig = { ...this.emailConfig, ...d };
        this.emailSaving.set(false);
        this.dirtyFlags['email'] = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('tenantConfig.emailConfigSaved') });
      },
      error: () => { this.emailSaving.set(false); }
    });
  }

  testEmailConfig() {
    this.emailTesting.set(true);
    this.emailTestResult.set(null);
    this.apiclientSvc.post('/tenant-email-config/test', {}).subscribe({
      next: (d) => {
        this.emailTestResult.set(d);
        this.emailTesting.set(false);
        this.loadEmailConfig();
      },
      error: (err) => {
        this.emailTestResult.set({ success: false, error: ((err as GrcRecord).error)?.error || 'Test failed' });
        this.emailTesting.set(false);
      }
    });
  }

  sendTestEmail() {
    this.testEmailAddress = '';
    this.testEmailDialogVisible = true;
  }

  submitTestEmail() {
    const to = this.testEmailAddress.trim();
    if (!to) return;
    this.testEmailDialogVisible = false;
    this.emailSendingTest.set(true);
    this.apiclientSvc.post('/tenant-email-config/send-test', { to }).subscribe({
      next: (d) => {
        this.emailSendingTest.set(false);
        this.emailTestResult.set(d);
      },
      error: (err) => {
        this.emailSendingTest.set(false);
        this.emailTestResult.set({ success: false, error: ((err as GrcRecord).error)?.error || 'Send failed' });
      }
    });
  }

  copyRedirectUrl(): void {
    const url = window.location.origin + '/auth/callback';
    navigator.clipboard.writeText(url).then(() => {
      this.msg.add({ severity: 'info', summary: this.i18n.translate('tenantConfig.redirectUrlCopied') });
    });
  }

  // -- Platform Approval --

  loadPlatformApproval() {
    this.apiclientSvc.get('/tenant-email-config/platform-approval').subscribe({
      next: (d) => { this.platformApproval.set(d.approval || null); },
      error: (e) => devError("[API]", e)
    });
  }

  requestPlatformEmailAccess() {
    this.platformApprovalRequesting.set(true);
    this.apiclientSvc.post('/tenant-email-config/platform-approval/request', {}).subscribe({
      next: (d) => {
        this.platformApproval.set(d);
        this.platformApprovalRequesting.set(false);
      },
      error: () => { this.platformApprovalRequesting.set(false); }
    });
  }

  // -- History --

  exportConfigSnapshot(): void {
    const data = {
      exportedAt: new Date().toISOString(),
      workspace: this.config,
      riskModel: this.riskModel,
      cadenceOverrides: this.cadenceOverrides,
      emailEnabled: this.emailConfig.enabled,
      emailProvider: this.emailConfig.provider,
      platformMode: this.platformMode,
      modules: { agrc: this.agrcModuleEnabled, qiyas: this.qiyasModuleEnabled },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `config-snapshot-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }
}
