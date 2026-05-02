// ============================================
// Shahin GRC — Reports Hub
// GRC Lifecycle: IMPROVE
// Consolidates: Report Center | Report Hub | Report Builder | Board Report
// Connected to AGRC-OS Command Center.
// ============================================

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportCenterComponent } from '../../platform/report-center/report-center.component';
import { ReportHubComponent } from '../../platform/report-hub/report-hub.component';
import { ReportBuilderComponent } from '../../platform/report-builder/report-builder.component';
import { BoardReportComponent } from '../../modules/board-report/board-report.component';
import { AgentBadgeComponent } from '../../shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '../../shared/hub-connections/hub-connections-strip.component';
import { HubHelpPanelComponent } from '../../shared/guided-experience/hub-help-panel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface HubTab { key: string; labelEn: string; labelAr: string; icon: string; }

const HUB_STYLES = `
  .grc-hub { min-height: 100vh; background: var(--surface-ground, var(--surface-ice)); }
  .hub-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:20px 28px 0; }
  .hub-title-row { display:flex; align-items:center; gap:14px; }
  .hub-icon-wrap { width:48px; height:48px; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .hub-icon { font-size: var(--font-size-2xl); }
  .hub-phase { display:inline-block; font-size: var(--font-size-xs); font-weight:700; text-transform:uppercase; letter-spacing:.5px; padding:2px 8px; border-radius:var(--radius-xl); margin-bottom:4px; }
  .hub-phase.improve  { background:rgba(var(--module-accent-indigo-rgb), .12); color:#4338ca; }
  .hub-phase.assure   { background:rgba(var(--module-accent-green-rgb), .12); color:#15803d; }
  .hub-phase.assess   { background:rgba(var(--module-accent-amber-rgb), .12); color:var(--warning); }
  .hub-phase.implement{ background:rgba(var(--module-accent-blue-rgb), .12); color:#1d4ed8; }
  .hub-phase.operate  { background:rgba(var(--module-accent-purple-rgb), .12); color:#7e22ce; }
  .hub-phase.account  { background:rgba(var(--color-gray-400-rgb), .15); color:#374151; }
  h1 { margin:0; font-size: var(--font-size-2xl); font-weight:600; color:var(--text-heading,#111); }
  .hub-subtitle { margin:2px 0 0; font-size: var(--font-size-sm); color:var(--text-muted,var(--text-muted)); }
  .agrc-link { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:var(--radius); background:var(--primary-50,#eff6ff); color:var(--primary-700,#1d4ed8); font-size: var(--font-size-sm); font-weight:500; text-decoration:none; border:1px solid var(--primary-200,#bfdbfe); transition:background .15s; }
  .agrc-link:hover { background:var(--primary-100,#dbeafe); }
  .hub-tab-bar { display:flex; gap:4px; padding:16px 28px 0; border-bottom:1px solid var(--surface-border,var(--border-subtle)); flex-wrap:wrap; }
  .hub-tab { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius: var(--radius) 8px 0 0; border:none; background:transparent; font-size: var(--font-size-base); color:var(--text-color-secondary,var(--text-muted)); cursor:pointer; transition:background .15s,color .15s; border-bottom:2px solid transparent; }
  .hub-tab:hover { background:var(--surface-100,var(--surface-ice)); color:var(--text-color,#111); }
  .hub-tab.active { color:var(--primary-700,#1d4ed8); border-bottom-color:var(--primary-500,#3b82f6); font-weight:600; }
  .hub-tab .pi { font-size: var(--font-size-base); }
  .hub-tab-content { padding:0; }
`;

const HUB_TABS: HubTab[] = [
  { key: 'center',   labelEn: 'Report Center',   labelAr: 'مركز التقارير',       icon: 'pi-chart-bar' },
  { key: 'hub',      labelEn: 'Report Hub',       labelAr: 'محور التقارير',       icon: 'pi-book' },
  { key: 'builder',  labelEn: 'Report Builder',   labelAr: 'منشئ التقارير',       icon: 'pi-pencil' },
  { key: 'board',    labelEn: 'Board Report',     labelAr: 'تقرير مجلس الإدارة',  icon: 'pi-file-chart' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reports-hub',
  standalone: true,
  imports: [CommonModule, RouterModule,
    ReportCenterComponent, ReportHubComponent, ReportBuilderComponent, BoardReportComponent, AgentBadgeComponent, HubConnectionsStripComponent, HubHelpPanelComponent],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap" style="background:#e0e7ff">
            <i class="pi pi-file-pdf hub-icon" style="color:#4338ca"></i>
          </div>
          <div>
            <div class="hub-phase improve">{{ i18n.currentLang()==='ar' ? 'التحسين' : 'Improve' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز التقارير الموحد' : 'Reports Hub' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar'
              ? 'جميع التقارير والتحليلات — تقارير مجلس الإدارة والامتثال وما بعدها.'
              : 'All reports & analytics — board, compliance, and beyond.' }}</p>
          </div>
        </div>
        <app-agent-badge [agentId]="agentId" />
      </header>

      <div class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button class="hub-tab" role="tab"
            [class.active]="activeTab()===tab.key"
            (click)="activeTab.set(tab.key)"
            [attr.aria-selected]="activeTab()===tab.key">
            <i class="pi" [ngClass]="tab.icon"></i>
            <span>{{ i18n.currentLang()==='ar' ? tab.labelAr : tab.labelEn }}</span>
          </button>
        }
      </div>

      <app-hub-connections-strip [hubKey]="'reports'" />
      <app-hub-help-panel [hubRoute]="'/reports-hub'" />

      <div class="hub-tab-content">
        @if (activeTab()==='center')  { <app-report-center /> }
        @if (activeTab()==='hub')     { <app-report-hub /> }
        @if (activeTab()==='builder') { <app-report-builder /> }
        @if (activeTab()==='board')   { <app-board-report /> }
      </div>
    </div>
  `,
  styles: [HUB_STYLES]
})
export class ReportsHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  tabs = HUB_TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('center');

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      const tab = p.get('tab');
      if (tab && HUB_TABS.some(t => t.key === tab)) this.activeTab.set(tab);
    });
  }
}
