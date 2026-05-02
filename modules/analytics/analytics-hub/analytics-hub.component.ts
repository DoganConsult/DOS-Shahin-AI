// Shahin GRC — AnalyticsHub  |  GRC Lifecycle: Improve
import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AnalyticsDashboardComponent } from '../analytics-dashboard/analytics-dashboard.component';
import { AnalyticsHubHeaderComponent } from './analytics-hub-header.component';
import { AnalyticsHubTabsComponent, type AnalyticsHubTab } from './analytics-hub-tabs.component';
import { SharedDashboardComponent } from '../../features/analytics/pages/shared-dashboard/shared-dashboard.component';
import { DashboardSharingComponent } from '../../features/analytics/pages/dashboard-sharing/dashboard-sharing.component';
import { DataExplorerComponent } from '../../features/analytics/pages/data-explorer/data-explorer.component';
import { HubConnectionsStripComponent } from '../../shared/hub-connections/hub-connections-strip.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const TABS: AnalyticsHubTab[] = [
  { key: 'analytics', labelEn: 'Analytics',        labelAr: 'التحليلات',         icon: 'pi-chart-bar' },
  { key: 'shared',    labelEn: 'Shared Dashboards', labelAr: 'لوحات مشتركة',      icon: 'pi-th-large' },
  { key: 'sharing',   labelEn: 'Dashboard Sharing', labelAr: 'مشاركة اللوحات',   icon: 'pi-share-alt' },
  { key: 'explorer',  labelEn: 'Data Explorer',     labelAr: 'استكشاف البيانات', icon: 'pi-table' },
];

const HUB_STYLES = `
  .grc-hub{min-height:100vh;background:var(--surface-ground,var(--surface-ice))}
  .hub-tab-content{padding:0}
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics-hub', standalone: true,
  imports: [CommonModule, AnalyticsHubHeaderComponent, AnalyticsHubTabsComponent, AnalyticsDashboardComponent, SharedDashboardComponent, DashboardSharingComponent, DataExplorerComponent, HubConnectionsStripComponent],
  styles: [HUB_STYLES],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <app-analytics-hub-header [agentId]="agentId" />
      <app-analytics-hub-tabs [tabs]="tabs" [activeTab]="activeTab()" (tabChange)="activeTab.set($event)" />
      <app-hub-connections-strip [hubKey]="'analytics'" />
      <div class="hub-tab-content">
        @if (activeTab()==='analytics') { <app-analytics-dashboard /> }
        @if (activeTab()==='shared')    { <app-shared-dashboard /> }
        @if (activeTab()==='sharing')   { <app-dashboard-sharing /> }
        @if (activeTab()==='explorer')  { <app-data-explorer /> }
      </div>
    </div>`
})
export class AnalyticsHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  tabs = TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('analytics');
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => { const tab = p.get('tab'); if (tab && TABS.some(t => t.key === tab)) this.activeTab.set(tab); });
  }
}
