// Shahin GRC — GovernanceHub  |  GRC Lifecycle: Design
import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GovernanceComponent } from '../governance/governance.component';
import { PoliciesComponent } from '../policies/policies.component';
import { PolicyCodeComponent } from '../policy-code/policy-code.component';
import { OntologyCatalogComponent } from '../ontology-catalog/ontology-catalog.component';
import { TaxonomyComponent } from '../taxonomy/taxonomy.component';
import { ProceduresComponent } from '../procedures/procedures.component';
import { PolicyVersionsComponent } from '../policy-versions/policy-versions.component';
import { AgentBadgeComponent } from '../../shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '../../shared/hub-connections/hub-connections-strip.component';
import { HubHelpPanelComponent } from '../../shared/guided-experience/hub-help-panel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface HubTab { key: string; labelEn: string; labelAr: string; icon: string; }
const TABS: HubTab[] = [
  { key: 'governance',  labelEn: 'Governance',       labelAr: 'الحوكمة',            icon: 'pi-building' },
  { key: 'policies',    labelEn: 'Policies',         labelAr: 'السياسات',           icon: 'pi-file' },
  { key: 'procedures',  labelEn: 'Procedures',       labelAr: 'الإجراءات',          icon: 'pi-list' },
  { key: 'versions',    labelEn: 'Version History',  labelAr: 'سجل الإصدارات',      icon: 'pi-history' },
  { key: 'policy-code', labelEn: 'Policy Code',      labelAr: 'كود السياسات',       icon: 'pi-code' },
  { key: 'ontology',    labelEn: 'Ontology Catalog', labelAr: 'كتالوج الأنطولوجيا', icon: 'pi-sitemap' },
  { key: 'taxonomy',    labelEn: 'Taxonomy',         labelAr: 'التصنيف',            icon: 'pi-tags' },
];

const HUB_STYLES = `
  .grc-hub{min-height:100vh;background:var(--surface-ground,var(--surface-ice))}
  .hub-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 28px 0}
  .hub-title-row{display:flex;align-items:center;gap:14px}
  .hub-icon-wrap{width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .hub-icon{font-size: var(--font-size-2xl)}
  .hub-phase{display:inline-block;font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-xl);margin-bottom:4px}
  h1{margin:0;font-size: var(--font-size-2xl);font-weight:600;color:var(--text-heading,#111)}
  .hub-subtitle{margin:2px 0 0;font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
  .agrc-link{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--radius);background:var(--primary-50,#eff6ff);color:var(--primary-700,#1d4ed8);font-size: var(--font-size-sm);font-weight:500;text-decoration:none;border:1px solid var(--primary-200,#bfdbfe);transition:background .15s}
  .agrc-link:hover{background:var(--primary-100,#dbeafe)}
  .hub-tab-bar{display:flex;gap:4px;padding:16px 28px 0;border-bottom:1px solid var(--surface-border,var(--border-subtle));flex-wrap:wrap}
  .hub-tab{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px 8px 0 0;border:none;background:transparent;font-size: var(--font-size-base);color:var(--text-color-secondary,var(--text-muted));cursor:pointer;transition:background .15s,color .15s;border-bottom:2px solid transparent}
  .hub-tab:hover{background:var(--surface-100,var(--surface-ice));color:var(--text-color,#111)}
  .hub-tab.active{color:var(--primary-700,#1d4ed8);border-bottom-color:var(--primary-500,#3b82f6);font-weight:600}
  .hub-tab .pi{font-size: var(--font-size-base)}
  .hub-tab-content{padding:0}
  .hub-icon-wrap--design{background:color-mix(in srgb, var(--hub-governance) 12%, transparent)}
  .hub-icon--design{color:var(--hub-governance)}
  .hub-phase--design{background:color-mix(in srgb, var(--hub-governance) 12%, transparent);color:var(--hub-governance)}
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-governance-hub', standalone: true,
  imports: [CommonModule, RouterModule, GovernanceComponent, PoliciesComponent, ProceduresComponent, PolicyVersionsComponent, PolicyCodeComponent, OntologyCatalogComponent, TaxonomyComponent, AgentBadgeComponent, HubConnectionsStripComponent, HubHelpPanelComponent],
  styles: [HUB_STYLES],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap hub-icon-wrap--design"><i class="pi pi-file-edit hub-icon hub-icon--design"></i></div>
          <div>
            <div class="hub-phase hub-phase--design">{{ i18n.currentLang()==='ar' ? 'التصميم' : 'Design' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز الحوكمة' : 'Governance Hub' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'الحوكمة والسياسات والإجراءات وكود السياسات والأنطولوجيا والتصنيف — موحد.' : 'Governance, policies, procedures, policy code, ontology and taxonomy — unified.' }}</p>
          </div>
        </div>
        <app-agent-badge [agentId]="agentId" />
      </header>
      <div class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button class="hub-tab" role="tab" [class.active]="activeTab()===tab.key" (click)="activeTab.set(tab.key)" [attr.aria-selected]="activeTab()===tab.key">
            <i class="pi" [ngClass]="tab.icon"></i><span>{{ i18n.currentLang()==='ar' ? tab.labelAr : tab.labelEn }}</span>
          </button>
        }
      </div>
      <app-hub-connections-strip [hubKey]="'governance'" />
      <app-hub-help-panel [hubRoute]="'/governance-hub'" />
      <div class="hub-tab-content">
        @if (activeTab()==='governance')  { <app-governance /> }
        @if (activeTab()==='policies')    { <app-policies /> }
        @if (activeTab()==='procedures')  { <app-procedures /> }
        @if (activeTab()==='versions')    { <app-policy-versions /> }
        @if (activeTab()==='policy-code') { <app-policy-code /> }
        @if (activeTab()==='ontology')    { <app-ontology-catalog /> }
        @if (activeTab()==='taxonomy')    { <app-taxonomy /> }
      </div>
    </div>`
})
export class GovernanceHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  tabs = TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('governance');
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => { const tab = p.get('tab'); if (tab && TABS.some(t => t.key === tab)) this.activeTab.set(tab); });
  }
}
