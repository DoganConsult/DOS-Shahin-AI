// Shahin GRC — IncidentHub  |  GRC Lifecycle: Operate
import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { IncidentsComponent } from '../../platform/config-center/features/incident/pages/incidents.component';
import { ExceptionsComponent } from '../../exceptions/exceptions.component';
import { ExceptionManagerComponent } from '../exception-manager/exception-manager.component';
import { BCPComponent } from '../../platform/config-center/features/incident/pages/bcp/bcp.component';
import { RemediationComponent } from '../../remediation/remediation.component';
import { AgentBadgeComponent } from '../../../../../../../modules/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '../../../../../../../modules/shared/hub-connections/hub-connections-strip.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface HubTab { key: string; labelEn: string; labelAr: string; icon: string; }
const TABS: HubTab[] = [
  { key: 'incidents',   labelEn: 'Incidents',         labelAr: 'الحوادث',               icon: 'pi-bolt' },
  { key: 'exceptions',  labelEn: 'Exceptions',        labelAr: 'الاستثناءات',           icon: 'pi-ban' },
  { key: 'exc-manager', labelEn: 'Exception Manager', labelAr: 'إدارة الاستثناءات',     icon: 'pi-cog' },
  { key: 'bcp',         labelEn: 'BCP',               labelAr: 'استمرارية الأعمال',     icon: 'pi-shield' },
  { key: 'remediation', labelEn: 'Remediation',       labelAr: 'المعالجة',              icon: 'pi-wrench' },
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
  .hub-tab{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius: var(--radius) 8px 0 0;border:none;background:transparent;font-size: var(--font-size-base);color:var(--text-color-secondary,var(--text-muted));cursor:pointer;transition:background .15s,color .15s;border-bottom:2px solid transparent}
  .hub-tab:hover{background:var(--surface-100,var(--surface-ice));color:var(--text-color,#111)}
  .hub-tab.active{color:var(--primary-700,#1d4ed8);border-bottom-color:var(--primary-500,#3b82f6);font-weight:600}
  .hub-tab .pi{font-size: var(--font-size-base)}
  .hub-tab-content{padding:0}
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-hub', standalone: true,
  imports: [CommonModule, RouterModule, IncidentsComponent, ExceptionsComponent, ExceptionManagerComponent, BCPComponent, RemediationComponent, AgentBadgeComponent, HubConnectionsStripComponent],
  styles: [HUB_STYLES],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap" style="background:#f3e8ff"><i class="pi pi-bolt hub-icon" style="color:#7e22ce"></i></div>
          <div>
            <div class="hub-phase" style="background:rgba(var(--module-accent-purple-rgb), .12);color:#7e22ce">{{ i18n.currentLang()==='ar' ? 'التشغيل' : 'Operate' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز الحوادث' : 'Incident Hub' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'الحوادث والاستثناءات وخطة BCP والمعالجة — الاستجابة في مكان واحد.' : 'Incidents, exceptions, BCP and remediation — response in one place.' }}</p>
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
      <app-hub-connections-strip [hubKey]="'incident'" />
      <div class="hub-tab-content">
        @if (activeTab()==='incidents')   { <app-incidents /> }
        @if (activeTab()==='exceptions')  { <app-exceptions /> }
        @if (activeTab()==='exc-manager') { <app-exception-manager /> }
        @if (activeTab()==='bcp')         { <app-bcp /> }
        @if (activeTab()==='remediation') { <app-remediation /> }
      </div>
    </div>`
})
export class IncidentHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  tabs = TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('incidents');
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => { const tab = p.get('tab'); if (tab && TABS.some(t => t.key === tab)) this.activeTab.set(tab); });
  }
}
