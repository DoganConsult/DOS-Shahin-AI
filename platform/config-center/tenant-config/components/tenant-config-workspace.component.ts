import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import type { PlatformMode } from '@app/core/models/tenant-entitlements.model';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational child component for the Workspace, Modules & Entitlements,
 * and Operation Mode (Agents) sections of the tenant configuration page.
 */
@Component({
    selector: 'app-tenant-config-workspace',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, AppDatePipe, CardModule, ButtonModule, InputTextModule, InputTextarea, TagModule, InputSwitchModule, TooltipModule],
    template: `
    <!-- Workspace section -->
    @if (activeSection === 'workspace') {
      <div class="sc-card">
        <div class="sc-section-header">
          <div class="sc-section-title-row">
            <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.workspace') }}</h3>
            <p-tag [value]="config.org_name ? (i18n.translate('tenantConfig.configured')) : (i18n.translate('tenantConfig.notConfigured'))"
              [severity]="config.org_name ? 'success' : 'warning'" />
          </div>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.organizationNameAndSectors') }}</p>
          <div class="sc-meta-line" *ngIf="config.updated_at">
            <span>{{ i18n.translate('tenantConfig.lastUpdated') }} {{ config.updated_at | appDate:'medium' }}</span>
            <span *ngIf="config.updated_by"> &middot; {{ config.updated_by }}</span>
          </div>
        </div>
        <div class="sc-form-grid">
          <div class="sc-field">
            <label class="sc-label">{{ i18n.translate('tenantConfig.organizationName') }}</label>
            <input pInputText [(ngModel)]="config.org_name" class="w-full" (input)="markDirty.emit('workspace')" />
          </div>
          <div class="sc-field sc-wide">
            <label class="sc-label">{{ i18n.translate('tenantConfig.sectors') }}</label>
            <textarea pInputTextarea [(ngModel)]="config.sectors" rows="3" class="w-full"
              [placeholder]="i18n.translate('tenantConfig.commaseparatedSectors')" [attr.aria-label]="i18n.translate('tenantConfig.commaseparatedSectors')"
              (input)="markDirty.emit('workspace')"></textarea>
          </div>
        </div>
        <div class="sc-save-bar">
          @if (dirtyFlags['workspace']) {
            <span class="sc-unsaved"><i class="pi pi-exclamation-circle"></i> {{ i18n.translate('tenantConfig.unsavedChanges') }}</span>
          }
          <span class="sc-save-spacer"></span>
          <p-button [label]="i18n.translate('tenantConfig.cancel')" severity="secondary" [text]="true" (onClick)="resetWorkspace.emit()" [disabled]="!dirtyFlags['workspace']" />
          <p-button [label]="i18n.translate('tenantConfig.save')" icon="pi pi-save" (onClick)="saveConfig.emit()" [disabled]="!dirtyFlags['workspace']" />
        </div>
      </div>
    }

    <!-- Entitlements section -->
    @if (activeSection === 'entitlements') {
      <div class="sc-card">
        <div class="sc-section-header">
          <div class="sc-section-title-row">
            <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.modulesEntitlements') }}</h3>
            <p-tag [value]="(qiyasModuleEnabled ? 1 : 0) + (agrcModuleEnabled ? 1 : 0) + '/2 ' + (i18n.translate('tenantConfig.active'))" severity="info" />
          </div>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.enableOrDisablePlatformModulesChangesAff') }}</p>
        </div>

        <div class="sc-module-list">
          <div class="sc-module-row">
            <div class="sc-module-info">
              <div class="sc-module-name">AGRC-OS Module</div>
              <div class="sc-module-desc">{{ i18n.translate('tenantConfig.coreGrcModuleIncludesGovernanceRiskCompl') }}</div>
              <div class="sc-module-impact" *ngIf="!agrcModuleEnabled">
                <i class="pi pi-exclamation-triangle"></i>
                {{ i18n.translate('tenantConfig.disablingThisModuleWillHideAllGrcPagesFr') }}
              </div>
            </div>
            <p-inputSwitch [(ngModel)]="agrcModuleEnabled" (onChange)="confirmModuleToggle.emit({ key: 'agrc', enabled: $event.checked })" />
          </div>
          <div class="sc-module-row">
            <div class="sc-module-info">
              <div class="sc-module-name">Qiyas Module</div>
              <div class="sc-module-desc">{{ i18n.translate('tenantConfig.maturityMeasurementAndBenchmarkingEngine') }}</div>
              <div class="sc-module-impact" *ngIf="qiyasModuleEnabled">
                <i class="pi pi-info-circle"></i>
                {{ i18n.translate('tenantConfig.unlocksMaturityDashboardBenchmarksCompar') }}
              </div>
            </div>
            <p-inputSwitch [(ngModel)]="qiyasModuleEnabled" (onChange)="confirmModuleToggle.emit({ key: 'qiyas', enabled: $event.checked })" />
          </div>
        </div>

        <div class="sc-save-bar">
          <a class="sc-audit-link" (click)="navigateToAudit.emit('entitlements')">
            <i class="pi pi-history"></i> {{ i18n.translate('tenantConfig.viewChangeHistory') }}
          </a>
        </div>
      </div>
    }

    <!-- Operation Mode section -->
    @if (activeSection === 'operation-mode') {
      <div class="sc-card">
        <div class="sc-section-header">
          <div class="sc-section-title-row">
            <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.operationModeAgents') }}</h3>
            <p-tag [value]="currentModeLabel()" [severity]="platformMode === 'full_autonomous' ? 'danger' : platformMode === 'hybrid' ? 'warning' : 'info'" />
          </div>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.controlsHowAgentsExecuteTasksAcrossThePl') }}</p>
        </div>

        <div class="sc-mode-list">
          @for (m of platformModeOptions; track m.value) {
            <div tabindex="0" role="button" (keyup.enter)="onSetPlatformMode(m.value)" class="mode-card" [class.mode-card--active]="platformMode === m.value" (click)="onSetPlatformMode(m.value)">
              <div class="mode-icon"><i class="pi" [ngClass]="'pi-' + m.icon" style="font-size:1.4rem"></i></div>
              <div class="mode-info">
                <div class="mode-label">{{ m.label }}</div>
                <div class="mode-desc">{{ m.desc }}</div>
              </div>
              @if (platformMode === m.value) {
                <i class="pi pi-check-circle" style="color:var(--primary);font-size:1.2rem"></i>
              }
            </div>
          }
        </div>

        <div class="sc-safety-section">
          <h4 class="sc-sub-title"><i class="pi pi-shield"></i> {{ i18n.translate('tenantConfig.safetyControls') }}</h4>
          <div class="sc-form-grid">
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.maxActionsDay') }}</label>
              <input pInputText [(ngModel)]="safetyControls.maxActionsPerDay" type="number" class="w-full" (input)="markDirty.emit('operation-mode')" />
            </div>
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.requireHumanApprovalForHighrisk') }}</label>
              <div class="sc-switch-row">
                <p-inputSwitch [(ngModel)]="safetyControls.requireApprovalHighRisk" (onChange)="markDirty.emit('operation-mode')" />
                <p-tag [value]="safetyControls.requireApprovalHighRisk ? (i18n.translate('tenantConfig.enabled')) : (i18n.translate('tenantConfig.disabled'))"
                  [severity]="safetyControls.requireApprovalHighRisk ? 'success' : 'warning'" />
              </div>
            </div>
          </div>
        </div>

        <div class="sc-scope-section">
          <h4 class="sc-sub-title"><i class="pi pi-sitemap"></i> {{ i18n.translate('tenantConfig.scope') }}</h4>
          <p class="sc-card-desc">{{ i18n.translate('tenantConfig.modulesWhereAgentsAreAllowedToOperate') }}</p>
          <div class="sc-scope-chips">
            @for (mod of scopeModules; track mod.key) {
              <div tabindex="0" role="button" (keyup.enter)="mod.enabled = !mod.enabled; markDirty.emit('operation-mode')" class="sc-scope-chip" [class.sc-scope-active]="mod.enabled" (click)="mod.enabled = !mod.enabled; markDirty.emit('operation-mode')">
                <i class="pi" [ngClass]="mod.enabled ? 'pi-check-circle' : 'pi-circle'"></i>
                {{ mod.label }}
              </div>
            }
          </div>
        </div>

        <div class="sc-preview-section" *ngIf="platformMode !== 'human'">
          <h4 class="sc-sub-title"><i class="pi pi-eye"></i> {{ i18n.translate('tenantConfig.executionPreview') }}</h4>
          <div class="sc-preview-items">
            @if (platformMode === 'shadow_agent') {
              <div class="sc-preview-item"><i class="pi pi-info-circle"></i> {{ i18n.translate('tenantConfig.agentsSuggestHumansApproveEveryStep') }}</div>
            }
            @if (platformMode === 'hybrid') {
              <div class="sc-preview-item"><i class="pi pi-bolt"></i> {{ i18n.translate('tenantConfig.evidenceRequestsWillBeAutosentButClosure') }}</div>
              <div class="sc-preview-item"><i class="pi pi-bolt"></i> {{ i18n.translate('tenantConfig.lowriskAssessmentsAutorunHighriskNeedsRe') }}</div>
            }
            @if (platformMode === 'full_autonomous') {
              <div class="sc-preview-item sc-preview-warn"><i class="pi pi-exclamation-triangle"></i> {{ i18n.translate('tenantConfig.allTasksExecuteAutonomouslyWithPosthocAu') }}</div>
            }
          </div>
        </div>

        <div class="sc-save-bar">
          @if (dirtyFlags['operation-mode']) {
            <span class="sc-unsaved"><i class="pi pi-exclamation-circle"></i> {{ i18n.translate('tenantConfig.unsavedChanges') }}</span>
          }
          <span class="sc-save-spacer"></span>
          <a class="sc-audit-link" (click)="navigateToAudit.emit('operation_mode')">
            <i class="pi pi-history"></i> {{ i18n.translate('tenantConfig.audit') }}
          </a>
          <p-button [label]="i18n.translate('tenantConfig.saveMode')" icon="pi pi-save" (onClick)="confirmSaveMode.emit()" [loading]="platformModeSaving" />
        </div>
      </div>
    }
  `,
    styles: [`
    .sc-card{background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;gap:16px}
    .sc-section-header{display:flex;flex-direction:column;gap:4px;margin-bottom:4px}
    .sc-section-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .sc-card-title{margin:0;font-size:17px;font-weight:700;color:var(--text-heading,#111)}
    .sc-card-desc{margin:0;font-size:var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
    .sc-meta-line{font-size:var(--font-size-xs);color:var(--text-muted);margin-top:2px}
    .sc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
    .sc-field{display:flex;flex-direction:column;gap:5px}
    .sc-wide{grid-column:1/-1}
    .sc-label{font-size:var(--font-size-sm);font-weight:600;color:var(--text-muted,var(--text-muted));letter-spacing:.2px}
    .sc-switch-row{display:flex;align-items:center;gap:10px;padding-top:2px}
    .sc-save-bar{display:flex;align-items:center;gap:8px;padding-top:12px;border-top:1px solid var(--surface-border,var(--border-subtle));margin-top:4px;flex-wrap:wrap}
    .sc-save-spacer{flex:1}
    .sc-unsaved{display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);color:var(--warning);font-weight:600}
    .sc-unsaved .pi{font-size:var(--font-size-sm)}
    .sc-audit-link{display:inline-flex;align-items:center;gap:5px;font-size:var(--font-size-sm);color:var(--primary-600,#2563eb);cursor:pointer;font-weight:500;text-decoration:none;padding:6px 10px;border-radius:var(--radius-sm);transition:background .15s}
    .sc-audit-link:hover{background:var(--primary-50,#eff6ff);text-decoration:underline}
    .sc-sub-title{margin:0 0 10px;font-size:var(--font-size-base);font-weight:700;color:var(--text-heading);display:flex;align-items:center;gap:8px}
    .sc-sub-title .pi{color:var(--primary-600,#2563eb)}
    .sc-mode-list{display:flex;flex-direction:column;gap:8px}
    .mode-card{display:flex;align-items:center;gap:1rem;padding:1rem;border-radius:var(--radius);border:2px solid var(--surface-border);cursor:pointer;transition:border-color .2s,background .2s}
    .mode-card:hover{border-color:var(--primary-200);background:var(--primary-50)}
    .mode-card--active{border-color:var(--primary);background:var(--primary-50)}
    .mode-icon{color:var(--primary);min-width:2.5rem;text-align:center}
    .mode-label{font-weight:600}
    .mode-desc{font-size:.85rem;color:var(--text-color-secondary)}
    .mode-info{flex:1}
    .sc-safety-section,.sc-scope-section,.sc-preview-section{padding:16px;background:var(--surface-ground);border-radius:var(--radius-md);border:1px solid var(--surface-border)}
    .sc-scope-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
    .sc-scope-chip{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius);border:1px solid var(--surface-border);cursor:pointer;font-size:var(--font-size-sm);font-weight:500;transition:all .15s;background:var(--surface-card)}
    .sc-scope-chip:hover{border-color:var(--primary-200)}
    .sc-scope-active{background:var(--primary-50);border-color:var(--primary);color:var(--primary-700)}
    .sc-scope-active .pi{color:var(--primary)}
    .sc-preview-items{display:flex;flex-direction:column;gap:6px}
    .sc-preview-item{display:flex;align-items:center;gap:8px;font-size:var(--font-size-sm);color:var(--text-color-secondary)}
    .sc-preview-item .pi{font-size:var(--font-size-base);color:var(--primary-600)}
    .sc-preview-warn{color:var(--warning)}
    .sc-preview-warn .pi{color:var(--warning)}
    .sc-module-list{display:flex;flex-direction:column;gap:8px}
    .sc-module-row{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:var(--surface-ground);border-radius:var(--radius-md);border:1px solid var(--surface-border);gap:16px}
    .sc-module-info{flex:1;min-width:0}
    .sc-module-name{font-weight:700;font-size:var(--font-size-base)}
    .sc-module-desc{font-size:var(--font-size-sm);color:var(--text-muted);margin-top:2px}
    .sc-module-impact{font-size:var(--font-size-sm);margin-top:6px;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:var(--radius-sm);background:var(--surface-card);border:1px solid var(--surface-border)}
    .sc-module-impact .pi{font-size:var(--font-size-sm);color:var(--warning)}
    .w-full{width:100%}
    @media(max-width:768px){.sc-form-grid{grid-template-columns:1fr}}
  `]
})
export class TenantConfigWorkspaceComponent {
  /** Which section tab is currently active in the parent */
  @Input() activeSection = '';
  /** Workspace config object (two-way bound in parent) */
  @Input() config: GrcRecord = {};
  /** Dirty flags record from parent */
  @Input() dirtyFlags: Record<string, boolean> = {};
  /** Platform operation mode */
  @Input() platformMode: PlatformMode = 'human';
  /** Whether platform mode save is in progress */
  @Input() platformModeSaving = false;
  /** Whether Qiyas module is enabled */
  @Input() qiyasModuleEnabled = false;
  /** Whether AGRC module is enabled */
  @Input() agrcModuleEnabled = true;
  /** Safety controls config */
  @Input() safetyControls = { maxActionsPerDay: 100, requireApprovalHighRisk: true };
  /** Agent scope modules */
  @Input() scopeModules: { key: string; label: string; enabled: boolean }[] = [];
  /** Available platform mode options */
  @Input() platformModeOptions: { value: PlatformMode; label: string; desc: string; icon: string }[] = [];

  @Output() markDirty = new EventEmitter<string>();
  @Output() resetWorkspace = new EventEmitter<void>();
  @Output() saveConfig = new EventEmitter<void>();
  @Output() confirmModuleToggle = new EventEmitter<{ key: 'qiyas' | 'agrc'; enabled: boolean }>();
  @Output() setPlatformMode = new EventEmitter<PlatformMode>();
  @Output() confirmSaveMode = new EventEmitter<void>();
  @Output() navigateToAudit = new EventEmitter<string>();

  constructor(public i18n: I18nService) {}

  /** Compute readable label for the current platform mode */
  currentModeLabel(): string {
    const m = this.platformModeOptions.find(o => o.value === this.platformMode);
    return m ? m.label : this.platformMode;
  }

  /** Emit platform mode change and mark dirty */
  onSetPlatformMode(mode: PlatformMode): void {
    this.setPlatformMode.emit(mode);
  }
}
