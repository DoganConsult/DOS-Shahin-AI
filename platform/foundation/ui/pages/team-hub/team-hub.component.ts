// ============================================
// Shahin GRC — Team Hub
// Single icon, multi-tab hub that consolidates:
//   Teams & RACI | Members & Org | Role Profiles
// Connected to AGRC-OS Command Center.
// ============================================

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { SessionService } from '@app/core/dauth/session/session.service';
import { TeamManagementComponent } from '../../../../../../../modules/team-management/team-management.component';
import { TeamComponent } from '../../../../../../../modules/team/team.component';
import { RoleProfilesComponent } from '../../../../../../../modules/role-profiles/role-profiles.component';
import { InvitationsPanelComponent } from './invitations-panel.component';
import { MemberLifecyclePanelComponent } from './member-lifecycle-panel.component';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcOperationsService } from '@app/grc/services/grc-governance.service';

interface HubTab {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

const HUB_TABS: HubTab[] = [
  { key: 'teams',        labelEn: 'Teams & RACI',     labelAr: 'الفرق و RACI',         icon: 'pi-users' },
  { key: 'members',      labelEn: 'Members & Org',    labelAr: 'الأعضاء والمنظمة',     icon: 'pi-building' },
  { key: 'roles',        labelEn: 'Role Profiles',    labelAr: 'ملفات الأدوار',         icon: 'pi-id-card' },
  { key: 'invitations',  labelEn: 'Invitations',      labelAr: 'الدعوات',              icon: 'pi-envelope' },
  { key: 'lifecycle',    labelEn: 'Member Lifecycle', labelAr: 'دورة حياة الأعضاء',   icon: 'pi-sync' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, TeamManagementComponent, TeamComponent, RoleProfilesComponent, InvitationsPanelComponent, MemberLifecyclePanelComponent, AgentBadgeComponent, HubConnectionsStripComponent, HubHelpPanelComponent],
  template: `
    <div class="team-hub" [dir]="i18n.direction()">

      <!-- Hub Header -->
      <header class="hub-header">
        <div class="hub-title-row">
          <div class="hub-icon-wrap">
            <i class="pi pi-users hub-icon"></i>
          </div>
          <div>
            <h1>{{ i18n.translate('teamHub.title') }}</h1>
            <p class="hub-subtitle">
              {{ i18n.translate('teamHub.subtitle') }}
            </p>
          </div>
        </div>
        <app-agent-badge [agentId]="agentId" />
      </header>

      <!-- Summary KPIs -->
      <div class="hub-kpis">
        <div class="kpi-card">
          <span class="kpi-val">{{ teamCount() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('teamHub.teams') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ memberCount() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('teamHub.members') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ raciCount() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('teamHub.raciAssignments') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ roleCount() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('teamHub.roleProfiles') }}</span>
        </div>
        <div class="kpi-card" [class.kpi-alert]="pendingInvCount() > 0">
          <span class="kpi-val">{{ pendingInvCount() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('teamHub.pendingInvitations') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ agentShadowCount() }}</span>
          <span class="kpi-lbl">{{ i18n.translate('teamHub.agentShadows') }}</span>
        </div>
      </div>

      <!-- Tab Bar -->
      <div class="hub-tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button class="hub-tab" role="tab"
            [class.active]="activeTab() === tab.key"
            (click)="activeTab.set(tab.key)"
            [attr.aria-selected]="activeTab() === tab.key">
            <i class="pi" [ngClass]="tab.icon"></i>
            <span>{{ i18n.translate('teamHub.tab.' + tab.key) }}</span>
          </button>
        }
      </div>

      <app-hub-connections-strip [hubKey]="'team'" />

      <app-hub-help-panel [hubRoute]="'/team-hub'" />

      <!-- Tab Content -->
      <div class="hub-tab-content">
        @if (activeTab() === 'teams') {
          <app-team-management />
        }
        @if (activeTab() === 'members') {
          <app-team />
        }
        @if (activeTab() === 'roles') {
          <app-role-profiles />
        }
        @if (activeTab() === 'invitations') {
          <app-invitations-panel />
        }
        @if (activeTab() === 'lifecycle') {
          <app-member-lifecycle-panel />
        }
      </div>
    </div>
  `,
  styles: [`
    .team-hub { min-height: 100vh; background: var(--surface-ground, var(--surface-ice)); }

    /* Header */
    .hub-header {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
      padding: 20px 28px 0;
    }
    .hub-title-row { display: flex; align-items: center; gap: 14px; }
    .hub-icon-wrap {
      width: 48px; height: 48px; border-radius: var(--radius-lg);
      background: var(--primary-100, #dbeafe); display: flex; align-items: center; justify-content: center;
    }
    .hub-icon { font-size: var(--font-size-2xl); color: var(--primary-700, #1d4ed8); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; color: var(--text-heading, #111); }
    .hub-subtitle { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .agrc-link {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: var(--radius);
      background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8);
      font-size: var(--font-size-sm); font-weight: 500; text-decoration: none;
      border: 1px solid var(--primary-200, #bfdbfe);
      transition: background 0.15s;
    }
    .agrc-link:hover { background: var(--primary-100, #dbeafe); }

    /* KPIs */
    .hub-kpis {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;
      padding: 16px 28px 0;
    }
    .kpi-card {
      background: var(--surface-card, #fff); border-radius: var(--radius-md);
      border: 1px solid var(--surface-border, var(--border-subtle));
      padding: 14px 18px; display: flex; flex-direction: column; gap: 2px;
    }
    .kpi-card.kpi-alert { border-color: var(--warning); background: #fffbeb; }
    .kpi-card.kpi-alert .kpi-val { color: var(--warning); }
    .kpi-val { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading, #111); }
    .kpi-lbl { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }

    /* Tab bar */
    .hub-tab-bar {
      display: flex; gap: 4px; padding: 16px 28px 0;
      border-bottom: 1px solid var(--surface-border, var(--border-subtle));
    }
    .hub-tab {
      display: flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: var(--radius) 8px 0 0;
      border: none; background: transparent;
      font-size: var(--font-size-base); color: var(--text-color-secondary, var(--text-muted));
      cursor: pointer; transition: background 0.15s, color 0.15s;
      border-bottom: 2px solid transparent;
    }
    .hub-tab:hover { background: var(--surface-100, var(--surface-ice)); color: var(--text-color, #111); }
    .hub-tab.active {
      color: var(--primary-700, #1d4ed8);
      border-bottom: 2px solid var(--primary-500, var(--primary));
      font-weight: 600;
    }
    .hub-tab .pi { font-size: var(--font-size-base); }

    /* Tab content */
    .hub-tab-content { padding: 0; }
    /* Remove inner page padding doubling */
  `]
})
export class TeamHubComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private auth = inject(SessionService);
  private route = inject(ActivatedRoute);

  tabs = HUB_TABS;
  readonly agentId = 'A01';
  activeTab = signal<string>('teams');

  teamCount = signal(0);
  memberCount = signal(0);
  raciCount = signal(0);
  roleCount = signal(0);
  pendingInvCount = signal(0);
  agentShadowCount = signal(0);

  ngOnInit(): void {
    // Support ?tab= query param from AGRC-OS quick links
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const tab = params.get('tab');
      if (tab && HUB_TABS.some(t => t.key === tab)) {
        this.activeTab.set(tab);
      }
    });
    this.loadSummary();
  }

  private loadSummary(): void {
    // Team count
    this.operationsSvc.getTeams().subscribe({
      next: (d: Record<string, unknown>) => {
        const teams = d?.teams ?? (Array.isArray(d) ? d : []);
        this.teamCount.set(teams.length);
        const total = teams.reduce((s: number, t: Record<string, unknown>) => s + (t.memberCount ?? t.member_count ?? 0), 0);
        this.memberCount.set(total);
      },
      error: (e: unknown) => devError("[API]", e)
    });
    // Role profiles count
    this.operationsSvc.getRoleProfiles().subscribe({
      next: (d: Record<string, unknown>) => {
        const profiles = d?.profiles ?? (Array.isArray(d) ? d : []);
        this.roleCount.set(profiles.length);
      },
      error: (e: unknown) => devError("[API]", e)
    });
    this.operationsSvc.getTeamRACICount().subscribe({
      next: (d: Record<string, unknown>) => { this.raciCount.set(d?.count ?? 0); },
      error: (e: unknown) => devError("[API]", e)
    });
    this.operationsSvc.getInvitations({ status: 'pending' }).subscribe({
      next: (d: Record<string, unknown>) => { this.pendingInvCount.set(d?.invitations?.length ?? d?.count ?? 0); },
      error: (e: unknown) => devError("[API]", e)
    });
    this.operationsSvc.getMemberDirectory().subscribe({
      next: (d: Record<string, unknown>) => {
        const members = d?.members || [];
        this.agentShadowCount.set(members.filter((m: Record<string, unknown>) => m.shadowCount > 0).length);
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }
}
