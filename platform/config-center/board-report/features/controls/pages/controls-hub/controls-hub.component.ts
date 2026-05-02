// Shahin GRC — Controls Hub  |  GRC Lifecycle: CONTROL
import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { CONTROLS_PRIMARY_TABS, getControlsSubTabs } from '../../controls.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const HUB_STYLES = `
  .grc-hub{min-height:100vh;background:var(--surface-ground,var(--surface-ice))}
  .hub-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 28px 0}
  .hub-title-row{display:flex;align-items:center;gap:14px}
  .hub-icon-wrap{width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .hub-icon{font-size: var(--font-size-2xl)}
  .hub-phase{display:inline-block;font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-xl);margin-bottom:4px}
  h1{margin:0;font-size: var(--font-size-2xl);font-weight:600;color:var(--text-heading,#111)}
  .hub-subtitle{margin:2px 0 0;font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
  .hub-tab-bar{display:flex;gap:4px;padding:16px 28px 0;border-bottom:1px solid var(--surface-border,var(--border-subtle));flex-wrap:wrap;overflow-x:auto}
  .hub-tab{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius: var(--radius) 8px 0 0;border:none;background:transparent;font-size: var(--font-size-base);color:var(--text-color-secondary,var(--text-muted));cursor:pointer;transition:background .15s,color .15s;border-bottom:2px solid transparent;white-space:nowrap}
  .hub-tab:hover{background:var(--surface-100,var(--surface-ice));color:var(--text-color,#111)}
  .hub-tab.active{color:var(--primary-700,#1d4ed8);border-bottom-color:var(--primary-500,#3b82f6);font-weight:600}
  .hub-tab .pi{font-size: var(--font-size-base)}
  .hub-tab-content{padding:0}
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-controls-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentBadgeComponent, HubConnectionsStripComponent, HubHelpPanelComponent, RaciPanelComponent],
  styles: [HUB_STYLES],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap" style="background:var(--status-info-bg, #e0f2fe)">
            <i class="pi pi-verified hub-icon" style="color:var(--info)"></i>
          </div>
          <div>
            <div class="hub-phase" style="background:rgba(var(--module-accent-blue-rgb), .12);color:var(--info)">{{ i18n.currentLang()==='ar' ? 'التحكم' : 'Control' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز الضوابط' : 'Controls Hub' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'مكتبة الضوابط، الاختبار، الشهادات، المراقبة المستمرة — موحد.' : 'Control library, testing, certifications, continuous monitoring — unified.' }}</p>
          </div>
        </div>
        <app-agent-badge [agentId]="agentId" />
      </header>

      <div class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button class="hub-tab" role="tab"
            [class.active]="activeTab()===tab.id"
            (click)="navigateToTab(tab.id)"
            [attr.aria-selected]="activeTab()===tab.id">
            <i class="pi" [ngClass]="'pi-' + tab.icon"></i>
            <span>{{ i18n.currentLang()==='ar' ? tab.labelAr : tab.labelEn }}</span>
          </button>
        }
      </div>

      <div style="padding: 0 28px;">
        <app-raci-panel entityType="control" entityId="" [canEdit]="true" />
      </div>
      <app-hub-connections-strip [hubKey]="'controls'" />
      <app-hub-help-panel [hubRoute]="'/controls'" />

      <div class="hub-tab-content">
        <router-outlet></router-outlet>
      </div>
    </div>`
})
export class ControlsHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  tabs = CONTROLS_PRIMARY_TABS;
  readonly agentId = 'A03';
  activeTab = signal<string>('home');

  ngOnInit(): void {
    this.route.firstChild?.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(segments => {
      if (segments?.length) {
        const tabId = segments[0].path;
        const match = this.tabs.find(t => t.route?.endsWith('/' + tabId));
        if (match) this.activeTab.set(match.id);
      }
    });
  }

  navigateToTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab?.route) {
      this.router.navigateByUrl(tab.route);
      this.activeTab.set(tabId);
    }
  }
}
