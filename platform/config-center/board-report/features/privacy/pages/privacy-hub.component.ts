import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterModule, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';

interface HubTab { key: string; route: string; labelEn: string; labelAr: string; icon: string; }

const TABS: HubTab[] = [
  { key: 'overview',             route: 'overview',             labelEn: 'Overview',             labelAr: 'نظرة عامة',              icon: 'pi-home' },
  { key: 'data-subjects',       route: 'data-subjects',       labelEn: 'Data Subjects',        labelAr: 'طلبات أصحاب البيانات',   icon: 'pi-users' },
  { key: 'consent',             route: 'consent',             labelEn: 'Consent',              labelAr: 'الموافقة',                icon: 'pi-check-circle' },
  { key: 'processing-register', route: 'processing-register', labelEn: 'Processing Register',  labelAr: 'سجل المعالجة',           icon: 'pi-list' },
  { key: 'dpia',                route: 'dpia',                labelEn: 'DPIA',                 labelAr: 'تقييم أثر الخصوصية',     icon: 'pi-shield' },
  { key: 'breach-notification', route: 'breach-notification', labelEn: 'Breach Notification',  labelAr: 'إخطار الاختراق',         icon: 'pi-exclamation-triangle' },
  { key: 'budget',              route: 'budget',              labelEn: 'Privacy Budget',       labelAr: 'ميزانية الخصوصية',       icon: 'pi-wallet' },
];

@Component({
  selector: 'app-privacy-hub',
  standalone: true,
  imports: [RouterOutlet, RouterModule, RouterLinkActive, CommonModule, AgentBadgeComponent, HubConnectionsStripComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap" style="background:#f0fdf4"><i class="pi pi-eye-slash hub-icon" style="color:#14b8a6"></i></div>
          <div>
            <div class="hub-phase" style="background:rgba(var(--module-accent-teal-rgb), .12);color:#0d9488">{{ i18n.currentLang()==='ar' ? 'التشغيل' : 'Operate' }}</div>
            <h1>{{ i18n.currentLang()==='ar' ? 'مركز الخصوصية' : 'Privacy Hub' }}</h1>
            <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'حماية البيانات — PDPL و GDPR — الموافقة والاختراقات وطلبات أصحاب البيانات وسجل المعالجة.' : 'Data protection — PDPL & GDPR — consent, breaches, DSR, processing register, and DPIA.' }}</p>
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
      <app-hub-connections-strip [hubKey]="'privacy'" />
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
  `],
})
export class PrivacyHubComponent {
  i18n = inject(I18nService);
  tabs = TABS;
  readonly agentId = 'A01';
}
