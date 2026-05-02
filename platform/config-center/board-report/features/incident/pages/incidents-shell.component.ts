import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';

interface HubTab { key: string; route: string; labelEn: string; labelAr: string; icon: string; }

const TABS: HubTab[] = [
  { key: 'overview',        route: 'overview',        labelEn: 'Overview',           labelAr: 'نظرة عامة',             icon: 'pi-home' },
  { key: 'register',        route: 'register',        labelEn: 'Incident Register',  labelAr: 'سجل الحوادث',          icon: 'pi-list' },
  { key: 'triage',          route: 'triage',          labelEn: 'Triage',             labelAr: 'الفرز',                 icon: 'pi-filter' },
  { key: 'investigation',   route: 'investigation',   labelEn: 'Investigation',      labelAr: 'التحقيق',               icon: 'pi-search' },
  { key: 'near-miss',       route: 'near-miss',       labelEn: 'Near Miss',          labelAr: 'الحوادث الوشيكة',       icon: 'pi-exclamation-circle' },
  { key: 'pir',             route: 'pir',             labelEn: 'PIR',                labelAr: 'مراجعة ما بعد الحادث',  icon: 'pi-file-edit' },
  { key: 'regulatory',      route: 'regulatory',      labelEn: 'Regulatory',         labelAr: 'الإبلاغ التنظيمي',     icon: 'pi-building' },
  { key: 'capa',            route: 'capa',            labelEn: 'CAPA',               labelAr: 'الإجراءات التصحيحية',  icon: 'pi-wrench' },
  { key: 'trends',          route: 'trends',          labelEn: 'Trends',             labelAr: 'الاتجاهات',             icon: 'pi-chart-line' },
  { key: 'reports',         route: 'reports',         labelEn: 'Reports',            labelAr: 'التقارير',              icon: 'pi-chart-bar' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incidents-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive, AgentBadgeComponent, HubConnectionsStripComponent],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap" style="background:#fef2f2"><i class="pi pi-bolt hub-icon" style="color:#dc2626"></i></div>
          <div>
            <div class="hub-phase" style="background:rgba(var(--color-red-600-rgb), .12);color:#b91c1c">{{ i18n.currentLang()==='ar' ? 'الاستجابة' : 'Respond' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز الحوادث' : 'Incident Center' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'الفرز والتحقيق والاستجابة والتقارير التنظيمية — إدارة الحوادث الشاملة.' : 'Triage, investigate, respond, and regulatory reporting — full incident lifecycle.' }}</p>
          </div>
        </div>
        <app-agent-badge [agentId]="agentId" />
      </header>
      <nav class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <a class="hub-tab" role="tab" [routerLink]="tab.route" routerLinkActive="active" [routerLinkActiveOptions]="{exact: tab.key === 'overview'}">
            <i class="pi" [ngClass]="tab.icon"></i><span>{{ i18n.currentLang()==='ar' ? tab.labelAr : tab.labelEn }}</span>
          </a>
        }
      </nav>
      <app-hub-connections-strip [hubKey]="'incident'" />
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .grc-hub{min-height:100vh;background:var(--surface-ground,var(--surface-ice))}
    .hub-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 28px 0}
    .hub-title-row{display:flex;align-items:center;gap:14px}
    .hub-icon-wrap{width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .hub-icon{font-size: var(--font-size-2xl)}
    .hub-phase{display:inline-block;font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-xl);margin-bottom:4px}
    h1{margin:0;font-size: var(--font-size-2xl);font-weight:600;color:var(--text-heading,#111)}
    .hub-subtitle{margin:2px 0 0;font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
    .hub-tab-bar{display:flex;gap:4px;padding:16px 28px 0;border-bottom:1px solid var(--surface-border,var(--border-subtle));flex-wrap:wrap}
    .hub-tab{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius: var(--radius) 8px 0 0;border:none;background:transparent;font-size: var(--font-size-base);color:var(--text-color-secondary,var(--text-muted));cursor:pointer;transition:background .15s,color .15s;border-bottom:2px solid transparent;text-decoration:none}
    .hub-tab:hover{background:var(--surface-100,var(--surface-ice));color:var(--text-color,#111)}
    .hub-tab.active{color:var(--primary-700,#1d4ed8);border-bottom-color:var(--primary-500,#3b82f6);font-weight:600}
    .hub-tab .pi{font-size: var(--font-size-base)}
    .hub-content{padding:0}
  `]
})
export class IncidentsShellComponent {
  i18n = inject(I18nService);
  tabs = TABS;
  readonly agentId = 'A06';
}
