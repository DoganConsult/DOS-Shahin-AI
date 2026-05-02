import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { Team, RACI_ROLES } from '../models/team.models';
import { GrcRecord } from '../shared/foundation-types';

/**
 * Tab 1: Teams Directory -- shows team cards with members, RACI mini, and action buttons.
 */
@Component({
  selector: 'app-team-list-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    CardModule, TableModule, TagModule, ButtonModule, InputTextModule, ToolbarModule, TooltipModule,
  ],
  template: `
    <!-- Search Toolbar -->
    <p-toolbar styleClass="mb-3">
      <div class="p-toolbar-group-start">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText type="text" class="search-input"
            [placeholder]="i18n.translate('teamManagement.searchTeams')" [attr.aria-label]="i18n.translate('teamManagement.searchTeams')"
            [ngModel]="teamSearch()" (ngModelChange)="teamSearch.set($event)" />
        </span>
      </div>
      <div class="p-toolbar-group-end">
        <p-button [label]="i18n.translate('teamManagement.newTeam')" icon="pi pi-plus"
          (onClick)="createTeam.emit()" severity="primary" size="small" />
        <p-button [label]="i18n.translate('teamManagement.refresh')" icon="pi pi-refresh"
          (onClick)="refresh.emit()" [outlined]="true" severity="secondary" size="small" />
      </div>
    </p-toolbar>

    @if (filteredTeams().length === 0 && !loading()) {
      <div class="empty-state">
        <div class="empty-icon"><i class="pi pi-users"></i></div>
        @if (teams().length === 0) {
          <h3>{{ i18n.translate('teamManagement.noTeamsYet') }}</h3>
          <p>{{ i18n.translate('teamManagement.createYourFirstTeamToDistributeResponsib') }}</p>
          <p-button [label]="i18n.translate('teamManagement.createFirstTeam')"
            icon="pi pi-plus" (onClick)="createTeam.emit()" />
        } @else {
          <h3>{{ i18n.translate('teamManagement.noTeamsMatchYourSearch') }}</h3>
          <p>{{ i18n.translate('teamManagement.tryADifferentSearchTerm') }}</p>
        }
      </div>
    }

    <div class="team-grid">
      @for (team of paginatedTeams(); track team.team_id) {
        <div tabindex="0" role="button" (keyup.enter)="selectTeam.emit(team)" class="team-card" [class.expanded]="expandedTeamId() === team.team_id"
             (click)="selectTeam.emit(team)">
          <div class="tc-header">
            <div class="tc-avatar" [style.background]="teamColor(team.team_id)">
              {{ teamInitials(team) }}
            </div>
            <div class="tc-info">
              <h3>{{ i18n.localize(team.name_en || team.name, team.name_ar || team.name_en || team.name) }}</h3>
              <span class="tc-sub">{{ team.member_count || team.members?.length || 0 }} {{ i18n.translate('teamManagement.members') }}</span>
            </div>
            <div class="tc-badges">
              @if (team.linked_workflows?.length) {
                <span class="tc-badge wf" pTooltip="Linked workflows">
                  <i class="pi pi-sitemap"></i> {{ team.linked_workflows.length }}
                </span>
              }
              @if (team.linked_control_groups?.length) {
                <span class="tc-badge cg" pTooltip="Control groups">
                  <i class="pi pi-shield"></i> {{ team.linked_control_groups.length }}
                </span>
              }
            </div>
          </div>

          <!-- Members strip -->
          <div class="tc-members">
            @for (m of (team.members || []).slice(0, 5); track m.user_id || $index) {
              <div class="member-chip" [pTooltip]="m.name + ' — ' + (m.role || 'member')">
                <span class="mc-avatar" [style.background]="memberColor(m)">{{ memberInitial(m) }}</span>
                <span class="mc-name">{{ (m.name ? m.name.split(' ')[0] : '') || (m.email ? m.email.split('@')[0] : '') || '?' }}</span>
                <p-tag [value]="m.role || 'member'" [severity]="roleSeverity(m.role)" styleClass="mc-role"
                  (click)="canManage() ? changeMemberRole.emit({ team, member: m }) : null; $event.stopPropagation()" [style]="canManage() ? {'cursor':'pointer'} : {}" />
                @if (canManage()) {
                  <i tabindex="0" role="button" (keyup.enter)="removeMember.emit({ team, member: m }); $event.stopPropagation()" class="pi pi-times mc-remove" pTooltip="Remove" (click)="removeMember.emit({ team, member: m }); $event.stopPropagation()"></i>
                }
              </div>
            }
            @if ((team.members?.length || 0) > 5) {
              <span class="member-more">+{{ (team.members?.length || 0) - 5 }}</span>
            }
            @if (!team.members?.length) {
              <span class="no-members">{{ i18n.translate('teamManagement.noMembersYet') }}</span>
            }
          </div>

          <!-- RACI mini -->
          <div class="tc-raci-mini">
            @for (r of raciRoles; track r) {
              <span class="raci-dot" [class]="'rd-' + r"
                [pTooltip]="raciFullLabel(r)">{{ raciLetter(r) }}</span>
            }
            <span class="raci-count">{{ getRaciCount(team.team_id) }} {{ i18n.translate('teamManagement.assignments') }}</span>
          </div>

          <!-- Actions -->
          <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="tc-actions" (click)="$event.stopPropagation()">
            <p-button icon="pi pi-user-plus" [pTooltip]="i18n.translate('teamManagement.addMember')"
              size="small" [rounded]="true" [outlined]="true"
              (onClick)="addMember.emit(team)" />
            <p-button icon="pi pi-envelope" [pTooltip]="i18n.translate('teamManagement.inviteMember')"
              size="small" [rounded]="true" [outlined]="true"
              (onClick)="inviteMember.emit(team)" />
            <p-button icon="pi pi-sitemap" [pTooltip]="i18n.translate('teamManagement.assignRaci')"
              size="small" [rounded]="true" [outlined]="true"
              (onClick)="assignRaci.emit(team)" />
            <p-button icon="pi pi-link" [pTooltip]="i18n.translate('teamManagement.linkWorkflow')"
              size="small" [rounded]="true" [outlined]="true"
              (onClick)="linkWorkflow.emit(team)" />
            <p-button icon="pi pi-shield" [pTooltip]="i18n.translate('teamManagement.linkControlGroup')"
              size="small" [rounded]="true" [outlined]="true"
              (onClick)="linkControlGroup.emit(team)" />
            <p-button icon="pi pi-chart-bar" [pTooltip]="i18n.translate('teamManagement.workload')"
              size="small" [rounded]="true" [outlined]="true"
              (onClick)="viewWorkload.emit(team)" />
            <p-button icon="pi pi-pencil" [pTooltip]="i18n.translate('teamManagement.edit')"
              size="small" [rounded]="true" [outlined]="true" severity="info"
              (onClick)="editTeam.emit(team)" />
            <p-button icon="pi pi-trash" [pTooltip]="i18n.translate('teamManagement.delete')"
              size="small" [rounded]="true" [outlined]="true" severity="danger"
              (onClick)="deleteTeam.emit(team)" />
          </div>
        </div>
      }
    </div>

    @if (filteredTeams().length > teamsPerPage) {
      <div class="team-pagination">
        <p-button icon="pi pi-chevron-left" [outlined]="true" size="small" [disabled]="teamPage() === 0"
          (onClick)="teamPage.set(teamPage() - 1)" />
        <span class="tp-info">{{ teamPage() + 1 }} / {{ teamTotalPages() }}</span>
        <p-button icon="pi pi-chevron-right" [outlined]="true" size="small" [disabled]="teamPage() >= teamTotalPages() - 1"
          (onClick)="teamPage.set(teamPage() + 1)" />
      </div>
    }
  `,
  styles: [`
    .search-input { min-width: 220px; }
    .empty-state {
      text-align: center; padding: 60px 20px;
      background: var(--surface-50); border-radius: var(--radius-xl); border: 2px dashed var(--surface-border);
    }
    .empty-icon { font-size: var(--font-size-6xl); color: var(--primary-color); margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 8px; }
    .empty-state p { color: var(--text-color-secondary); margin-bottom: 20px; }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
    .team-pagination {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      margin-top: 16px; padding: 8px 0;
    }
    .tp-info { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-color-secondary); }
    .team-card {
      background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg);
      padding: 20px; cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .team-card:hover { border-color: var(--primary-color); box-shadow: 0 4px 20px rgba(var(--module-accent-blue-rgb), 0.08); }
    .team-card.expanded { border-color: var(--primary-color); border-width: 2px; }
    .tc-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .tc-avatar {
      width: 48px; height: 48px; border-radius: var(--radius-lg); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: var(--font-size-body-md); flex-shrink: 0;
    }
    .tc-info h3 { margin: 0; font-size: 1.05rem; }
    .tc-sub { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .tc-badges { margin-inline-start: auto; display: flex; gap: 8px; }
    .tc-badge {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-sm); font-weight: 600;
    }
    .tc-badge.wf { background: #eff6ff; color: #1d4ed8; }
    .tc-badge.cg { background: var(--status-success-bg, #defbe6); color: #166534; }
    .tc-members { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .member-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 10px 4px 4px; border-radius: var(--radius-xl);
      background: var(--surface-50); border: 1px solid var(--surface-border); font-size: var(--font-size-caption);
    }
    .mc-avatar {
      width: 26px; height: 26px; border-radius: var(--radius-pill); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xs); font-weight: 700; flex-shrink: 0;
    }
    .mc-name { font-weight: 500; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .member-more {
      padding: 4px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-sm);
      background: var(--primary-50); color: var(--primary-700); font-weight: 600;
    }
    .no-members { font-size: var(--font-size-caption); color: var(--text-color-secondary); font-style: italic; }
    .mc-remove {
      font-size: 0.6rem; cursor: pointer; color: var(--text-color-secondary);
      margin-inline-start: 2px; padding: 2px; border-radius: var(--radius-pill);
      transition: all 0.15s;
    }
    .mc-remove:hover { color: var(--error); background: var(--status-danger-bg, #fff1f1); }
    .tc-raci-mini { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
    .raci-dot {
      width: 26px; height: 26px; border-radius: var(--radius-sm);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: var(--font-size-sm); font-weight: 800; color: white;
    }
    .rd-responsible { background: var(--success); }
    .rd-accountable { background: #2563eb; }
    .rd-consulted { background: var(--warning); }
    .rd-informed { background: var(--text-muted); }
    .raci-count { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-inline-start: auto; }
    .tc-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--surface-border); }
  `]
})
export class TeamListTabComponent {
  readonly i18n = inject(I18nService);

