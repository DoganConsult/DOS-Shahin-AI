// AGRC-OS — Admin Hub  |  GRC Lifecycle: ACCOUNT
import { Component, OnInit, computed, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { catchError, of } from 'rxjs';
import { AdministrationComponent } from '../administration/administration.component';
import { InferenceAdminComponent } from '../../../config-center/inference-admin/inference-admin.component';
import { ProvisioningDashboardComponent } from '../../../config-center/board-report/provisioning-dashboard/provisioning-dashboard.component';
import { BulkImportComponent } from '../../../config-center/bulk-actions/bulk-import/bulk-import.component';
import { TrainingDataComponent } from '../../../dnoc/modules/training-data/training-data.component';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { StorageService } from '@app/infrastructure';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

interface HubTab { key: string; labelKey: string; icon: string; }
const TABS: HubTab[] = [
  { key: 'admin',        labelKey: 'adminHub.tabAdministration', icon: 'pi-sliders-h' },
  { key: 'rbac',         labelKey: 'adminHub.tabFieldRbac',       icon: 'pi-lock' },
  { key: 'inference',    labelKey: 'adminHub.tabInferenceAdmin', icon: 'pi-microchip' },
  { key: 'provisioning', labelKey: 'adminHub.tabProvisioning',   icon: 'pi-server' },
  { key: 'bulk',         labelKey: 'adminHub.tabBulkImport',      icon: 'pi-upload' },
  { key: 'training',     labelKey: 'adminHub.tabTrainingData',  icon: 'pi-database' },
];

interface SummaryCard {
  key: string; icon: string; color: string;
  value: string;
  labelKey: string;
  route: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-hub', standalone: true,
  imports: [CommonModule, RouterModule, AdministrationComponent, InferenceAdminComponent, ProvisioningDashboardComponent, BulkImportComponent, TrainingDataComponent, AgentBadgeComponent, HubConnectionsStripComponent, HubHelpPanelComponent],
  styles: [`
    :host{display:block}
    .grc-hub{min-height:100vh;background:var(--surface-ground,var(--surface-ice))}

    /* ── Header ── */
    .hub-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:24px 28px 0}
    .hub-title-row{display:flex;align-items:center;gap:14px}
    .hub-icon-wrap{width:52px;height:52px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(135deg,var(--surface-ice),var(--border-subtle))}
    .hub-icon{font-size: var(--font-size-2xl);color:#374151}
    .hub-phase{display:inline-block;font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-xl);margin-bottom:4px}
    h1{margin:0;font-size: var(--font-size-2xl);font-weight:700;color:var(--text-heading,#111);letter-spacing:-.3px}
    .hub-subtitle{margin:2px 0 0;font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted))}

    /* ── Summary Band ── */
    .summary-band{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 28px 0}
    .summary-card{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-md);cursor:pointer;transition:box-shadow .2s,transform .15s;border-inline-start:4px solid var(--card-accent,var(--primary))}
    .summary-card:hover{box-shadow: var(--shadow-sm);transform:translateY(-1px)}
    .sc-icon{width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sc-icon i{font-size: var(--font-size-lg)}
    .sc-body{flex:1;min-width:0}
    .sc-value{font-size: var(--font-size-2xl);font-weight:800;color:var(--text-heading,var(--text-heading));line-height:1.2}
    .sc-label{font-size: var(--font-size-sm);color:var(--text-secondary,var(--text-muted));font-weight:600;margin-top:2px}

    /* ── Tab Bar ── */
    .hub-tab-bar{display:flex;gap:4px;padding:16px 28px 0;border-bottom:1px solid var(--surface-border,var(--border-subtle));flex-wrap:wrap}
    .hub-tab{display:flex;align-items:center;gap:7px;padding:10px 20px;border-radius: var(--radius) 8px 0 0;border:none;background:transparent;font-size: var(--font-size-base);color:var(--text-color-secondary,var(--text-muted));cursor:pointer;transition:background .15s,color .15s;border-bottom:2px solid transparent;font-weight:500}
    .hub-tab:hover{background:var(--surface-100,var(--surface-ice));color:var(--text-color,#111)}
    .hub-tab.active{color:var(--primary-700,#1d4ed8);border-bottom-color:var(--primary-500,var(--primary));font-weight:700;background:var(--primary-50,#eff6ff)}
    .hub-tab .pi{font-size: var(--font-size-base)}

    /* ── Tab Content ── */
    .hub-tab-content{padding:0}

    /* ── Responsive ── */
    @media(max-width:1200px){.summary-band{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:768px){
      .summary-band{grid-template-columns:1fr}
      .hub-header{flex-direction:column;align-items:flex-start}
      .hub-tab-bar{overflow-x:auto;flex-wrap:nowrap}
    }
  `],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <!-- ═══ Header ═══ -->
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap"><i class="pi pi-sliders-h hub-icon"></i></div>
          <div>
            <div class="hub-phase" style="background:rgba(var(--color-gray-400-rgb), .15);color:#374151">{{ i18n.translate('adminHub.phase') }}</div>
            <h1>{{ i18n.translate('adminHub.title') }}</h1>
            <p class="hub-subtitle">{{ i18n.translate('adminHub.subtitle') }}</p>
          </div>
        </div>
        <app-agent-badge [agentId]="agentId" />
      </header>

      <!-- ═══ Summary Band ═══ -->
      <div class="summary-band">
        @for (card of summaryCards(); track card.key) {
          <div tabindex="0" role="button" (keyup.enter)="navigateCard(card)" class="summary-card" [style.--card-accent]="card.color" (click)="navigateCard(card)">
            <div class="sc-icon" [style.background]="card.color + '15'">
              <i class="pi" [ngClass]="card.icon" [style.color]="card.color"></i>
            </div>
            <div class="sc-body">
              <div class="sc-value">{{ card.value }}</div>
              <div class="sc-label">{{ i18n.translate(card.labelKey) }}</div>
            </div>
          </div>
        }
      </div>

      <!-- ═══ Tab Bar ═══ -->
      <div class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button class="hub-tab" role="tab" [class.active]="activeTab()===tab.key" (click)="activeTab.set(tab.key)" [attr.aria-selected]="activeTab()===tab.key">
            <i class="pi" [ngClass]="tab.icon"></i><span>{{ i18n.translate(tab.labelKey) }}</span>
          </button>
        }
      </div>

      <!-- ═══ Connections + Help ═══ -->
      <app-hub-connections-strip [hubKey]="'admin'" />
      <app-hub-help-panel [hubRoute]="'/admin-hub'" />

      <!-- ═══ Tab Content ═══ -->
      <div class="hub-tab-content">
        @if (activeTab()==='admin')        { <app-administration /> }
        @if (activeTab()==='rbac')         { <app-field-rbac /> }
        @if (activeTab()==='inference')    { <app-inference-admin /> }
        @if (activeTab()==='provisioning') { <app-provisioning-dashboard /> }
        @if (activeTab()==='bulk')         { <app-bulk-import /> }
        @if (activeTab()==='training')     { <app-training-data /> }
      </div>
    </div>`
})
export class AdminHubComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private _storage = inject(StorageService);
  tabs = TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('admin');

  summary = signal<GrcRecord>({});
  summaryCards = computed<SummaryCard[]>(() => {
    const s = this.summary();
    const sm = s.summary ?? {};
    const risks = sm.totalRisks ?? 0;
    const controls = sm.totalControls ?? 0;
    const policies = sm.totalPolicies ?? 0;
    const incidents = sm.totalIncidents ?? 0;
    const users = sm.totalUsers ?? 0;
    const frameworks = sm.totalFrameworks ?? 0;
    const evidence = sm.totalEvidence ?? 0;
    const vendors = sm.totalVendors ?? 0;
    return [
      { key: 'admin', icon: 'pi-users', color: '#4f46e5', value: '' + users, labelKey: 'adminHub.cardUsers', route: '/admin-hub' },
      { key: 'risk',  icon: 'pi-exclamation-triangle', color: '#b45309', value: '' + risks, labelKey: 'adminHub.cardRisks', route: '/risk-hub' },
      { key: 'ctrl',  icon: 'pi-shield', color: '#0891b2', value: '' + controls, labelKey: 'adminHub.cardControls', route: '/compliance-hub' },
      { key: 'pol',   icon: 'pi-file', color: '#059669', value: '' + policies, labelKey: 'adminHub.cardPolicies', route: '/governance-hub' },
      { key: 'fw',    icon: 'pi-th-large', color: '#1d4ed8', value: '' + frameworks, labelKey: 'adminHub.cardFrameworks', route: '/framework-hub' },
      { key: 'inc',   icon: 'pi-bolt', color: 'var(--error)', value: '' + incidents, labelKey: 'adminHub.cardIncidents', route: '/incident-hub' },
      { key: 'ev',    icon: 'pi-folder-open', color: '#15803d', value: '' + evidence, labelKey: 'adminHub.cardEvidence', route: '/evidence-hub' },
      { key: 'vnd',   icon: 'pi-truck', color: '#7c3aed', value: '' + vendors, labelKey: 'adminHub.cardVendors', route: '/vendor-hub' },
    ];
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => { const tab = p.get('tab'); if (tab && TABS.some(t => t.key === tab)) this.activeTab.set(tab); });
    const workspaceId = this._storage.get('grc_active_workspace') || '';
    this.operationsSvc.getHomeOverview(workspaceId).pipe(catchError(() => of({})), takeUntilDestroyed(this.destroyRef)).subscribe((d: Record<string, any>) => {
      this.summary.set(d ?? {});
    });
  }

  navigateCard(card: SummaryCard): void {
    if (card.key === 'admin') {
      this.activeTab.set('admin');
    } else {
      this.router.navigate([card.route]);
    }
  }
}
