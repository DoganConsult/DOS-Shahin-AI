import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SessionService } from '@app/core/dauth/session/session.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { FoundationPageShellStubComponent as PageShellComponent } from '../shared/foundation-shared-components';
import { FoundationStatusBadgeComponent as StatusBadgeComponent } from '../shared/foundation-shared-components';
import { environment } from '@env/environment';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabs';
import { ChipModule } from 'primeng/chip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcOperationsService } from '@app/grc/services/grc-governance.service';
import { ApiClientService } from '@app/core/services/api-client.service';

interface TeamMember {
  user_id: string;
  email: string;
  name: string;
  role: string;
  language: string;
  dashboard_role: string;
  onboarding_complete: boolean;
  created_at: string;
  teamNames?: string[];
}

interface RoleDefinition {
  role_id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  permissions: string[];
  is_system: boolean;
  can_approve: boolean;
  max_risk_level: string;
  sort_order: number;
}

interface UserActivity {
  activity_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
    InputTextModule, DropdownModule, CardModule, TooltipModule, TabViewModule, ChipModule, AppDatePipe],
  template: `
    <app-page-shell
      icon="users"
      [title]="i18n.translate('team.title')"
      [subtitle]="i18n.translate('team.subtitle')"
      [breadcrumbs]="['Dashboard', 'Team']"
      [loading]="loading">

      <!-- Org Summary Cards -->
      <div class="org-cards" *ngIf="tenant">
        <div class="org-card">
          <div class="org-card-icon"><i class="pi pi-building"></i></div>
          <div class="org-card-info">
            <div class="org-card-label">{{ i18n.translate('team.organization') }}</div>
            <div class="org-card-value">{{ tenant.org_name }}</div>
          </div>
        </div>
        <div class="org-card">
          <div class="org-card-icon purple"><i class="pi pi-briefcase"></i></div>
          <div class="org-card-info">
            <div class="org-card-label">{{ i18n.translate('team.industry') }}</div>
            <div class="org-card-value">{{ tenant.industry }}</div>
          </div>
        </div>
        <div class="org-card">
          <div class="org-card-icon green"><i class="pi pi-users"></i></div>
          <div class="org-card-info">
            <div class="org-card-label">{{ i18n.translate('team.members') }}</div>
            <div class="org-card-value">{{ members.length }}</div>
          </div>
        </div>
        <div class="org-card">
          <div class="org-card-icon amber"><i class="pi pi-star"></i></div>
          <div class="org-card-info">
            <div class="org-card-label">{{ i18n.translate('team.plan') }}</div>
            <div class="org-card-value">{{ tenant.plan | uppercase }}</div>
          </div>
        </div>
      </div>

      <p-tabView [(activeIndex)]="activeTab">
        <!-- Tab 1: Org Settings -->
        <p-tabPanel [header]="i18n.translate('team.organizationSettings')">
          <div class="org-settings" *ngIf="tenant">
            <div class="field-row">
              <div class="field">
                <label>{{ i18n.translate('team.organizationName') }}</label>
                <input pInputText [(ngModel)]="tenant.org_name" class="w-full" />
              </div>
              <div class="field">
                <label>{{ i18n.translate('team.logoUrl') }}</label>
                <input pInputText [(ngModel)]="tenant.logo_url" class="w-full" placeholder="https://..." aria-label="https://..." />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>{{ i18n.translate('team.primaryColor') }}</label>
                <input pInputText [(ngModel)]="tenant.primary_color" class="w-full" />
              </div>
              <div class="field">
                <label>{{ i18n.translate('team.customDomain') }}</label>
                <input pInputText [(ngModel)]="tenant.custom_domain" class="w-full" placeholder="grc.company.com" aria-label="grc.company.com" />
              </div>
            </div>
            <p-button *ngIf="canManageTenant" [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="saveTenantSettings()" />
          </div>
        </p-tabPanel>

        <!-- Tab 2: Team Members -->
        <p-tabPanel [header]="i18n.translate('team.teamMembers')">
          <p-table aria-label="Members table" [value]="members" [paginator]="members.length > 10" [rows]="10" styleClass="p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('common.name') }}</th>
                <th>{{ i18n.translate('team.email') }}</th>
                <th>{{ i18n.translate('team.role') }}</th>
                <th>{{ i18n.translate('team.teams') }}</th>
                <th>{{ i18n.translate('team.canApprove') }}</th>
                <th>{{ i18n.translate('common.status') }}</th>
                <th>{{ i18n.translate('team.joined') }}</th>
                <th style="width:120px">{{ i18n.translate('common.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-m>
              <tr>
                <td><strong>{{ m.name }}</strong></td>
                <td>{{ m.email }}</td>
                <td>
                  <p-tag [value]="getRoleDisplayName(m.role)" [severity]="getRoleSeverity(m.role)" [rounded]="true" />
                </td>
                <td>
                  <span *ngIf="m.teamNames?.length; else noTeams">
                    <p-tag *ngFor="let tn of m.teamNames" [value]="tn" severity="info" [rounded]="true" styleClass="mr-1 mb-1" />
                  </span>
                  <ng-template #noTeams><span class="text-color-secondary text-xs">—</span></ng-template>
                </td>
                <td>
                  <i class="pi" [ngClass]="canRoleApprove(m.role) ? 'pi-check-circle approve-yes' : 'pi-times-circle approve-no'"></i>
                </td>
                <td>
                  <span class="status-dot" [class.active]="m.onboarding_complete"></span>
                  {{ m.onboarding_complete ? i18n.translate('common.active') : i18n.translate('common.pending') }}
                </td>
                <td>{{ m.created_at | appDate:'medium' }}</td>
                <td>
                  <ng-container *ngIf="canManageUsers">
                    <button aria-label="Change Role" class="icon-btn" (click)="openRoleDialog(m)" pTooltip="Change Role"><i class="pi pi-user-edit"></i></button>
                    <button aria-label="View Activity" class="icon-btn" (click)="viewMemberActivity(m)" pTooltip="View Activity"><i class="pi pi-history"></i></button>
                  </ng-container>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="empty-msg">{{ i18n.translate('common.noData') }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 3: Roles & Permissions -->
        <p-tabPanel [header]="i18n.translate('team.rolesAndPermissions')">
          <div class="roles-grid">
            <div class="role-card" *ngFor="let role of roles" [class.system-role]="role.is_system">
              <div class="role-card-header">
                <div class="role-icon-wrap" [ngClass]="'role-' + role.role_id">
                  <i class="pi pi-shield"></i>
                </div>
                <div>
                  <h3 class="role-name">{{ i18n.localize(role.name_en, role.name_ar) }}</h3>
                  <span class="role-meta">
                    <span *ngIf="role.is_system" class="system-badge">{{ i18n.translate('team.system') }}</span>
                    <span *ngIf="role.can_approve" class="approve-badge"><i class="pi pi-check"></i> {{ i18n.translate('team.approver') }}</span>
                    <span class="risk-badge" [ngClass]="'risk-' + role.max_risk_level">{{ role.max_risk_level }}</span>
                  </span>
                </div>
              </div>
              <p class="role-desc">{{ i18n.localize(role.description_en, role.description_ar) }}</p>
              <div class="role-perms">
                <span class="perm-label">{{ i18n.translate('team.permissions') }}:</span>
                <div class="perm-chips">
                  <p-chip *ngFor="let p of role.permissions | slice:0:8" [label]="p" styleClass="perm-chip" />
                  <span *ngIf="role.permissions.length > 8" class="perm-more">+{{ role.permissions.length - 8 }} {{ i18n.translate('team.more') }}</span>
                </div>
              </div>
              <div class="role-members">
                <span class="perm-label">{{ i18n.translate('team.members') }}:</span>
                <span class="member-count">{{ getMembersForRole(role.role_id).length }}</span>
                <span class="member-names" *ngIf="getMembersForRole(role.role_id).length > 0">
                  ({{ getMemberNamesPreview(role.role_id) }})
                </span>
              </div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 4: Activity Log -->
        <p-tabPanel [header]="i18n.translate('team.activityLog')">
          <div class="activity-filters">
            <p-dropdown [(ngModel)]="activityUserFilter" [options]="memberFilterOptions"
                        optionLabel="label" optionValue="value"
                        [placeholder]="i18n.translate('team.allMembers')"
                        [showClear]="true" (onChange)="loadActivities()"
                        [style]="{'min-width':'200px'}" />
          </div>
          <div class="activity-timeline">
            <div *ngFor="let a of activities" class="activity-entry">
              <div class="activity-icon-wrap">
                <i class="pi" [ngClass]="getActivityIcon(a.action)"></i>
              </div>
              <div class="activity-body">
                <div class="activity-header-row">
                  <strong class="activity-user">{{ a.user_name || a.user_email }}</strong>
                  <span class="activity-action-badge" [ngClass]="'action-' + a.action">{{ a.action }}</span>
                  <span class="activity-module" *ngIf="a.module">{{ a.module }}</span>
                </div>
                <p class="activity-desc" *ngIf="a.description">{{ a.description }}</p>
                <span class="activity-time">{{ a.created_at | appDate:'medium' }}</span>
              </div>
            </div>
            <div *ngIf="activities.length === 0 && !activitiesLoading" class="empty-state">
              <i class="pi pi-history" style="font-size: var(--font-size-4xl);color:#94a3b8;display:block;margin-bottom:8px"></i>
              <p>{{ i18n.translate('team.noActivities') }}</p>
            </div>
            <div *ngIf="activitiesLoading" class="loading-indicator">
              <i class="pi pi-spin pi-spinner"></i> {{ i18n.translate('common.loading') }}
            </div>
            <div class="activity-load-more" *ngIf="activities.length < activitiesTotal && !activitiesLoading">
              <p-button [label]="i18n.translate('team.loadMore')" icon="pi pi-chevron-down"
                        [text]="true" (onClick)="loadMoreActivities()" />
            </div>
          </div>
        </p-tabPanel>
      </p-tabView>

      <!-- Change Role Dialog -->
      <p-dialog [header]="i18n.translate('team.changeRole')" [(visible)]="showRoleDialog" [modal]="true" [style]="{width:'480px'}">
        <div class="dialog-form" *ngIf="editingMember">
          <p class="role-dialog-user">{{ editingMember.name }} ({{ editingMember.email }})</p>
          <div class="field">
            <label>{{ i18n.translate('team.newRole') }}</label>
            <p-dropdown [(ngModel)]="newRole" [options]="roleOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="selected-role-info" *ngIf="getSelectedRoleInfo()">
            <p class="sri-desc">{{ i18n.localize(getSelectedRoleInfo()!.description_en, getSelectedRoleInfo()!.description_ar) }}</p>
            <div class="sri-badges">
              <span *ngIf="getSelectedRoleInfo()!.can_approve" class="approve-badge"><i class="pi pi-check"></i> {{ i18n.translate('team.canApprove') }}</span>
              <span class="risk-badge" [ngClass]="'risk-' + getSelectedRoleInfo()!.max_risk_level">
                {{ i18n.translate('team.maxRisk') }}: {{ getSelectedRoleInfo()!.max_risk_level }}
              </span>
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showRoleDialog=false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="changeRole()" />
        </ng-template>
      </p-dialog>

      <!-- Member Activity Dialog -->
      <p-dialog [header]="memberActivityName + ' — ' + i18n.translate('team.activityLog')"
                [(visible)]="showMemberActivityDialog" [modal]="true" [style]="{width:'600px'}">
        <div class="activity-timeline" *ngIf="memberActivities.length > 0">
          <div *ngFor="let a of memberActivities" class="activity-entry">
            <div class="activity-icon-wrap">
              <i class="pi" [ngClass]="getActivityIcon(a.action)"></i>
            </div>
            <div class="activity-body">
              <div class="activity-header-row">
                <span class="activity-action-badge" [ngClass]="'action-' + a.action">{{ a.action }}</span>
                <span class="activity-module" *ngIf="a.module">{{ a.module }}</span>
              </div>
              <p class="activity-desc" *ngIf="a.description">{{ a.description }}</p>
              <span class="activity-time">{{ a.created_at | appDate:'medium' }}</span>
            </div>
          </div>
        </div>
        <div *ngIf="memberActivities.length === 0" class="empty-state" style="padding:24px;text-align:center">
          <p>{{ i18n.translate('team.noActivities') }}</p>
        </div>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .org-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .org-card {
      display: flex; align-items: center; gap: 14px; padding: 20px;
      background: #fff; border-radius: var(--radius-lg); border: 1px solid #bae6fd;
      box-shadow: var(--shadow-sm);
    }
    .org-card-icon {
      width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex;
      align-items: center; justify-content: center; background: #e0f2fe; color: #0369a1; font-size: var(--font-size-xl);
    }
    .org-card-icon.purple { background: #f3e8ff; color: #7c3aed; }
    .org-card-icon.green { background: #ecfdf5; color: var(--success); }
    .org-card-icon.amber { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .org-card-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .org-card-value { font-size: var(--font-size-lg); font-weight: 800; color: var(--text-heading); }
    .org-settings { background: #fff; border-radius: var(--radius-lg); border: 1px solid #e0f2fe; padding: 24px; margin-bottom: 16px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .status-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: var(--radius-pill);
      background: var(--text-muted); margin-inline-end: 6px;
    }
    .status-dot.active { background: var(--success); }
    .approve-yes { color: var(--success); font-size: var(--font-size-md); }
    .approve-no { color: #cbd5e1; font-size: var(--font-size-md); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: var(--radius-sm); transition: all 150ms; }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: 32px; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .role-dialog-user { font-size: var(--font-size-base); font-weight: 600; color: var(--text-heading); margin: 0; }
    .selected-role-info { background: var(--status-info-bg, #edf5ff); border: 1px solid #bae6fd; border-radius: var(--radius-md); padding: 14px; margin-top: 8px; }
    .sri-desc { font-size: var(--font-size-sm); color: #334155; margin: 0 0 10px; line-height: 1.5; }
    .sri-badges { display: flex; gap: 8px; flex-wrap: wrap; }

    /* Roles Grid */
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .role-card {
      background: #fff; border: 1px solid #e0f2fe; border-radius: var(--radius-lg); padding: 20px;
      box-shadow: var(--shadow-sm); transition: box-shadow 200ms;
    }
    .role-card:hover { box-shadow: var(--shadow-md); }
    .role-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .role-icon-wrap {
      width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center;
      justify-content: center; font-size: var(--font-size-lg); color: #fff;
    }
    .role-icon-wrap.role-owner { background: linear-gradient(135deg, var(--error), var(--error)); }
    .role-icon-wrap.role-admin { background: linear-gradient(135deg, var(--warning), var(--warning)); }
    .role-icon-wrap.role-compliance_officer { background: linear-gradient(135deg, var(--primary), #0284c7); }
    .role-icon-wrap.role-risk_manager { background: linear-gradient(135deg, var(--secondary, #8b5cf6), #7c3aed); }
    .role-icon-wrap.role-auditor { background: linear-gradient(135deg, var(--success), var(--success)); }
    .role-icon-wrap.role-viewer { background: linear-gradient(135deg, var(--text-muted), var(--text-muted)); }
    .role-name { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); margin: 0; }
    .role-meta { display: flex; gap: 6px; align-items: center; margin-top: 2px; }
    .system-badge { font-size: var(--font-size-xs); font-weight: 600; background: var(--surface-ice); color: var(--text-muted); padding: 2px 6px; border-radius: var(--radius-xs); }
    .approve-badge { font-size: var(--font-size-xs); font-weight: 600; background: #ecfdf5; color: var(--success); padding: 2px 6px; border-radius: var(--radius-xs); display: flex; align-items: center; gap: 2px; }
    .approve-badge .pi { font-size: var(--font-size-xs); }
    .risk-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 6px; border-radius: var(--radius-xs); text-transform: uppercase; }
    .risk-badge.risk-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .risk-badge.risk-high { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .risk-badge.risk-medium { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .risk-badge.risk-low { background: var(--status-success-bg, #defbe6); color: var(--success); }
    .role-desc { font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.5; margin: 0 0 12px; }
    .role-perms { margin-bottom: 10px; }
    .perm-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .perm-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .perm-more { font-size: var(--font-size-xs); color: var(--primary); font-weight: 600; align-self: center; }
    .role-members { display: flex; align-items: center; gap: 6px; }
    .member-count { font-size: var(--font-size-base); font-weight: 700; color: var(--primary); }
    .member-names { font-size: var(--font-size-xs); color: var(--text-muted); }

    /* Activity Log */
    .activity-filters { margin-bottom: 16px; }
    .activity-timeline { display: flex; flex-direction: column; gap: 0; }
    .activity-entry {
      display: flex; gap: 12px; padding: 12px 0;
      border-bottom: 1px solid var(--surface-ice);
    }
    .activity-entry:last-child { border-bottom: none; }
    .activity-icon-wrap {
      width: 32px; height: 32px; border-radius: var(--radius); display: flex; align-items: center;
      justify-content: center; background: var(--status-info-bg, #edf5ff); color: var(--primary); font-size: var(--font-size-base); flex-shrink: 0;
    }
    .activity-body { flex: 1; min-width: 0; }
    .activity-header-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .activity-user { font-size: var(--font-size-sm); color: var(--text-heading); }
    .activity-action-badge {
      font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-xs);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .action-create { background: #ecfdf5; color: var(--success); }
    .action-update { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .action-delete { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .action-login { background: #eff6ff; color: var(--primary); }
    .action-logout { background: var(--purple-50, #f5f3ff); color: #7c3aed; }
    .action-approve { background: #ecfdf5; color: var(--success); }
    .action-reject { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .action-view { background: var(--surface-ice); color: var(--text-muted); }
    .activity-module {
      font-size: var(--font-size-xs); font-weight: 600; background: var(--surface-ice); color: var(--text-muted);
      padding: 2px 6px; border-radius: var(--radius-xs);
    }
    .activity-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 4px 0 0; line-height: 1.4; }
    .activity-time { font-size: var(--font-size-xs); color: var(--text-muted); }
    .empty-state { text-align: center; color: var(--text-muted); padding: 32px; }
    .loading-indicator { text-align: center; padding: 16px; color: var(--text-muted); font-size: var(--font-size-sm); }
    .activity-load-more { text-align: center; padding: 8px; }

    @media (max-width: 900px) { .org-cards { grid-template-columns: repeat(2, 1fr); } .roles-grid { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .org-cards { grid-template-columns: 1fr; } .field-row { grid-template-columns: 1fr; } }
  `],
})
export class TeamComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  activeTab = 0;
  tenant: Record<string, unknown> | null = null;
  members: TeamMember[] = [];
  roles: RoleDefinition[] = [];
  showRoleDialog = false;
  editingMember: TeamMember | null = null;
  newRole = '';
  roleOptions: { label: string; value: string }[] = [];

  // Activities
  activities: UserActivity[] = [];
  activitiesTotal = 0;
  activitiesLoading = false;
  activityUserFilter: string | null = null;
  memberFilterOptions: { label: string; value: string | null }[] = [];

  // Member activity dialog
  showMemberActivityDialog = false;
  memberActivityName = '';
  memberActivities: UserActivity[] = [];

  private api = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private grcAuth: GrcAuthService,
    public i18n: I18nService, private operationsSvc: GrcOperationsService
  ) {}

  get canManageUsers(): boolean {
    return this.grcAuth.hasPermission('foundation.user.write');
  }

  get canManageTenant(): boolean {
    return this.grcAuth.hasPermission('tenant:manage');
  }

  ngOnInit(): void {
    this.loadTenant();
    this.loadMembers();
    this.loadRoles();
    this.loadActivities();
  }

  loadTenant(): void {
    this.operationsSvc.getTenantProfile().subscribe({
      next: (t: Record<string, unknown>) => { this.tenant = t; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadMembers(): void {
    import('rxjs').then(({ forkJoin, of, catchError }) => {
      forkJoin({
        members: this.operationsSvc.getTeamMembers().pipe(catchError(() => of({ members: [] }))),
        teams: this.operationsSvc.getTeams().pipe(catchError(() => of({ teams: [] }))),
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ members, teams }: Record<string, unknown>) => {
          const memberList = members?.members || [];
          const seen = new Set<string>();
          const merged: TeamMember[] = [];
          for (const m of memberList) {
            const id = m.user_id || m.userId;
            if (id && !seen.has(id)) {
              seen.add(id);
              merged.push({
                user_id: id,
                email: m.email || m.memberEmail || '',
                name: m.name || m.full_name || m.memberName || m.email || id,
                role: m.role || m.teamRole || m.dashboard_role || 'user',
                language: m.language || 'en',
                dashboard_role: m.dashboard_role || m.teamRole || 'user',
                onboarding_complete: m.onboarding_complete ?? false,
                created_at: m.created_at || m.joinedAt || '',
              });
            }
          }

          this.members = merged;
          this.memberFilterOptions = [
            { label: this.i18n.translate('team.allMembers'), value: null as unknown },
            ...merged.map(m => ({ label: m.name, value: m.user_id }))
          ];

          // Enrich with team names
          const teamArr = teams?.teams ?? (Array.isArray(teams) ? teams : []);
          for (const team of teamArr) {
            const teamName = team.nameEn || team.name_en || team.name || '';
            if (team.members && Array.isArray(team.members)) {
              for (const tm of team.members) {
                const member = this.members.find(u => u.user_id === (tm.userId || tm.user_id));
                if (member) {
                  if (!member.teamNames) member.teamNames = [];
                  member.teamNames.push(teamName);
                }
              }
            }
          }
        },
        error: () => { this.members = []; }
      });
    });
  }

  loadRoles(): void {
    this.operationsSvc.getRoles().subscribe({
      next: (r: Record<string, unknown>) => {
        this.roles = r.roles || [];
        this.roleOptions = this.roles.map(role => ({
          label: this.i18n.localize(role.name_en, role.name_ar),
          value: role.role_id,
        }));
      },
      error: () => {
        // Fallback: re-try via the foundation roles endpoint which normalises
        // the response shape. Only use an empty list on persistent failure so
        // the dropdown does not silently offer stale hardcoded values.
        this.operationsSvc.getFoundationRoles?.().subscribe({
          next: (fr: { roles?: unknown[] }) => {
            this.roles = fr.roles ?? [];
            this.roleOptions = this.roles.map(role => ({
              label: this.i18n.localize((role as { name_en?: string }).name_en, (role as { name_ar?: string }).name_ar),
              value: (role as { role_id?: string; id?: string }).role_id ?? (role as { role_id?: string; id?: string }).id,
            }));
          },
          error: () => { this.roleOptions = []; },
        });
      }
    });
  }

  loadActivities(): void {
    this.activitiesLoading = true;
    this.operationsSvc.getActivities({ user_id: this.activityUserFilter || undefined, limit: 50, offset: 0 }).subscribe({
      next: (r: Record<string, unknown>) => {
        this.activities = r.activities || [];
        this.activitiesTotal = r.total || 0;
        this.activitiesLoading = false;
      },
      error: () => { this.activities = []; this.activitiesLoading = false; }
    });
  }

  loadMoreActivities(): void {
    this.activitiesLoading = true;
    this.operationsSvc.getActivities({ user_id: this.activityUserFilter || undefined, limit: 50, offset: this.activities.length }).subscribe({
      next: (r: Record<string, unknown>) => {
        this.activities = [...this.activities, ...(r.activities || [])];
        this.activitiesTotal = r.total || 0;
        this.activitiesLoading = false;
      },
      error: () => { this.activitiesLoading = false; }
    });
  }

  saveTenantSettings(): void {
    if (!this.tenant) return;
    this.http.put(`${this.api}/profiles/tenant`, {
      org_name: this.tenant.org_name,
      logo_url: this.tenant.logo_url,
      primary_color: this.tenant.primary_color,
      custom_domain: this.tenant.custom_domain,
    }).subscribe(() => this.loadTenant());
  }

  openRoleDialog(m: TeamMember): void {
    this.editingMember = m;
    this.newRole = m.role;
    this.showRoleDialog = true;
  }

  changeRole(): void {
    if (!this.editingMember || !this.newRole) return;
    this.apiclientSvc.put(`/profiles/tenant/users/${this.editingMember.user_id}/role`, { role: this.newRole }).subscribe(() => {
      this.showRoleDialog = false;
      this.loadMembers();
    });
  }

  viewMemberActivity(m: TeamMember): void {
    this.memberActivityName = m.name;
    this.showMemberActivityDialog = true;
    this.operationsSvc.getActivities({ user_id: m.user_id, limit: 30 }).subscribe({
      next: (r: Record<string, unknown>) => { this.memberActivities = r.activities || []; },
      error: () => { this.memberActivities = []; }
    });
  }

  getRoleDisplayName(roleId: string): string {
    const role = this.roles.find(r => r.role_id === roleId);
    if (!role) return roleId;
    return this.i18n.localize(role.name_en, role.name_ar);
  }

  getSelectedRoleInfo(): RoleDefinition | null {
    return this.roles.find(r => r.role_id === this.newRole) || null;
  }

  canRoleApprove(roleId: string): boolean {
    const role = this.roles.find(r => r.role_id === roleId);
    return role?.can_approve ?? false;
  }

  getMembersForRole(roleId: string): TeamMember[] {
    return this.members.filter(m => m.role === roleId);
  }

  getMemberNamesPreview(roleId: string): string {
    const members = this.getMembersForRole(roleId);
    const names = members.slice(0, 3).map(m => m.name).join(', ');
    return members.length > 3 ? names + '...' : names;
  }

  getActivityIcon(action: string): string {
    const map: Record<string, string> = {
      create: 'pi-plus-circle', update: 'pi-pencil', delete: 'pi-trash',
      login: 'pi-sign-in', logout: 'pi-sign-out', approve: 'pi-check-circle',
      reject: 'pi-times-circle', view: 'pi-eye', export: 'pi-download',
    };
    return map[action] || 'pi-circle';
  }

  getRoleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    const map: Record<string, unknown> = {
      owner: 'danger', admin: 'warning', compliance_officer: 'info',
      risk_manager: 'info', auditor: 'success', viewer: undefined
    };
    return map[role];
  }

}
