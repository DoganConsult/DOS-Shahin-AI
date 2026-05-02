import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/dauth/session/session.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { FoundationPageShellStubComponent as PageShellComponent } from '../shared/foundation-shared-components';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { InputTextarea } from 'primeng/textarea';
import { SidebarModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { devError } from '../../core/utils/dev-logger';

import { Team, RoleProfile, RACI_ROLES, SCOPE_TYPES, INVITE_ROLE_OPTIONS, TEAM_ROLE_OPTIONS } from './models/team.models';
import { TeamDataService } from './services/team-data.service';
import { TeamListTabComponent } from './components/team-list-tab.component';
import { RaciMatrixTabComponent } from './components/raci-matrix-tab.component';
import { RoleStaffingTabComponent } from '../../features/team/pages/team-management/components/role-staffing-tab.component';
import { WorkloadTabComponent } from './components/workload-tab.component';
import { MembersTabComponent } from './components/members-tab.component';
import { InvitationsTabComponent } from './components/invitations-tab.component';
import { GrcRecord } from '../shared/foundation-types';

@Component({
  selector: 'app-team-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, PageShellComponent, AppDatePipe,
    CardModule, TagModule, ButtonModule, DialogModule, InputTextModule, TabViewModule,
    TooltipModule, DropdownModule, InputTextarea, SidebarModule, ToastModule,
    ConfirmDialogModule, TableModule,
    TeamListTabComponent, RaciMatrixTabComponent, RoleStaffingTabComponent,
    WorkloadTabComponent, MembersTabComponent, InvitationsTabComponent,
  ],
  providers: [MessageService, ConfirmationService, TeamDataService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <app-page-shell icon="users"
      [title]="i18n.translate('teamManagement.teamCommandCenterAgrcos')"
      [subtitle]="i18n.translate('teamManagement.manageTeamsMembersWorkloadDistributionRa')"
      [breadcrumbs]="['Dashboard', 'Team Management']" [loading]="loading()">

      <!-- Executive Summary Strip -->
      <div class="exec-strip">
        @for (s of summaryCards(); track s.key) {
          <div class="exec-card" [class]="'exec-' + s.key">
            <div class="exec-icon"><i class="pi" [ngClass]="'pi-' + s.icon"></i></div>
            <div class="exec-body">
              <div class="exec-value">{{ s.value }}</div>
              <div class="exec-label">{{ i18n.localize(s.label, s.labelAr) }}</div>
            </div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <p-tabView styleClass="team-tabs" [(activeIndex)]="activeTabIndex">
        <!-- Tab 1: Teams Directory -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span>{{ i18n.translate('teamManagement.teams') }}</span>
            <span class="tab-count">({{ teams().length }})</span>
          </ng-template>
          <app-team-list-tab
            [teams]="teams()" [loading]="loading()" [expandedTeamId]="expandedTeam()"
            [raciData]="raciData()" [canManage]="canManage()"
            (createTeam)="openCreateTeam()" (refresh)="reload()" (selectTeam)="selectTeam($event)"
            (editTeam)="openEditTeam($event)" (deleteTeam)="deleteTeam($event)"
            (addMember)="openAddMember($event)" (inviteMember)="openInviteDialog($event)"
            (removeMember)="removeMemberFromTeam($event.team, $event.member)"
            (changeMemberRole)="openChangeMemberRole($event.team, $event.member)"
            (assignRaci)="openAssignRaci($event)" (linkWorkflow)="openLinkWorkflow($event)"
            (linkControlGroup)="openLinkControlGroup($event)" (viewWorkload)="loadWorkload($event)" />
        </p-tabPanel>

        <!-- Tab 2: RACI Pivot Matrix -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span>{{ i18n.translate('teamManagement.raciMatrix') }}</span>
            <span class="tab-count">({{ allRaciEntries().length }})</span>
          </ng-template>
          <app-raci-matrix-tab
            [teams]="teams()" [allRaciEntries]="allRaciEntries()" [loading]="loading()"
            [loadingSuggestions]="loadingSuggestions()" [canManage]="canManage()"
            (assignRaci)="openPivotAssignRaci()" (loadSuggestions)="loadRaciSuggestions()"
            (exportCsv)="exportRaciCsv()" (pivotCellEdit)="openPivotCellEdit($event.row, $event.team)"
            (deletePivotRow)="deletePivotRow($event)" />
        </p-tabPanel>

        <!-- Tab 3: GRC Roles -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span>{{ i18n.translate('teamManagement.grcRoles') }}</span>
            <span class="tab-count">({{ roleStaffing().length }})</span>
          </ng-template>
          <app-role-staffing-tab
            [roleStaffing]="roleStaffing()" [staffingSummary]="roleStaffingSummary()"
            [staffingLoading]="roleStaffingLoading()" [roleProfiles]="roleProfiles()"
            [allMembers]="allMembers()" [teams]="teams()" [canManage]="canManage()"
            (filterChange)="onStaffingFilterChange($event.range, $event.sector)"
            (exportCsv)="exportStaffingCsv()" (activateRole)="openActivateRole($event)"
            (openRoleDrawer)="openRoleDrawer($event)" />
        </p-tabPanel>

        <!-- Tab 4: Workload -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span>{{ i18n.translate('teamManagement.workload') }}</span>
          </ng-template>
          <app-workload-tab
            [workloadData]="workloadData()" [selectedTeamId]="selectedWorkloadTeamId()"
            [teamDropdownOptions]="teamDropdownOptions()" [allMembers]="allMembers()"
            (teamSelected)="onWorkloadTeamChange($event)" />
        </p-tabPanel>

        <!-- Tab 5: Members Directory -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span>{{ i18n.translate('teamManagement.members2') }}</span>
            <span class="tab-count">({{ allMembers().length }})</span>
          </ng-template>
          <app-members-tab [allMembers]="allMembers()"
            (openDrawer)="openMemberDrawer($event)" (exportCsv)="exportMembersCsv()" />
        </p-tabPanel>

        <!-- Tab 6: Invitations -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span>{{ i18n.translate('teamManagement.invitations') }}</span>
            <span class="tab-count">({{ invitations().length }})</span>
          </ng-template>
          <app-invitations-tab [invitations]="invitations()" [invitationsLoading]="invitationsLoading()"
            [teamFilterOptions]="invTeamFilterOptions()"
            (resend)="resendInvitation($event)" (revoke)="revokeInvitation($event)" />
        </p-tabPanel>
      </p-tabView>

      <!-- Member Detail Drawer -->
      <p-sidebar [(visible)]="drawerVisible" position="right" [style]="{width:'440px'}" [modal]="true">
        @if (drawerMember) {
          <ng-template pTemplate="header">
            <div class="drawer-header">
              <span class="drawer-avatar" [style.background]="memberColor(drawerMember)">{{ memberInitial(drawerMember) }}</span>
              <div>
                <h3 class="drawer-name">{{ drawerMember.name || drawerMember.email || '—' }}</h3>
                <span class="drawer-email">{{ drawerMember.email || '' }}</span>
              </div>
            </div>
          </ng-template>
          <div class="drawer-body">
            <div class="drawer-section"><h4>{{ i18n.translate('teamManagement.role') }}</h4><p-tag [value]="drawerMember.role || 'member'" [severity]="roleSeverity(drawerMember.role)" /></div>
            <div class="drawer-section" *ngIf="drawerLifecycle()">
              <h4>{{ i18n.translate('teamManagement.lifecycle') }}</h4>
              <div class="flex gap-2 align-items-center flex-wrap">
                <p-tag [value]="drawerLifecycleLabel()" [severity]="drawerLifecycleSeverity()" [rounded]="true" />
                <p-tag [value]="drawerModeLabel()" [severity]="drawerModeSeverity()" [rounded]="true" />
                <span *ngIf="drawerLifecycle().profileCount" class="text-sm"><i class="pi pi-id-card mr-1"></i>{{ drawerLifecycle().profileCount }} {{ i18n.translate('teamManagement.profiles') }}</span>
                <span *ngIf="drawerLifecycle().shadowCount" class="text-sm text-primary"><i class="pi pi-android mr-1"></i>{{ i18n.translate('teamManagement.agentActive') }}</span>
              </div>
              <a class="text-primary text-sm mt-2 cursor-pointer" style="text-decoration:underline" (click)="drawerVisible = false; navigateToLifecycle()">{{ i18n.translate('teamManagement.viewFullLifecycle') }}</a>
            </div>
            <div class="drawer-section"><h4>{{ i18n.translate('teamManagement.teams') }}</h4><div class="drawer-tags">@for (t of memberTeams(drawerMember); track t) { <p-tag [value]="t" severity="info" /> } @if (!memberTeams(drawerMember).length) { <span class="text-color-secondary">{{ i18n.translate('teamManagement.notAssignedToAnyTeam') }}</span> }</div></div>
            <div class="drawer-section"><h4>{{ i18n.translate('teamManagement.tasksPerformance') }}</h4><div class="drawer-stat-row"><div class="drawer-stat"><span class="ds-value">{{ drawerMember.task_count || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.totalTasks') }}</span></div><div class="drawer-stat" *ngIf="drawerMemberPerf()"><span class="ds-value">{{ drawerMemberPerf()!.openTasks || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.open') }}</span></div><div class="drawer-stat" *ngIf="drawerMemberPerf()"><span class="ds-value">{{ drawerMemberPerf()!.completedTasks || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.completed') }}</span></div><div class="drawer-stat" *ngIf="drawerMemberPerf()"><span class="ds-value" [class]="(drawerMemberPerf()!.overdueTasks || 0) > 0 ? 'text-red-500' : ''">{{ drawerMemberPerf()!.overdueTasks || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.overdue') }}</span></div></div></div>
            <div class="drawer-section" *ngIf="drawerMemberPerf()"><h4>{{ i18n.translate('teamManagement.efficiencyMetrics') }}</h4><div class="drawer-stat-row"><div class="drawer-stat"><span class="ds-value">{{ drawerMemberPerf()!.completionRate || 0 }}%</span><span class="ds-label">{{ i18n.translate('teamManagement.completion') }}</span></div><div class="drawer-stat"><span class="ds-value">{{ drawerMemberPerf()!.onTimeRate || 0 }}%</span><span class="ds-label">{{ i18n.translate('teamManagement.ontime') }}</span></div><div class="drawer-stat"><span class="ds-value" [class]="(drawerMemberPerf()!.efficiencyScore || 0) >= 70 ? 'text-green-500' : (drawerMemberPerf()!.efficiencyScore || 0) >= 40 ? 'text-yellow-500' : 'text-red-500'">{{ drawerMemberPerf()!.efficiencyScore || 0 }}%</span><span class="ds-label">{{ i18n.translate('teamManagement.efficiency') }}</span></div></div></div>
            <div class="drawer-section" *ngIf="drawerMemberPerf()"><h4>{{ i18n.translate('teamManagement.evidenceControls') }}</h4><div class="drawer-stat-row"><div class="drawer-stat"><span class="ds-value">{{ drawerMemberPerf()!.controlsOwned || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.controls') }}</span></div><div class="drawer-stat"><span class="ds-value">{{ drawerMemberPerf()!.evidencePending || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.evidencePending') }}</span></div><div class="drawer-stat"><span class="ds-value">{{ drawerMemberPerf()!.evidenceCompleted || 0 }}</span><span class="ds-label">{{ i18n.translate('teamManagement.evidenceDone') }}</span></div></div></div>
          </div>
        }
      </p-sidebar>

      <!-- Role Detail Drawer -->
      <p-sidebar [(visible)]="roleDrawerVisible" position="right" [style]="{width:'480px'}" [modal]="true">
        @if (drawerRole) {
          <ng-template pTemplate="header"><div class="drawer-header"><div class="rc-icon" [style.background]="roleColor(drawerRole.role)"><i class="pi pi-id-card"></i></div><div><h3 class="drawer-name">{{ i18n.localize(drawerRole.label_en || drawerRole.role, drawerRole.label_ar || drawerRole.role) }}</h3><span class="drawer-email">{{ drawerRole.role }}</span></div></div></ng-template>
          <div class="drawer-body">
            @if (drawerRole.description_en || drawerRole.description_ar) { <div class="drawer-section"><h4>{{ i18n.translate('teamManagement.description') }}</h4><p class="text-sm">{{ i18n.localize(drawerRole.description_en || '', drawerRole.description_ar || drawerRole.description_en || '') }}</p></div> }
            <div class="drawer-section"><h4>{{ i18n.translate('teamManagement.permissions') }} ({{ (drawerRole.permissions || []).length }})</h4><div class="drawer-tags">@for (p of (drawerRole.permissions || []); track p) { <p-tag [value]="p" severity="secondary" /> }</div></div>
            <div class="drawer-section"><h4>{{ i18n.translate('teamManagement.statistics') }}</h4><div class="drawer-stat-row"><div class="drawer-stat"><span class="ds-value">{{ countUsersWithRole(drawerRole.role) }}</span><span class="ds-label">{{ i18n.translate('teamManagement.users') }}</span></div><div class="drawer-stat"><span class="ds-value">{{ countTeamsWithRole(drawerRole.role) }}</span><span class="ds-label">{{ i18n.translate('teamManagement.teams') }}</span></div></div></div>
          </div>
        }
      </p-sidebar>

      <!-- ===== Dialogs ===== -->
      <!-- Create Team -->
      <p-dialog [header]="i18n.translate('teamManagement.createNewTeam')" [(visible)]="showCreateDialog" [modal]="true" [style]="{width: '520px'}" [dismissableMask]="true">
        <div class="dialog-form"><div class="df-row"><label>{{ i18n.translate('teamManagement.teamNameEn') }}</label><input pInputText [(ngModel)]="newTeam.nameEn" [placeholder]="i18n.translate('teamManagement.egComplianceTeam')" [attr.aria-label]="i18n.translate('teamManagement.egComplianceTeam')" class="w-full" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.teamNameAr') }}</label><input pInputText [(ngModel)]="newTeam.nameAr" placeholder="\u0641\u0631\u064A\u0642 \u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644" aria-label="\u0641\u0631\u064A\u0642 \u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644" class="w-full" dir="rtl" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.description') }}</label><textarea pInputTextarea [(ngModel)]="newTeam.description" rows="3" class="w-full" [placeholder]="i18n.translate('teamManagement.briefDescriptionOfTeamResponsibilities')" [attr.aria-label]="i18n.translate('teamManagement.briefDescriptionOfTeamResponsibilities')"></textarea></div><div class="df-row"><label>{{ i18n.translate('teamManagement.teamLead') }}</label><p-dropdown [(ngModel)]="newTeam.teamLead" [options]="memberPickerOptions()" optionLabel="label" optionValue="value" [filter]="true" filterBy="label" [placeholder]="i18n.translate('teamManagement.searchSelectLead')" styleClass="w-full" [showClear]="true" /></div></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showCreateDialog = false" /><p-button [label]="i18n.translate('teamManagement.create')" icon="pi pi-check" [loading]="creating()" [disabled]="!newTeam.nameEn.trim()" (onClick)="createTeam()" /></ng-template>
      </p-dialog>

      <!-- Edit Team -->
      <p-dialog [header]="i18n.translate('teamManagement.editTeam')" [(visible)]="showEditDialog" [modal]="true" [style]="{width: '520px'}" [dismissableMask]="true">
        <div class="dialog-form"><div class="df-row"><label>{{ i18n.translate('teamManagement.teamNameEn') }}</label><input pInputText [(ngModel)]="editTeamForm.nameEn" class="w-full" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.teamNameAr') }}</label><input pInputText [(ngModel)]="editTeamForm.nameAr" class="w-full" dir="rtl" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.description') }}</label><textarea pInputTextarea [(ngModel)]="editTeamForm.description" rows="3" class="w-full"></textarea></div></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showEditDialog = false" /><p-button [label]="i18n.translate('teamManagement.save')" icon="pi pi-check" [loading]="editing()" [disabled]="!editTeamForm.nameEn.trim()" (onClick)="saveEditTeam()" /></ng-template>
      </p-dialog>

      <!-- Add Member -->
      <p-dialog [header]="i18n.translate('teamManagement.addTeamMember')" [(visible)]="showMemberDialog" [modal]="true" [style]="{width: '440px'}" [dismissableMask]="true">
        <div class="dialog-form"><div class="df-row"><label>{{ i18n.translate('teamManagement.selectMember') }}</label><p-dropdown [(ngModel)]="newMember.userId" [options]="memberPickerOptions()" optionLabel="label" optionValue="value" [filter]="true" filterBy="label" [placeholder]="i18n.translate('teamManagement.searchSelectMember')" styleClass="w-full" [showClear]="true" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.teamRole') }}</label><p-dropdown [(ngModel)]="newMember.role" [options]="teamRoleOptions" optionLabel="label" optionValue="value" [placeholder]="i18n.translate('teamManagement.selectRole')" styleClass="w-full" /></div></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showMemberDialog = false" /><p-button [label]="i18n.translate('teamManagement.add')" icon="pi pi-user-plus" [loading]="addingMember()" [disabled]="!newMember.userId" (onClick)="addMember()" /></ng-template>
      </p-dialog>

      <!-- Invite Member -->
      <p-dialog [header]="i18n.translate('teamManagement.inviteTeamMember')" [(visible)]="showInviteDialog" [modal]="true" [style]="{width: '480px'}" [dismissableMask]="true">
        <div class="dialog-form"><div class="df-row"><label>{{ i18n.translate('teamManagement.inviteeName') }}</label><input pInputText [(ngModel)]="inviteForm.name" [placeholder]="i18n.translate('teamManagement.nameOptional')" [attr.aria-label]="i18n.translate('teamManagement.nameOptional')" class="w-full" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.emailAddress') }}</label><input pInputText [(ngModel)]="inviteForm.email" type="email" [placeholder]="i18n.translate('teamManagement.examplecompanycom')" [attr.aria-label]="i18n.translate('teamManagement.examplecompanycom')" class="w-full" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.role') }}</label><p-dropdown [(ngModel)]="inviteForm.role" [options]="inviteRoleOptions" optionLabel="label" optionValue="value" [placeholder]="i18n.translate('teamManagement.selectRole')" styleClass="w-full" [filter]="true" filterPlaceholder="Search..." /></div><p class="text-xs text-color-secondary mt-2">{{ i18n.translate('teamManagement.anInvitationLinkWillBeSentToTheSpecified') }}</p></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showInviteDialog = false" /><p-button [label]="i18n.translate('teamManagement.sendInvitation')" icon="pi pi-send" [loading]="sendingInvite()" [disabled]="!inviteForm.email.trim()" (onClick)="sendInvitation()" /></ng-template>
      </p-dialog>

      <!-- Link Workflow -->
      <p-dialog [header]="i18n.translate('teamManagement.linkWorkflow')" [(visible)]="showLinkDialog" [modal]="true" [style]="{width: '420px'}" [dismissableMask]="true">
        <div class="dialog-form"><p class="text-sm text-color-secondary mb-3">{{ i18n.translate('teamManagement.enterWorkflowTemplateCodeOrInstanceId') }}</p><input pInputText [(ngModel)]="linkWorkflowId" class="w-full" [placeholder]="i18n.translate('teamManagement.egPolicylifecycle')" [attr.aria-label]="i18n.translate('teamManagement.egPolicylifecycle')" /></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showLinkDialog = false" /><p-button [label]="i18n.translate('teamManagement.link')" icon="pi pi-link" [loading]="linking()" [disabled]="!linkWorkflowId.trim()" (onClick)="doLinkWorkflow()" /></ng-template>
      </p-dialog>

      <!-- Assign RACI -->
      <p-dialog [header]="i18n.translate('teamManagement.assignRaciRole')" [(visible)]="showRaciDialog" [modal]="true" [style]="{width: '520px'}" [dismissableMask]="true">
        <div class="dialog-form">
          <div class="df-row"><label class="font-semibold">{{ i18n.translate('teamManagement.scopeType') }}</label><div class="raci-type-grid">@for (st of scopeTypes; track st) { <button class="raci-type-btn" [class.active]="raciForm.scopeType === st" (click)="onRaciScopeTypeChange(st)"><i class="pi" [ngClass]="'pi-' + scopeIcon(st)"></i><span>{{ st | titlecase }}</span></button> }</div></div>
          <div class="df-row"><label class="font-semibold">{{ i18n.translate('teamManagement.scopeId') }}</label><p-dropdown [(ngModel)]="raciForm.scopeId" [options]="raciScopeItems()" optionLabel="label" optionValue="value" [filter]="true" filterBy="label" [placeholder]="i18n.translate('teamManagement.selectScope')" styleClass="w-full" [showClear]="true" [editable]="true" /></div>
          <div class="df-row"><label class="font-semibold">{{ i18n.translate('teamManagement.raciRole') }}</label><div class="raci-role-grid">@for (rr of raciRoles; track rr) { <button class="raci-role-btn" [class.active]="raciForm.raciRole === rr" [class]="'rrb-' + rr + (raciForm.raciRole === rr ? ' active' : '')" (click)="raciForm.raciRole = rr"><span class="rrb-letter">{{ rr.charAt(0).toUpperCase() }}</span><span class="rrb-label">{{ rr.charAt(0).toUpperCase() + rr.slice(1) }}</span></button> }</div></div>
          <div class="df-row"><label>{{ i18n.translate('teamManagement.notesOptional') }}</label><input pInputText [(ngModel)]="raciForm.notes" class="w-full" placeholder="Optional notes" aria-label="Optional notes" /></div>
        </div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showRaciDialog = false" /><p-button [label]="i18n.translate('teamManagement.assign')" icon="pi pi-check" [loading]="assigningRaci()" [disabled]="!raciForm.scopeType || !raciForm.scopeId.trim() || !raciForm.raciRole" (onClick)="assignRaci()" /></ng-template>
      </p-dialog>

      <!-- RACI Suggestions -->
      <p-dialog [header]="i18n.translate('teamManagement.raciSuggestionsFromTemplates')" [(visible)]="showSuggestionsDialog" [modal]="true" [style]="{width: '720px'}" [dismissableMask]="true">
        <p class="text-sm text-color-secondary mb-3">{{ i18n.translate('teamManagement.theseSuggestionsAreDerivedFromControldom') }}</p>
        <p-table aria-label="Data table" [value]="raciSuggestions()" [paginator]="raciSuggestions().length > 15" [rows]="15" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true" [(selection)]="selectedSuggestions" dataKey="controlDomain">
          <ng-template pTemplate="header"><tr><th style="width:3rem"><p-tableHeaderCheckbox /></th><th>{{ i18n.translate('teamManagement.teamFunction') }}</th><th>{{ i18n.translate('teamManagement.controlDomain') }}</th><th>{{ i18n.translate('teamManagement.framework') }}</th><th>{{ i18n.translate('teamManagement.suggestedRole') }}</th><th>{{ i18n.translate('teamManagement.matchedTeam') }}</th></tr></ng-template>
          <ng-template pTemplate="body" let-s><tr><td><p-tableCheckbox [value]="s" /></td><td class="font-semibold">{{ s.teamFunctionCode }}</td><td>{{ s.controlDomain }}</td><td><p-tag [value]="s.framework" severity="info" /></td><td><p-tag [value]="s.suggestedRaciRole" [severity]="raciSuggestSeverity(s.suggestedRaciRole)" /></td><td>@if (s.matchedTeamName) { <span class="text-green-600 font-semibold">{{ s.matchedTeamName }}</span> } @else { <span class="text-color-secondary">{{ i18n.translate('teamManagement.noMatch') }}</span> }</td></tr></ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center text-color-secondary p-4">{{ i18n.translate('teamManagement.noSuggestionsAvailable') }}</td></tr></ng-template>
        </p-table>
        <ng-template pTemplate="footer"><span class="text-sm text-color-secondary mr-3">{{ selectedSuggestions.length }} {{ i18n.translate('teamManagement.selected') }}</span><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showSuggestionsDialog = false" /><p-button [label]="i18n.translate('teamManagement.applySelected')" icon="pi pi-check" severity="primary" [loading]="applyingSuggestions()" [disabled]="selectedSuggestions.length === 0" (onClick)="applyRaciSuggestions()" /></ng-template>
      </p-dialog>

      <!-- Pivot Cell Edit -->
      <p-dialog [header]="i18n.translate('teamManagement.editRaciRole')" [(visible)]="showPivotEditDialog" [modal]="true" [style]="{width:'400px'}" [dismissableMask]="true">
        <div class="dialog-form">
          <div class="df-row"><label>{{ i18n.translate('teamManagement.scope') }}</label><span class="font-semibold">{{ pivotEditContext.scopeType }} / {{ pivotEditContext.scopeId }}</span></div>
          <div class="df-row"><label>{{ i18n.translate('teamManagement.team') }}</label><span class="font-semibold">{{ pivotEditContext.teamName }}</span></div>
          <div class="df-row"><label class="font-semibold">{{ i18n.translate('teamManagement.raciRole') }}</label><div class="raci-role-grid">@for (rr of raciRoles; track rr) { <button class="raci-role-btn" [class.active]="pivotEditContext.raciRole === rr" [class]="'rrb-' + rr + (pivotEditContext.raciRole === rr ? ' active' : '')" (click)="pivotEditContext.raciRole = rr"><span class="rrb-letter">{{ rr.charAt(0).toUpperCase() }}</span><span class="rrb-label">{{ rr.charAt(0).toUpperCase() + rr.slice(1) }}</span></button> }<button class="raci-role-btn" [class.active]="pivotEditContext.raciRole === ''" (click)="pivotEditContext.raciRole = ''"><span class="rrb-letter" style="background:var(--error)">&#x2715;</span><span class="rrb-label">{{ i18n.translate('teamManagement.remove') }}</span></button></div></div>
        </div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showPivotEditDialog = false" /><p-button [label]="i18n.translate('teamManagement.save')" icon="pi pi-check" (onClick)="savePivotCell()" /></ng-template>
      </p-dialog>

      <!-- Activate Role -->
      <p-dialog [header]="i18n.translate('teamManagement.activateRoleSendInvitation')" [(visible)]="showRoleActivateDialog" [modal]="true" [style]="{width: '540px'}" [dismissableMask]="true">
        <div class="dialog-form"><div class="df-row"><label class="font-semibold">{{ i18n.translate('teamManagement.role') }}</label><span class="font-semibold" style="color:var(--primary-color)">{{ activateForm.roleName }}</span></div><div class="df-row"><label>{{ i18n.translate('teamManagement.employeeName') }}</label><input pInputText [(ngModel)]="activateForm.name" class="w-full" [placeholder]="i18n.translate('teamManagement.fullName')" [attr.aria-label]="i18n.translate('teamManagement.fullName')" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.email') }}</label><input pInputText [(ngModel)]="activateForm.email" class="w-full" type="email" [placeholder]="i18n.translate('teamManagement.employeecompanycom')" [attr.aria-label]="i18n.translate('teamManagement.employeecompanycom')" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.organizationTitle') }}</label><input pInputText [(ngModel)]="activateForm.orgTitle" class="w-full" [placeholder]="i18n.translate('teamManagement.egSeniorRiskAnalyst')" [attr.aria-label]="i18n.translate('teamManagement.egSeniorRiskAnalyst')" /></div><div class="df-row"><label>{{ i18n.translate('teamManagement.shahinaiTitle') }}</label><input pInputText [(ngModel)]="activateForm.shahinTitle" class="w-full" [placeholder]="i18n.translate('teamManagement.platformRoleTitle')" [attr.aria-label]="i18n.translate('teamManagement.platformRoleTitle')" /></div></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showRoleActivateDialog = false" /><p-button [label]="i18n.translate('teamManagement.sendInvitation')" icon="pi pi-send" severity="success" [loading]="activateSending()" [disabled]="!activateForm.email || !activateForm.name" (onClick)="sendActivation()" /></ng-template>
      </p-dialog>

      <!-- Change Member Role -->
      <p-dialog [header]="i18n.translate('teamManagement.changeMemberRole')" [(visible)]="showChangeRoleDialog" [modal]="true" [style]="{width: '420px'}" [dismissableMask]="true">
        <div class="dialog-form"><div class="df-row"><label>{{ i18n.translate('teamManagement.member') }}</label><span class="font-semibold">{{ changeRoleForm.memberName }}</span></div><div class="df-row"><label>{{ i18n.translate('teamManagement.newRole') }}</label><p-dropdown [(ngModel)]="changeRoleForm.newRole" [options]="teamRoleOptions" optionLabel="label" optionValue="value" [placeholder]="i18n.translate('teamManagement.selectRole')" styleClass="w-full" /></div></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showChangeRoleDialog = false" /><p-button [label]="i18n.translate('teamManagement.save')" icon="pi pi-check" [loading]="changingRole()" [disabled]="!changeRoleForm.newRole" (onClick)="changeMemberRole()" /></ng-template>
      </p-dialog>

      <!-- Link Control Group -->
      <p-dialog [header]="i18n.translate('teamManagement.linkControlGroup')" [(visible)]="showLinkControlGroupDialog" [modal]="true" [style]="{width: '420px'}" [dismissableMask]="true">
        <div class="dialog-form"><p class="text-sm text-color-secondary mb-3">{{ i18n.translate('teamManagement.enterTheControlGroupIdToLinkToThisTeam') }}</p><input pInputText [(ngModel)]="linkControlGroupId" class="w-full" [placeholder]="i18n.translate('teamManagement.egCg001')" [attr.aria-label]="i18n.translate('teamManagement.egCg001')" /></div>
        <ng-template pTemplate="footer"><p-button [label]="i18n.translate('teamManagement.cancel')" severity="secondary" (onClick)="showLinkControlGroupDialog = false" /><p-button [label]="i18n.translate('teamManagement.link')" icon="pi pi-shield" [loading]="linkingControlGroup()" [disabled]="!linkControlGroupId.trim()" (onClick)="doLinkControlGroup()" /></ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .exec-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .exec-card { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: var(--radius-lg); background: var(--surface-card); border: 1px solid var(--surface-border); transition: transform 0.15s, box-shadow 0.15s; }
    .exec-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .exec-icon { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: white; flex-shrink: 0; }
    .exec-teams .exec-icon { background: linear-gradient(135deg, var(--primary), #1d4ed8); }
    .exec-members .exec-icon { background: linear-gradient(135deg, #10b981, var(--success)); }
    .exec-raci .exec-icon { background: linear-gradient(135deg, var(--warning), var(--warning)); }
    .exec-roles .exec-icon { background: linear-gradient(135deg, var(--secondary, #8b5cf6), #7c3aed); }
    .exec-workflows .exec-icon { background: linear-gradient(135deg, var(--info), #0891b2); }
    .exec-filled .exec-icon { background: linear-gradient(135deg, #10b981, #059669); }
    .exec-value { font-size: 1.6rem; font-weight: 800; color: var(--text-color); line-height: 1; }
    .exec-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); margin-top: 2px; }
    .tab-count { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-inline-start: 4px; }
    .drawer-header { display: flex; align-items: center; gap: 14px; }
    .drawer-avatar { width: 48px; height: 48px; border-radius: var(--radius-pill); color: white; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-body-lg); font-weight: 800; flex-shrink: 0; }
    .drawer-name { margin: 0; font-size: var(--font-size-body-md); font-weight: 700; }
    .drawer-email { font-size: 0.82rem; color: var(--text-color-secondary); }
    .drawer-body { display: flex; flex-direction: column; gap: 20px; padding-top: 12px; }
    .drawer-section h4 { margin: 0 0 8px; font-size: var(--font-size-body-sm); font-weight: 600; }
    .drawer-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .drawer-stat-row { display: flex; gap: 24px; }
    .drawer-stat { display: flex; flex-direction: column; align-items: center; }
    .ds-value { font-size: 1.6rem; font-weight: 800; color: var(--text-color); }
    .ds-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .rc-icon { width: 44px; height: 44px; border-radius: var(--radius-md); color: white; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-body-lg); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .df-row { display: flex; flex-direction: column; gap: 6px; }
    .df-row label { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-color); }
    .raci-type-grid, .raci-role-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .raci-type-btn, .raci-role-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: var(--radius-md); border: 2px solid var(--surface-border); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-caption); font-weight: 600; transition: all 0.15s; }
    .raci-type-btn:hover, .raci-role-btn:hover { border-color: var(--primary-color); }
    .raci-type-btn.active { border-color: var(--primary-color); background: var(--primary-50); color: var(--primary-700); }
    .raci-type-btn i { font-size: var(--font-size-body-lg); }
    .rrb-letter { width: 30px; height: 30px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-md); font-weight: 800; color: white; }
    .rrb-label { font-size: 0.72rem; }
    .rrb-responsible .rrb-letter { background: var(--success); }
    .rrb-accountable .rrb-letter { background: #2563eb; }
    .rrb-consulted .rrb-letter { background: var(--warning); }
    .rrb-informed .rrb-letter { background: var(--text-muted); }
    .rrb-responsible.active { border-color: var(--success); background: var(--status-success-bg, #defbe6); }
    .rrb-accountable.active { border-color: var(--primary); background: #eff6ff; }
    .rrb-consulted.active { border-color: var(--warning); background: #fef9c3; }
    .rrb-informed.active { border-color: var(--text-muted); background: var(--surface-ice); }
    .text-sm { font-size: 0.82rem; }
    .mr-1 { margin-inline-end: 4px; }
    .cursor-pointer { cursor: pointer; }

    /* team-tabs — migrated from primeng-component-rules.css (Law 2) */
    .team-tabs .p-tabview-nav { border-bottom: 2px solid var(--border); }
    .team-tabs .p-tabview-nav-link { font-weight: 600; font-size: var(--font-size-body-sm); }
  `]
})
export class TeamManagementComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];

  // -- Injected services --
  constructor(
    public i18n: I18nService,
    private data: TeamDataService,
    private auth: SessionService,
    private router: Router,
    private msg: MessageService,
    private confirm: ConfirmationService,
  ) {}

  // -- Signals --
  loading = signal(false);
  creating = signal(false);
  addingMember = signal(false);
  linking = signal(false);
  assigningRaci = signal(false);
  editing = signal(false);
  changingRole = signal(false);
  linkingControlGroup = signal(false);
  sendingInvite = signal(false);
  loadingSuggestions = signal(false);
  applyingSuggestions = signal(false);
  activateSending = signal(false);
  roleStaffingLoading = signal(false);

  teams = signal<Team[]>([]);
  roleProfiles = signal<RoleProfile[]>([]);
  orgMembers = signal<GrcRecord[]>([]);
  expandedTeam = signal<string | null>(null);
  raciData = signal<Record<string, GrcRecord[]>>({});
  raciTotalCount = signal(0);
  workloadData = signal<GrcRecord | null>(null);
  selectedWorkloadTeamId = signal<string | null>(null);
  raciScopeItems = signal<{ label: string; value: string }[]>([]);
  invitations = signal<GrcRecord[]>([]);
  invitationsLoading = signal(false);
  roleStaffing = signal<GrcRecord[]>([]);
  roleStaffingSummary = signal<{ totalFte: number; mandatoryCount: number; count: number; filledCount: number }>({ totalFte: 0, mandatoryCount: 0, count: 0, filledCount: 0 });
  raciSuggestions = signal<GrcRecord[]>([]);
  drawerMemberPerf = signal<GrcRecord | null>(null);
  drawerLifecycle = signal<GrcRecord | null>(null);

  // -- Dialog/form state --
  activeTabIndex = 0;
  showCreateDialog = false;
  showEditDialog = false;
  showMemberDialog = false;
  showLinkDialog = false;
  showRaciDialog = false;
  showInviteDialog = false;
  showChangeRoleDialog = false;
  showLinkControlGroupDialog = false;
  showSuggestionsDialog = false;
  showRoleActivateDialog = false;
  showPivotEditDialog = false;
  drawerVisible = false;
  roleDrawerVisible = false;

  selectedTeam: Team | null = null;
  drawerMember: GrcRecord | null = null;
  drawerRole: RoleProfile | null = null;

  newTeam = { nameEn: '', nameAr: '', description: '', teamLead: '' };
  editTeamForm = { teamId: '', nameEn: '', nameAr: '', description: '' };
  newMember = { userId: '', role: 'member' };
  linkWorkflowId = '';
  linkControlGroupId = '';
  raciForm = { scopeType: '', scopeId: '', raciRole: '', notes: '' };
  inviteForm = { email: '', role: 'user', name: '' };
  changeRoleForm = { teamId: '', userId: '', memberName: '', newRole: '' };
  activateForm = { name: '', email: '', orgTitle: '', shahinTitle: '', roleCode: '', roleName: '' };
  pivotEditContext = { scopeType: '', scopeId: '', teamId: '', teamName: '', raciRole: '', existingRaciId: null as string | null };
  selectedSuggestions: GrcRecord[] = [];
  staffingRangeFilter = '*';
  staffingSectorFilter = '*';

  readonly raciRoles = [...RACI_ROLES];
  readonly scopeTypes = [...SCOPE_TYPES];
  readonly inviteRoleOptions = INVITE_ROLE_OPTIONS;
  readonly teamRoleOptions = TEAM_ROLE_OPTIONS;

  // -- Computed signals --
  canManage = computed(() => this.auth.hasPermission('users.account.manage') || this.auth.hasPermission('workspace.config.write'));

  summaryCards = computed(() => {
    const t = this.teams();
    const totalMembers = t.reduce((sum, tm) => sum + (tm.members?.length || tm.member_count || 0), 0);
    const perTeamRaci = Object.values(this.raciData()).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalRaci = this.raciTotalCount() || perTeamRaci;
    const totalWf = t.reduce((sum, tm) => sum + (tm.linked_workflows?.length || 0), 0);
    return [
      { key: 'teams', icon: 'users', value: t.length, label: 'Active Teams', labelAr: '\u0627\u0644\u0641\u0631\u0642 \u0627\u0644\u0646\u0634\u0637\u0629' },
      { key: 'members', icon: 'user', value: totalMembers, label: 'Total Members', labelAr: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u0639\u0636\u0627\u0621' },
      { key: 'raci', icon: 'sitemap', value: totalRaci, label: 'RACI Assignments', labelAr: '\u062A\u0639\u064A\u064A\u0646\u0627\u062A RACI' },
      { key: 'roles', icon: 'id-card', value: this.roleProfiles().length, label: 'Role Profiles', labelAr: '\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0623\u062F\u0648\u0627\u0631' },
      { key: 'workflows', icon: 'share-alt', value: totalWf, label: 'Linked Workflows', labelAr: '\u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629' },
      { key: 'filled', icon: 'check-circle', value: this.roleStaffingSummary().filledCount, label: 'Filled GRC Roles', labelAr: '\u0623\u062F\u0648\u0627\u0631 \u0645\u064F\u0639\u064A\u064E\u0651\u0646\u0629' },
    ];
  });

  allRaciEntries = computed(() => {
    const entries: GrcRecord[] = [];
    const rd = this.raciData();
    const t = this.teams();
    for (const teamId of Object.keys(rd)) {
      const team = t.find(x => x.team_id === teamId);
      const teamName = team ? (this.i18n.localize(team.name_en || team.name, team.name_ar || team.name_en || team.name)) : teamId;
      for (const e of (rd[teamId] || [])) { entries.push({ ...e, teamName, teamId }); }
    }
    return entries;
  });

  allMembers = computed(() => {
    const seen = new Set<string>();
    const result: GrcRecord[] = [];
    for (const team of this.teams()) {
      for (const m of (team.members || [])) {
        const key = m.user_id || m.email || m.name;
        if (!seen.has(key)) { seen.add(key); result.push({ ...m, _teams: [this.i18n.localize(team.name_en || team.name, team.name_ar || team.name_en)] }); }
        else { const existing = result.find(r => (r.user_id || r.email || r.name) === key); if (existing) existing._teams.push(this.i18n.localize(team.name_en || team.name, team.name_ar || team.name_en)); }
      }
    }
    for (const m of this.orgMembers()) { const key = m.user_id || m.email || m.name; if (!seen.has(key)) { seen.add(key); result.push({ ...m, _teams: [] }); } }
    return result;
  });

  teamDropdownOptions = computed(() => this.teams().map(t => ({ label: this.i18n.localize(t.name_en || t.name, t.name_ar || t.name_en || t.name), value: t.team_id })));
  invTeamFilterOptions = computed(() => [{ label: this.i18n.translate('teamManagement.allTeams'), value: 'all' }, ...this.teamDropdownOptions()]);
  memberPickerOptions = computed(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const m of this.orgMembers()) { const id = m.user_id || m.userId; if (!id || seen.has(id)) continue; seen.add(id); opts.push({ label: `${m.name || m.full_name || m.email || id}${m.email ? ` (${m.email})` : ''}`, value: id }); }
    for (const team of this.teams()) { for (const m of (team.members || [])) { const id = m.user_id || (m as GrcRecord).userId; if (!id || seen.has(id)) continue; seen.add(id); opts.push({ label: m.name || m.email || id, value: id }); } }
    return opts;
  });

  // -- Lifecycle --
  ngOnInit() { this.reload(); this.loadInvitations(); this.loadRoleStaffing(); }
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  // -- Data loading --
  reload() {
    this.loading.set(true);
    const sub = this.data.loadCoreData().subscribe({
      next: ({ teams, roles, members, raciCount }) => {
        const raw = teams?.teams || (Array.isArray(teams) ? teams : []);
        const mapped: Team[] = raw.map((t: GrcRecord, idx: number) => ({
          ...t, team_id: t.team_id || t.teamId || t.id || `team-${idx}`,
          name: t.name || t.name_en || t.nameEn || '', name_en: t.name_en || t.nameEn || t.name || '',
          name_ar: t.name_ar || t.nameAr || '', description: t.description || t.description_en || t.descriptionEn || '',
          members: Array.isArray(t.members) ? t.members : [], member_count: t.member_count ?? t.memberCount ?? (t.members?.length || 0),
          linked_control_groups: t.linked_control_groups || t.linkedControlGroups || [], linked_workflows: t.linked_workflows || t.linkedWorkflows || [],
        }));
        this.teams.set(mapped);
        if (mapped.length > 0 && !this.selectedWorkloadTeamId()) { this.selectedWorkloadTeamId.set(mapped[0].team_id); this.loadWorkloadById(mapped[0].team_id); }
        this.roleProfiles.set((roles?.profiles || roles?.roles || (Array.isArray(roles) ? roles : [])).map((rp) => ({
          role: rp.role || rp.profileId || rp.profile_id || '', label_en: rp.label_en || rp.name_en || rp.role || '', label_ar: rp.label_ar || rp.name_ar || '',
          permissions: rp.permissions || rp.defaultNavItems || [], description_en: rp.description_en || '', description_ar: rp.description_ar || '',
        })));
        this.orgMembers.set(members?.members || (Array.isArray(members) ? members : []));
        this.raciTotalCount.set(raciCount?.count ?? 0);
        for (const team of mapped) { this.loadRaci(team.team_id); }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
    this.subs.push(sub);
  }

  loadRaci(teamId: string) {
    const sub = this.data.loadRaci(teamId).subscribe({
      next: (d) => { this.raciData.update(rd => ({ ...rd, [teamId]: d?.scopes ?? (Array.isArray(d) ? d : []) })); },
      error: () => { this.raciData.update(rd => ({ ...rd, [teamId]: [] })); }
    });
    this.subs.push(sub);
  }

  loadInvitations() {
    this.invitationsLoading.set(true);
    this.data.loadInvitations().subscribe({ next: (d) => { this.invitations.set(d?.invitations || []); this.invitationsLoading.set(false); }, error: () => { this.invitationsLoading.set(false); } });
  }

  loadRoleStaffing() {
    this.roleStaffingLoading.set(true);
    const range = this.staffingRangeFilter !== '*' ? this.staffingRangeFilter : undefined;
    const sector = this.staffingSectorFilter !== '*' ? this.staffingSectorFilter : undefined;
    this.data.loadRoleStaffing(range, sector).subscribe({
      next: (d) => { this.roleStaffing.set(d?.roles || []); this.roleStaffingSummary.set({ totalFte: d?.totalFte || 0, mandatoryCount: d?.mandatoryCount || 0, count: d?.count || 0, filledCount: d?.filledCount || 0 }); this.roleStaffingLoading.set(false); },
      error: () => { this.roleStaffingLoading.set(false); }
    });
  }

  private loadWorkloadById(teamId: string) {
    this.workloadData.set(null);
    const sub = this.data.loadWorkload(teamId).subscribe({
      next: (d) => { this.workloadData.set(d); },
      error: () => { this.workloadData.set({ totalTasks: 0, openTasks: 0, overdueTasks: 0, completedTasks: 0, controlsOwned: 0, evidencePending: 0 }); }
    });
    this.subs.push(sub);
  }

  // -- Team actions --
  selectTeam(team: Team) { this.expandedTeam.set(this.expandedTeam() === team.team_id ? null : team.team_id); }
  openCreateTeam() { this.newTeam = { nameEn: '', nameAr: '', description: '', teamLead: '' }; this.showCreateDialog = true; }
  createTeam() {
    if (!this.newTeam.nameEn.trim()) return;
    this.creating.set(true);
    const sub = this.data.createTeam(this.newTeam).subscribe({ next: () => { this.showCreateDialog = false; this.creating.set(false); this.toast('success', this.i18n.translate('teamManagement.teamCreated')); this.reload(); }, error: () => { this.creating.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToCreateTeam')); } });
    this.subs.push(sub);
  }
  openEditTeam(team: Team) { this.editTeamForm = { teamId: team.team_id, nameEn: team.name_en || team.name || '', nameAr: team.name_ar || '', description: team.description || '' }; this.showEditDialog = true; }
  saveEditTeam() {
    if (!this.editTeamForm.nameEn.trim()) return;
    this.editing.set(true);
    const sub = this.data.updateTeam(this.editTeamForm.teamId, { nameEn: this.editTeamForm.nameEn, nameAr: this.editTeamForm.nameAr, description: this.editTeamForm.description }).subscribe({ next: () => { this.showEditDialog = false; this.editing.set(false); this.toast('success', this.i18n.translate('teamManagement.teamUpdatedToast')); this.reload(); }, error: () => { this.editing.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToUpdateTeamToast')); } });
    this.subs.push(sub);
  }
  deleteTeam(team: Team) {
    this.confirm.confirm({ message: this.i18n.localize(`Are you sure you want to delete team "${team.name_en || team.name}"?`, `\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0627\u0644\u0641\u0631\u064A\u0642 "${team.name_en || team.name}"\u061F`), header: this.i18n.translate('teamManagement.confirmDelete'), icon: 'pi pi-exclamation-triangle', acceptLabel: this.i18n.translate('teamManagement.delete'), rejectLabel: this.i18n.translate('teamManagement.cancel'), acceptButtonStyleClass: 'p-button-danger',
      accept: () => { const sub = this.data.deleteTeam(team.team_id).subscribe({ next: () => { this.toast('success', this.i18n.translate('teamManagement.teamDeleted')); this.reload(); }, error: () => { this.toast('error', this.i18n.translate('teamManagement.failedToDeleteTeam')); } }); this.subs.push(sub); }
    });
  }

  // -- Member actions --
  openAddMember(team: Team) { this.selectedTeam = team; this.newMember = { userId: '', role: 'member' }; this.showMemberDialog = true; }
  addMember() {
    if (!this.selectedTeam || !this.newMember.userId.trim()) return;
    this.addingMember.set(true);
    const sub = this.data.addMember(this.selectedTeam.team_id, this.newMember.userId.trim(), this.newMember.role).subscribe({ next: () => { this.showMemberDialog = false; this.addingMember.set(false); this.toast('success', this.i18n.translate('teamManagement.memberAddedToast')); this.reload(); }, error: () => { this.addingMember.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToAddMember')); } });
    this.subs.push(sub);
  }
  removeMemberFromTeam(team: Team, member: GrcRecord) {
    const name = member.name || member.email || member.user_id;
    const userId = member.user_id || member.userId;
    this.confirm.confirm({ message: this.i18n.localize(`Remove ${name} from team?`, `\u0625\u0632\u0627\u0644\u0629 ${name} \u0645\u0646 \u0627\u0644\u0641\u0631\u064A\u0642\u061F`), header: this.i18n.translate('teamManagement.confirmRemove'), icon: 'pi pi-user-minus', acceptButtonStyleClass: 'p-button-danger',
      accept: () => { const sub = this.data.removeMember(team.team_id, userId).subscribe({ next: () => { this.toast('success', this.i18n.translate('teamManagement.memberRemoved')); this.reload(); }, error: () => { this.toast('error', this.i18n.translate('teamManagement.failedToRemoveMember')); } }); this.subs.push(sub); }
    });
  }
  openChangeMemberRole(team: Team, member: GrcRecord) { this.changeRoleForm = { teamId: team.team_id, userId: member.user_id || member.userId, memberName: member.name || member.email || '\u2014', newRole: member.role || 'member' }; this.showChangeRoleDialog = true; }
  changeMemberRole() {
    if (!this.changeRoleForm.teamId || !this.changeRoleForm.userId || !this.changeRoleForm.newRole) return;
    this.changingRole.set(true);
    const sub = this.data.addMember(this.changeRoleForm.teamId, this.changeRoleForm.userId, this.changeRoleForm.newRole).subscribe({ next: () => { this.showChangeRoleDialog = false; this.changingRole.set(false); this.toast('success', this.i18n.translate('teamManagement.roleUpdated')); this.reload(); }, error: () => { this.changingRole.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToUpdateRole')); } });
    this.subs.push(sub);
  }

  // -- Invite --
  openInviteDialog(team: Team) { this.selectedTeam = team; this.inviteForm = { email: '', role: 'user', name: '' }; this.showInviteDialog = true; }
  sendInvitation() {
    if (!this.selectedTeam || !this.inviteForm.email.trim()) return;
    this.sendingInvite.set(true);
    const sub = this.data.sendInvitation({ email: this.inviteForm.email.trim(), role: this.inviteForm.role, entityType: 'team', entityId: this.selectedTeam.team_id, metadata: { name: this.inviteForm.name.trim() || undefined } }).subscribe({ next: () => { this.showInviteDialog = false; this.sendingInvite.set(false); this.toast('success', this.i18n.translate('teamManagement.invitationSentToast')); this.loadInvitations(); }, error: () => { this.sendingInvite.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToSendInvitationToast')); } });
    this.subs.push(sub);
  }
  revokeInvitation(inv: GrcRecord) { this.data.revokeInvitation(inv.invitationId).subscribe({ next: () => { this.toast('success', this.i18n.translate('teamManagement.invitationRevoked')); this.loadInvitations(); }, error: () => { this.toast('error', this.i18n.translate('teamManagement.failedToRevokeInvitation')); } }); }
  resendInvitation(inv: GrcRecord) { this.data.resendInvitation(inv.invitationId).subscribe({ next: () => { this.toast('success', this.i18n.translate('teamManagement.invitationResent')); this.loadInvitations(); }, error: () => { this.toast('error', this.i18n.translate('teamManagement.failedToResendInvitation')); } }); }

  // -- Link workflow/control group --
  openLinkWorkflow(team: Team) { this.selectedTeam = team; this.linkWorkflowId = ''; this.showLinkDialog = true; }
  doLinkWorkflow() {
    if (!this.selectedTeam || !this.linkWorkflowId.trim()) return;
    this.linking.set(true);
    const sub = this.data.linkWorkflow(this.selectedTeam.team_id, this.linkWorkflowId.trim()).subscribe({ next: () => { this.showLinkDialog = false; this.linking.set(false); this.toast('success', this.i18n.translate('teamManagement.workflowLinkedToast')); this.reload(); }, error: () => { this.linking.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToLinkWorkflowToast')); } });
    this.subs.push(sub);
  }
  openLinkControlGroup(team: Team) { this.selectedTeam = team; this.linkControlGroupId = ''; this.showLinkControlGroupDialog = true; }
  doLinkControlGroup() {
    if (!this.selectedTeam || !this.linkControlGroupId.trim()) return;
    this.linkingControlGroup.set(true);
    const sub = this.data.linkControlGroup(this.selectedTeam.team_id, this.linkControlGroupId.trim()).subscribe({ next: () => { this.showLinkControlGroupDialog = false; this.linkingControlGroup.set(false); this.toast('success', this.i18n.translate('teamManagement.controlGroupLinked')); this.reload(); }, error: () => { this.linkingControlGroup.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToLinkControlGroup')); } });
    this.subs.push(sub);
  }

  // -- RACI --
  openAssignRaci(team: Team) { this.selectedTeam = team; this.raciForm = { scopeType: 'workflow', scopeId: '', raciRole: 'responsible', notes: '' }; this.loadRaciScopeItems('workflow'); this.showRaciDialog = true; }
  openPivotAssignRaci() { this.raciForm = { scopeType: 'workflow', scopeId: '', raciRole: 'responsible', notes: '' }; this.selectedTeam = this.teams()[0] || null; this.loadRaciScopeItems('workflow'); this.showRaciDialog = true; }
  onRaciScopeTypeChange(scopeType: string) { this.raciForm.scopeType = scopeType; this.raciForm.scopeId = ''; this.loadRaciScopeItems(scopeType); }
  private loadRaciScopeItems(scopeType: string) {
    this.data.loadRaciScopeItems(scopeType).subscribe({
      next: (d) => {
        const list = d?.policies || d?.workflows || d?.templates || d?.controls || (Array.isArray(d) ? d : []);
        const items = scopeType === 'process' ? list.filter((w) => w.type === 'process' || !w.type) : list;
        this.raciScopeItems.set(items.map((item) => ({ label: item.title || item.name || item.template_code || item.policy_id || item.control_id || item.workflow_id || 'Untitled', value: item.policy_id || item.template_code || item.workflow_id || item.control_id || item.id })));
      },
      error: () => this.raciScopeItems.set([])
    });
  }
  assignRaci() {
    if (!this.selectedTeam || !this.raciForm.scopeType || !this.raciForm.scopeId.trim() || !this.raciForm.raciRole) return;
    this.assigningRaci.set(true);
    const sub = this.data.setRACIRole(this.raciForm.scopeType, this.raciForm.scopeId.trim(), this.raciForm.raciRole, this.selectedTeam.team_id, undefined, this.raciForm.notes || undefined).subscribe({ next: () => { this.showRaciDialog = false; this.assigningRaci.set(false); this.toast('success', this.i18n.translate('teamManagement.raciAssigned')); this.loadRaci(this.selectedTeam!.team_id); }, error: () => { this.assigningRaci.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToAssignRaci')); } });
    this.subs.push(sub);
  }

  // -- Pivot cell edit --
  openPivotCellEdit(row: GrcRecord, team: Team) {
    const existing = row.assignments?.get(team.team_id);
    this.pivotEditContext = { scopeType: row.scopeType, scopeId: row.scopeId, teamId: team.team_id, teamName: this.i18n.localize(team.name_en || team.name, team.name_ar || team.name_en || team.name), raciRole: existing?.role || '', existingRaciId: existing?.raciId || null };
    this.showPivotEditDialog = true;
  }
  savePivotCell() {
    const ctx = this.pivotEditContext;
    if (!ctx.raciRole && ctx.existingRaciId) { this.subs.push(this.data.deleteRaci(ctx.existingRaciId).subscribe({ next: () => { this.showPivotEditDialog = false; this.loadRaci(ctx.teamId); }, error: (e) => devError("[API]", e) })); return; }
    if (!ctx.raciRole) { this.showPivotEditDialog = false; return; }
    if (ctx.existingRaciId) {
      this.subs.push(this.data.deleteRaci(ctx.existingRaciId).subscribe({ next: () => { this.subs.push(this.data.setRACIRole(ctx.scopeType, ctx.scopeId, ctx.raciRole, ctx.teamId).subscribe({ next: () => { this.showPivotEditDialog = false; this.loadRaci(ctx.teamId); }, error: (e) => devError("[API]", e) })); }, error: (e) => devError("[API]", e) }));
    } else {
      this.subs.push(this.data.setRACIRole(ctx.scopeType, ctx.scopeId, ctx.raciRole, ctx.teamId).subscribe({ next: () => { this.showPivotEditDialog = false; this.loadRaci(ctx.teamId); }, error: (e) => devError("[API]", e) }));
    }
  }
  deletePivotRow(row: GrcRecord) {
    this.confirm.confirm({ message: this.i18n.localize(`Delete all RACI assignments for scope "${row.scopeType}/${row.scopeId}"?`, `\u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u062A\u0639\u064A\u064A\u0646\u0627\u062A RACI \u0644\u0644\u0646\u0637\u0627\u0642 "${row.scopeType}/${row.scopeId}"\u061F`), header: this.i18n.translate('teamManagement.confirmDelete'), icon: 'pi pi-exclamation-triangle', acceptLabel: this.i18n.translate('teamManagement.delete'), rejectLabel: this.i18n.translate('teamManagement.cancel'), acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const entries = this.allRaciEntries().filter(e => (e.scopeType || e.scope_type) === row.scopeType && (e.scopeId || e.scope_id) === row.scopeId);
        for (const e of entries) { const raciId = e.raciId || e.raci_id || e.assignment_id; if (raciId) this.subs.push(this.data.deleteRaci(raciId).subscribe({ next: () => {}, error: (err) => devError("[API]", err) })); }
        setTimeout(() => { for (const t of this.teams()) this.loadRaci(t.team_id); this.toast('success', this.i18n.translate('teamManagement.rowDeleted')); }, 500);
      }
    });
  }

  // -- RACI Suggestions --
  loadRaciSuggestions() {
    this.loadingSuggestions.set(true); this.selectedSuggestions = [];
    this.data.loadRaciSuggestions().subscribe({ next: (d) => { this.raciSuggestions.set(d?.suggestions || []); this.loadingSuggestions.set(false); this.showSuggestionsDialog = true; }, error: () => { this.loadingSuggestions.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToLoadSuggestions')); } });
  }
  applyRaciSuggestions() {
    const matched = this.selectedSuggestions.filter(s => s.matchedTeamId);
    if (matched.length === 0) { this.toast('warn', this.i18n.translate('teamManagement.noSuggestionsMatchedToExistingTeams')); return; }
    this.applyingSuggestions.set(true); let done = 0; let errors = 0;
    for (const s of matched) {
      this.data.setRACIRole(s.scopeType, s.scopeId, s.suggestedRaciRole, s.matchedTeamId).subscribe({
        next: () => { done++; if (done + errors === matched.length) { this.applyingSuggestions.set(false); this.showSuggestionsDialog = false; this.toast('success', this.i18n.translate('teamManagement.raciAssignmentsAppliedSuccess', { count: String(done) })); for (const t of this.teams()) this.loadRaci(t.team_id); } },
        error: () => { errors++; if (done + errors === matched.length) { this.applyingSuggestions.set(false); this.showSuggestionsDialog = false; this.toast('warn', this.i18n.translate('teamManagement.raciApplyPartialResult', { done: String(done), errors: String(errors) })); for (const t of this.teams()) this.loadRaci(t.team_id); } }
      });
    }
  }
  raciSuggestSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' { const m: Record<string, unknown> = { responsible: 'success', accountable: 'info', consulted: 'warning', informed: 'secondary' }; return m[role] || 'info'; }

  // -- Role Staffing --
  onStaffingFilterChange(range: string, sector: string) { this.staffingRangeFilter = range; this.staffingSectorFilter = sector; this.loadRoleStaffing(); }
  openActivateRole(role: GrcRecord) { this.activateForm = { name: '', email: '', orgTitle: '', shahinTitle: role.shahin_title_en || role.role_name_en || '', roleCode: role.role_code, roleName: this.i18n.localize(role.role_name_en, role.role_name_ar || role.role_name_en) }; this.showRoleActivateDialog = true; }
  sendActivation() {
    if (!this.activateForm.email || !this.activateForm.name) return;
    this.activateSending.set(true);
    this.data.sendRoleInvitation({ email: this.activateForm.email, name: this.activateForm.name, roleCode: this.activateForm.roleCode, orgTitle: this.activateForm.orgTitle, shahinTitle: this.activateForm.shahinTitle }).subscribe({ next: () => { this.showRoleActivateDialog = false; this.activateSending.set(false); this.toast('success', this.i18n.translate('teamManagement.roleInvitationSent')); this.loadInvitations(); this.loadRoleStaffing(); }, error: () => { this.activateSending.set(false); this.toast('error', this.i18n.translate('teamManagement.failedToSendRoleInvitation')); } });
  }

  // -- Workload --
  onWorkloadTeamChange(teamId: string) { this.selectedWorkloadTeamId.set(teamId); if (teamId) this.loadWorkloadById(teamId); }
  loadWorkload(team: Team) { this.selectedWorkloadTeamId.set(team.team_id); this.activeTabIndex = 3; this.loadWorkloadById(team.team_id); }

  // -- Drawers --
  openMemberDrawer(m: GrcRecord) {
    this.drawerMember = m; this.drawerMemberPerf.set(null); this.drawerLifecycle.set(null); this.drawerVisible = true;
    const teamId = this.teams().filter(t => t.members?.some((mem: any) => mem.userId === m.user_id || mem.user_id === m.user_id)).map(t => t.team_id)[0] || this.selectedWorkloadTeamId();
    if (teamId) { this.data.loadWorkload(teamId).subscribe({ next: (d) => { this.drawerMemberPerf.set(d?.members?.find((pm) => pm.userId === m.user_id || pm.userId === m.userId) || null); }, error: (e) => devError("[API]", e) }); }
    this.data.loadMemberDirectory().subscribe({ next: (d) => { this.drawerLifecycle.set((d?.members || []).find((x) => x.userId === m.user_id || x.userId === m.userId) || null); }, error: (e) => devError("[API]", e) });
  }
  openRoleDrawer(rp: RoleProfile) { this.drawerRole = rp; this.roleDrawerVisible = true; }
  navigateToLifecycle() { this.router.navigate(['/team-hub'], { queryParams: { tab: 'lifecycle' } }); }

  // -- Drawer helpers --
  drawerLifecycleLabel(): string { const s = this.drawerLifecycle()?.lifecycleStatus || 'active'; return ({ invited: 'Invited', onboarded: 'Onboarded', active: 'Active', under_review: 'Under Review', suspended: 'Suspended', offboarded: 'Offboarded' } as GrcRecord)[s] || s; }
  drawerLifecycleSeverity(): GrcRecord { return ({ active: 'success', onboarded: 'info', invited: 'warning', under_review: 'warning', suspended: 'danger', offboarded: 'secondary' } as GrcRecord)[this.drawerLifecycle()?.lifecycleStatus || 'active'] || 'secondary'; }
  drawerModeLabel(): string { return ({ human_only: 'Human Only', hybrid: 'Human + Agent', agrc_os: 'AGRC-OS' } as GrcRecord)[this.drawerLifecycle()?.activationMode || 'human_only'] || this.drawerLifecycle()?.activationMode || 'Human Only'; }
  drawerModeSeverity(): GrcRecord { return ({ human_only: 'secondary', hybrid: 'info', agrc_os: 'success' } as GrcRecord)[this.drawerLifecycle()?.activationMode || 'human_only'] || 'secondary'; }

  // -- Shared helpers --
  memberTeams(m: GrcRecord): string[] { return m._teams || []; }
  countUsersWithRole(role: string): number { return this.allMembers().filter(m => m.role === role).length; }
  countTeamsWithRole(role: string): number { return this.teams().filter(t => (t.members || []).some((m: any) => m.role === role || m.team_role === role)).length; }
  memberInitial(m: GrcRecord): string { return (m.name || m.email || '?')[0].toUpperCase(); }
  memberColor(m: GrcRecord): string { const id = m.user_id || m.email || m.name || '?'; const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']; let hash = 0; for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash); return colors[Math.abs(hash) % colors.length]; }
  roleColor(role: string): string { return ({ admin: 'var(--error)', owner: '#3b82f6', manager: '#8b5cf6', auditor: 'var(--warning)', user: '#10b981', viewer: 'var(--text-muted)', compliance_officer: '#06b6d4', ciso: '#ec4899', ceo: '#14b8a6', risk_manager: '#f97316' } as unknown)[role?.toLowerCase()] || '#6366f1'; }
  roleSeverity(role: string): GrcRecord { return ({ lead: 'info', admin: 'danger', owner: 'info', manager: 'warning', auditor: 'warning', member: 'secondary', reviewer: 'success', approver: 'info' } as GrcRecord)[role?.toLowerCase()] || 'secondary'; }
  scopeIcon(scope: string): string { return ({ policy: 'file', workflow: 'sitemap', process: 'cog', control_group: 'shield' } as GrcRecord)[scope] || 'tag'; }

  // -- CSV Export --
  private downloadCsv(filename: string, rows: string[][]) {
    const bom = '\uFEFF'; const csv = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }
  exportRaciCsv() {
    const teamCols = this.teams();
    const pivotRows = this.computePivotRows();
    const header = ['Scope Type', 'Scope ID', ...teamCols.map(t => t.name_en || t.name)];
    const data = pivotRows.map((row) => [row.scopeType, row.scopeId, ...teamCols.map(t => row.assignments?.get(t.team_id)?.role || '')]);
    this.downloadCsv('raci-matrix.csv', [header, ...data]); this.toast('success', this.i18n.translate('teamManagement.raciExported'));
  }
  exportMembersCsv() {
    const header = ['Name', 'Email', 'Team', 'Role', 'Tasks'];
    const data = this.allMembers().map((m) => [m.name || m.full_name || '', m.email || '', m.teamName || m.team_name || '', m.teamRole || m.role || '', String(m.task_count || 0)]);
    this.downloadCsv('members.csv', [header, ...data]); this.toast('success', this.i18n.translate('teamManagement.membersExported'));
  }
  exportStaffingCsv() {
    const header = ['Role', 'Category', 'FTE', 'Required', 'Employee Name', 'Email', 'Org Title'];
    const data = this.roleStaffing().map((r) => [r.role_name_en || r.roleNameEn || '', r.category || '', String(r.recommended_fte || r.recommendedFte || ''), r.is_mandatory || r.isMandatory ? 'Yes' : 'No', r.employee_name || r.employeeName || '', r.employee_email || r.employeeEmail || '', r.org_title || r.orgTitle || '']);
    this.downloadCsv('grc-role-staffing.csv', [header, ...data]); this.toast('success', this.i18n.translate('teamManagement.staffingExported'));
  }

  /** Compute pivot rows from allRaciEntries (used for CSV export). */
  private computePivotRows() {
    const entries = this.allRaciEntries();
    const scopeMap = new Map<string, { scopeType: string; scopeId: string; assignments: Map<string, { role: string; raciId: string }> }>();
    for (const e of entries) {
      const key = `${e.scopeType || e.scope_type}::${e.scopeId || e.scope_id}`;
      if (!scopeMap.has(key)) scopeMap.set(key, { scopeType: e.scopeType || e.scope_type, scopeId: e.scopeId || e.scope_id, assignments: new Map() });
      const tid = e.teamId || e.team_id;
      if (tid) scopeMap.get(key)!.assignments.set(tid, { role: e.raciRole || e.raci_role, raciId: e.raciId || e.raci_id || e.assignment_id });
    }
    return [...scopeMap.values()];
  }

  private toast(severity: 'success' | 'error' | 'info' | 'warn', summary: string, detail?: string) { this.msg.add({ severity, summary, detail, life: 3000 }); }
}
