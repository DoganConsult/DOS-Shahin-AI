// AGRC-OS — Compliance Hub  |  GRC Lifecycle: ASSURE
import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { CompliancePageComponent } from '../compliance-core/compliance-page.component';
import { AssessmentsComponent } from '../../assessments-group/assessments/assessments.component';
import { AssessmentTemplatesComponent } from '../../assessments-group/assessment-templates/assessment-templates.component';
import { FindingsComponent } from '../../findings-exceptions/findings/findings.component';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface HubTab { key: string; labelEn: string; labelAr: string; icon: string; }
const TABS: HubTab[] = [
  { key: 'compliance',  labelEn: 'Compliance',           labelAr: 'الامتثال',      icon: 'pi-shield' },
  { key: 'assessments', labelEn: 'Assessments',          labelAr: 'التقييمات',     icon: 'pi-clipboard' },
  { key: 'templates',   labelEn: 'Assessment Templates', labelAr: 'قوالب التقييم', icon: 'pi-copy' },
  { key: 'findings',    labelEn: 'Findings',             labelAr: 'النتائج',       icon: 'pi-search' },
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
  selector: 'app-compliance-hub', standalone: true,
  imports: [CommonModule, RouterModule, CompliancePageComponent, AssessmentsComponent, AssessmentTemplatesComponent, FindingsComponent, AgentBadgeComponent, HubConnectionsStripComponent, HubHelpPanelComponent],
  styles: [HUB_STYLES],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap" style="background:#dcfce7"><i class=" hub-icon" style="color:#15803d"></i></div>
          <div>
            <div class="hub-phase" style="background:rgba(var(--module-accent-green-rgb), .12);color:#15803d">{{ i18n.currentLang()==='ar' ? 'الضمان' : 'Assure' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز الامتثال' : 'Compliance Hub' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'الامتثال والتقييمات والقوالب والنتائج — موحد.' : 'Compliance, assessments, templates and findings — unified.' }}</p>
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
      <app-hub-connections-strip [hubKey]="'compliance'" />
      <app-hub-help-panel [hubRoute]="'/compliance-hub'" />
      <div class="hub-tab-content">
        @if (activeTab()==='compliance')  { <app-compliance-page /> }
        @if (activeTab()==='assessments') { <app-assessments /> }
        @if (activeTab()==='templates')   { <app-assessment-templates /> }
        @if (activeTab()==='findings')    { <app-findings /> }
      </div>
    </div>`
})
export class ComplianceHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  tabs = TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('compliance');
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => { const tab = p.get('tab'); if (tab && TABS.some(t => t.key === tab)) this.activeTab.set(tab); });
  }
}