  // -- Inputs --
  teams = input.required<Team[]>();
  loading = input<boolean>(false);
  expandedTeamId = input<string | null>(null);
  raciData = input<Record<string, GrcRecord[]>>({});
  canManage = input<boolean>(false);

  // -- Outputs --
  createTeam = output<void>();
  refresh = output<void>();
  selectTeam = output<Team>();
  editTeam = output<Team>();
  deleteTeam = output<Team>();
  addMember = output<Team>();
  inviteMember = output<Team>();
  removeMember = output<{ team: Team; member: GrcRecord }>();
  changeMemberRole = output<{ team: Team; member: GrcRecord }>();
  assignRaci = output<Team>();
  linkWorkflow = output<Team>();
  linkControlGroup = output<Team>();
  viewWorkload = output<Team>();

  // -- Local state --
  teamSearch = signal('');
  teamPage = signal(0);
  readonly teamsPerPage = 12;
  readonly raciRoles = [...RACI_ROLES];

  filteredTeams = computed(() => {
    const q = this.teamSearch().toLowerCase().trim();
    if (!q) return this.teams();
    return this.teams().filter(t => {
      const name = (t.name_en || t.name || t.name_ar || '').toLowerCase();
      return name.includes(q);
    });
  });

  teamTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredTeams().length / this.teamsPerPage)));

  paginatedTeams = computed(() => {
    const start = this.teamPage() * this.teamsPerPage;
    return this.filteredTeams().slice(start, start + this.teamsPerPage);
  });

  // -- Helpers --
  teamInitials(team: Team): string {
    const name = team.name_en || team.name || '';
    const parts = name.split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  memberInitial(m: GrcRecord): string {
    return (m.name || m.email || '?')[0].toUpperCase();
  }

  teamColor(id: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < (id || '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  memberColor(m: GrcRecord): string {
    return this.teamColor(m.user_id || m.email || m.name || '?');
  }

  roleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      lead: 'info', admin: 'danger', owner: 'info', manager: 'warning',
      auditor: 'warning', member: 'secondary', reviewer: 'success', approver: 'info',
    };
    return map[role?.toLowerCase()] || 'secondary';
  }

  raciLetter(role: string): string { return role.charAt(0).toUpperCase(); }

  raciFullLabel(role: string): string {
    if (this.i18n.currentLang() === 'ar') {
      const map: Record<string, string> = { responsible: '\u0645\u0633\u0624\u0648\u0644', accountable: '\u0645\u062D\u0627\u0633\u0628', consulted: '\u0645\u0633\u062A\u0634\u0627\u0631', informed: '\u0645\u064F\u0628\u0644\u064E\u063A' };
      return map[role] || role;
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  getRaciCount(teamId: string): number {
    return (this.raciData()[teamId] || []).length;
  }
}
