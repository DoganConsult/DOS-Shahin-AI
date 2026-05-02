import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { environment } from '@env/environment';
import { PlatformModeService, type AgentProposal, type ShadowAgentConfig } from '@app/core/services/platform/platform-mode.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';

interface AgentRun {
  run_id: string;
  status: string;
  platform_mode: string;
  autonomy_level: string;
  agent_id: string | null;
  summary: string | null;
  actions_proposed: number;
  actions_executed: number;
  actions_queued: number;
  duration_ms: number | null;
  created_at: string;
}

interface RunGraphNode {
  id: string;
  type: string;
  label: string;
  lane: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-agent-hub',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, TabViewModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextarea, TooltipModule, DropdownModule, InputSwitchModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <div class="agent-hub">
      <div class="agent-hub__header">
        <h2>{{ i18n.translate('agentHub.agentOperationsHub') }}</h2>
        <p class="agent-hub__subtitle">{{ i18n.translate('agentHub.manageProposalsRunsShadowAgentsWorkflows') }}</p>
      </div>

      <p-tabView>
        <!-- Tab 1: Proposals -->
        <p-tabPanel [header]="i18n.translate('agentHub.proposals')" leftIcon="pi pi-inbox">
          <div class="tab-toolbar">
            <p-dropdown [options]="proposalStatusOptions" [(ngModel)]="proposalStatusFilter" (onChange)="loadProposals()" [style]="{ width: '180px' }"></p-dropdown>
            <button pButton [label]="i18n.translate('agentHub.refresh')" icon="pi pi-refresh" class="p-button-text" (click)="loadProposals()"></button>
          </div>
          <p-table aria-label="Data table" [value]="proposals()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="false">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('agentHub.agent') }}</th>
                <th>{{ i18n.translate('agentHub.type') }}</th>
                <th>{{ i18n.translate('agentHub.priority') }}</th>
                <th>{{ i18n.translate('agentHub.reason') }}</th>
                <th>{{ i18n.translate('agentHub.status') }}</th>
                <th>{{ i18n.translate('agentHub.date') }}</th>
                <th>{{ i18n.translate('agentHub.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-p>
              <tr>
                <td><span class="agent-chip">{{ p.agent_id }}</span></td>
                <td>{{ p.type }}</td>
                <td><p-tag [value]="p.priority" [severity]="prioritySeverity(p.priority)"></p-tag></td>
                <td class="reason-cell">{{ p.reason || '—' }}</td>
                <td><p-tag [value]="p.status" [severity]="statusSeverity(p.status)"></p-tag></td>
                <td>{{ p.created_at | appDate:'short' }}</td>
                <td>
                  <div class="action-btns" *ngIf="p.status === 'pending_approval'">
                    <button pButton icon="pi pi-check" class="p-button-success p-button-sm p-button-text" (click)="openApproveDialog(p)" [pTooltip]="i18n.translate('agentHub.approve')"></button>
                    <button pButton icon="pi pi-times" class="p-button-danger p-button-sm p-button-text" (click)="openRejectDialog(p)" [pTooltip]="i18n.translate('agentHub.reject')"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 2: Run History -->
        <p-tabPanel [header]="i18n.translate('agentHub.runHistory')" leftIcon="pi pi-history">
          <div class="tab-toolbar">
            <button pButton [label]="i18n.translate('agentHub.refresh')" icon="pi pi-refresh" class="p-button-text" (click)="loadRuns()"></button>
          </div>
          <p-table aria-label="Data table" [value]="runs()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="false">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('agentHub.agent') }}</th>
                <th>{{ i18n.translate('agentHub.status') }}</th>
                <th>{{ i18n.translate('agentHub.mode') }}</th>
                <th>{{ i18n.translate('agentHub.proposed') }}</th>
                <th>{{ i18n.translate('agentHub.executed') }}</th>
                <th>{{ i18n.translate('agentHub.duration') }}</th>
                <th>{{ i18n.translate('agentHub.summary') }}</th>
                <th>{{ i18n.translate('agentHub.date') }}</th>
                <th>{{ i18n.translate('agentHub.graph') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-run>
              <tr>
                <td><span class="agent-chip">{{ run.agent_id || '—' }}</span></td>
                <td><p-tag [value]="run.status" [severity]="runStatusSeverity(run.status)"></p-tag></td>
                <td>{{ run.platform_mode }}</td>
                <td>{{ run.actions_proposed }}</td>
                <td>{{ run.actions_executed }}</td>
                <td>{{ run.duration_ms ? (run.duration_ms / 1000).toFixed(1) + 's' : '—' }}</td>
                <td class="summary-cell">{{ run.summary?.substring(0, 80) || '—' }}</td>
                <td>{{ run.created_at | appDate:'short' }}</td>
                <td>
                  <button pButton icon="pi pi-sitemap" class="p-button-text p-button-sm" (click)="openGraph(run)" [pTooltip]="i18n.translate('agentHub.viewGraph')"></button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 3: Shadow Agents -->
        <p-tabPanel [header]="i18n.translate('agentHub.shadowAgents')" leftIcon="pi pi-eye">
          <div class="tab-toolbar">
            <button pButton [label]="i18n.translate('agentHub.refresh')" icon="pi pi-refresh" class="p-button-text" (click)="loadShadowAgents()"></button>
          </div>
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="shadowAgents()" styleClass="p-datatable-sm" [loading]="false">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('agentHub.user') }}</th>
                <th>{{ i18n.translate('agentHub.enabled') }}</th>
                <th>{{ i18n.translate('agentHub.autonomy') }}</th>
                <th>{{ i18n.translate('agentHub.allowedAgents') }}</th>
                <th>{{ i18n.translate('agentHub.dailyLimit') }}</th>
                <th>{{ i18n.translate('agentHub.lastActive') }}</th>
                <th>{{ i18n.translate('agentHub.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-sa>
              <tr>
                <td>{{ sa.full_name || sa.email || sa.user_id }}</td>
                <td><p-inputSwitch [(ngModel)]="sa.enabled" (onChange)="toggleShadowAgent(sa)"></p-inputSwitch></td>
                <td><p-tag [value]="sa.autonomy_level" [severity]="autonomySeverity(sa.autonomy_level)"></p-tag></td>
                <td>{{ sa.allowed_agents?.join(', ') || 'All' }}</td>
                <td>{{ sa.max_actions_per_day }}</td>
                <td>{{ sa.last_active_at ? (sa.last_active_at | appDate:'short') : '—' }}</td>
                <td>
                  <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="editShadowAgent(sa)" [pTooltip]="i18n.translate('agentHub.edit')"></button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 4: Workflow Studio -->
        <p-tabPanel [header]="i18n.translate('agentHub.workflowStudio')" leftIcon="pi pi-sitemap">
          <div *ngIf="!selectedRun()" class="studio-empty">
            <i class="pi pi-sitemap" style="font-size: var(--font-size-6xl); color: var(--text-muted)"></i>
            <p>{{ i18n.translate('agentHub.selectARunFromRunHistoryTabToViewTheWork') }}</p>
          </div>
          <div *ngIf="selectedRun()" class="studio-content">
            <div class="studio-header">
              <h4>{{ i18n.translate('agentHub.runGraph') }}: {{ selectedRun()!.run_id.substring(0, 8) }}...</h4>
              <p-tag [value]="selectedRun()!.status" [severity]="runStatusSeverity(selectedRun()!.status)"></p-tag>
              <button pButton icon="pi pi-history" class="p-button-text p-button-sm" (click)="loadVersions()" [pTooltip]="i18n.translate('agentHub.versionHistory')"></button>
              <button pButton icon="pi pi-play" class="p-button-text p-button-sm" (click)="loadPlaybackEvents()" [pTooltip]="i18n.translate('agentHub.playbackEvents')"></button>
            </div>
            <div class="swimlane-container">
              <div *ngFor="let lane of swimlanes()" class="swimlane">
                <div class="swimlane__header">
                  <span class="swimlane__name">{{ lane.name }}</span>
                  <span class="swimlane__count">{{ lane.nodes.length }}</span>
                </div>
                <div class="swimlane__nodes">
                  <div tabindex="0" role="button" (keyup.enter)="talkToNode(node)" *ngFor="let node of lane.nodes" class="graph-node" [class]="'graph-node--' + node.status" (click)="talkToNode(node)">
                    <div class="graph-node__icon">
                      <i class="pi" [ngClass]="nodeIcon(node.type)"></i>
                    </div>
                    <div class="graph-node__info">
                      <span class="graph-node__label">{{ node.label }}</span>
                      <span class="graph-node__status">{{ node.status }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="playbackEvents().length > 0" class="playback-section">
              <h5>{{ i18n.translate('agentHub.eventPlayback') }}</h5>
              <div class="playback-timeline">
                <div *ngFor="let ev of playbackEvents(); let i = index" class="playback-event" [class.playback-event--active]="i <= playbackIndex()">
                  <span class="playback-event__time">{{ ev.created_at | date:'HH:mm:ss' }}</span>
                  <span class="playback-event__type">{{ ev.event_type }}</span>
                  <span class="playback-event__node">{{ ev.node_id || '—' }}</span>
                </div>
              </div>
              <div class="playback-controls">
                <button pButton icon="pi pi-step-backward" class="p-button-text p-button-sm" (click)="playbackStep(-1)" [disabled]="playbackIndex() <= 0"></button>
                <span>{{ playbackIndex() + 1 }} / {{ playbackEvents().length }}</span>
                <button pButton icon="pi pi-step-forward" class="p-button-text p-button-sm" (click)="playbackStep(1)" [disabled]="playbackIndex() >= playbackEvents().length - 1"></button>
              </div>
            </div>
            <div *ngIf="graphVersions().length > 0" class="versions-section">
              <h5>{{ i18n.translate('agentHub.versionHistory2') }} ({{ graphVersions().length }})</h5>
              <div *ngFor="let v of graphVersions()" class="version-row">
                <span class="version-num">v{{ v.version_number }}</span>
                <span class="version-summary">{{ v.change_summary }}</span>
                <span class="version-type"><p-tag [value]="v.change_type" [severity]="'info'"></p-tag></span>
                <span class="version-time">{{ v.created_at | appDate:'short' }}</span>
              </div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 5: Delegation & Consent -->
        <p-tabPanel [header]="i18n.translate('agentHub.delegationConsent')" leftIcon="pi pi-shield">
          <div class="tab-toolbar">
            <button pButton [label]="i18n.translate('agentHub.refresh')" icon="pi pi-refresh" class="p-button-text" (click)="loadShadowAgents()"></button>
          </div>
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="shadowAgents()" styleClass="p-datatable-sm" [loading]="false">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('agentHub.user') }}</th>
                <th>{{ i18n.translate('agentHub.consent') }}</th>
                <th>{{ i18n.translate('agentHub.autonomy') }}</th>
                <th>{{ i18n.translate('agentHub.actionsToday') }}</th>
                <th>{{ i18n.translate('agentHub.dailyLimit') }}</th>
                <th>{{ i18n.translate('agentHub.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-sa>
              <tr>
                <td>{{ sa.full_name || sa.email || sa.user_id }}</td>
                <td>
                  <p-tag [value]="sa.consent_granted ? (i18n.translate('agentHub.granted')) : (i18n.translate('agentHub.notGranted'))"
                         [severity]="sa.consent_granted ? 'success' : 'danger'"></p-tag>
                </td>
                <td><p-tag [value]="sa.autonomy_level" [severity]="autonomySeverity(sa.autonomy_level)"></p-tag></td>
                <td>{{ sa.actions_today || 0 }}</td>
                <td>{{ sa.max_actions_per_day }}</td>
                <td>
                  <div class="action-btns">
                    <button aria-label="Confirm" pButton icon="pi pi-check" class="p-button-success p-button-sm p-button-text"
                            *ngIf="!sa.consent_granted" (click)="grantConsent(sa)" [pTooltip]="i18n.translate('agentHub.grantConsent')"></button>
                    <button aria-label="Block" pButton icon="pi pi-ban" class="p-button-warning p-button-sm p-button-text"
                            *ngIf="sa.consent_granted" (click)="revokeConsent(sa)" [pTooltip]="i18n.translate('agentHub.revokeConsent')"></button>
                    <button aria-label="Delete" pButton icon="pi pi-trash" class="p-button-danger p-button-sm p-button-text"
                            (click)="exerciseRightToForget(sa)" [pTooltip]="i18n.translate('agentHub.rightToForget')"></button>
                    <button pButton icon="pi pi-list" class="p-button-text p-button-sm"
                            (click)="viewDelegationRules(sa)" [pTooltip]="i18n.translate('agentHub.delegationRules')"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <!-- Approve/Reject Dialog -->
      <p-dialog [(visible)]="reviewDialogVisible" [modal]="true" [style]="{ width: '400px' }" [header]="reviewAction === 'approve' ? (i18n.translate('agentHub.approveProposal')) : (i18n.translate('agentHub.rejectProposal'))">
        <div class="review-form">
          <label>{{ i18n.translate('agentHub.commentOptional') }}</label>
          <textarea pInputTextarea [(ngModel)]="reviewComment" rows="3" [style]="{ width: '100%' }"></textarea>
        </div>
        <ng-template pTemplate="footer">
          <button pButton [label]="i18n.translate('agentHub.cancel')" class="p-button-text" (click)="reviewDialogVisible = false"></button>
          <button pButton [label]="reviewAction === 'approve' ? (i18n.translate('agentHub.approve')) : (i18n.translate('agentHub.reject'))"
                  [class]="reviewAction === 'approve' ? 'p-button-success' : 'p-button-danger'"
                  (click)="submitReview()"></button>
        </ng-template>
      </p-dialog>

      <!-- Talk to Node Dialog -->
      <p-dialog [(visible)]="talkDialogVisible" [modal]="true" [style]="{ width: '500px' }" [header]="i18n.translate('agentHub.talkToNode')">
        <div class="talk-form">
          <p class="talk-node-info">{{ i18n.translate('agentHub.node') }}: <strong>{{ talkNodeLabel }}</strong> — {{ talkNodeStatus }}</p>
          <textarea pInputTextarea [(ngModel)]="talkQuestion" rows="3" [placeholder]="i18n.translate('agentHub.askAboutThisStep')" [attr.aria-label]="i18n.translate('agentHub.askAboutThisStep')" [style]="{ width: '100%' }"></textarea>
          <div *ngIf="talkAnswer()" class="talk-answer">
            <h5>{{ i18n.translate('agentHub.answer') }}</h5>
            <p>{{ talkAnswer() }}</p>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton [label]="i18n.translate('agentHub.ask')" icon="pi pi-send" (click)="submitTalkToNode()" [loading]="talkLoading()"></button>
        </ng-template>
      </p-dialog>
    </div>
    <p-confirmDialog />
  `,
  styles: [`
    .agent-hub { padding: 16px; }
    .agent-hub__header { margin-bottom: 16px; }
    .agent-hub__header h2 { margin: 0 0 4px; font-size: var(--font-size-xl); }
    .agent-hub__subtitle { margin: 0; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }

    .tab-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }

    .agent-chip {
      display: inline-block; padding: 2px 8px; border-radius: var(--radius-xs);
      background: var(--surface-ice, #f0f4f8); font-size: var(--font-size-xs); font-weight: 700;
    }
    .reason-cell, .summary-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .action-btns { display: flex; gap: 4px; }

    .review-form { display: flex; flex-direction: column; gap: 8px; }
    .review-form label { font-size: var(--font-size-sm); font-weight: 600; }

    .studio-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 0; }
    .studio-empty p { font-size: var(--font-size-base); color: var(--text-muted, var(--text-muted)); }

    .studio-content { padding: 8px 0; }
    .studio-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .studio-header h4 { margin: 0; font-size: var(--font-size-base); }

    .graph-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .graph-node {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: var(--radius);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      background: var(--surface-ice, var(--surface-ice));
      cursor: pointer; transition: border-color 150ms;
      min-width: 180px;
    }
    .graph-node:hover { border-color: var(--primary, var(--primary)); }
    .graph-node--done { border-color: #10b981; background: var(--status-success-bg, #defbe6); }
    .graph-node--failed { border-color: var(--error); background: var(--status-danger-bg, #fff1f1); }
    .graph-node--awaiting_approval { border-color: var(--warning); background: #fffbeb; }
    .graph-node--running { border-color: var(--primary); background: #eff6ff; }
    .graph-node__icon .pi { font-size: var(--font-size-md); }
    .graph-node__info { display: flex; flex-direction: column; }
    .graph-node__label { font-size: var(--font-size-sm); font-weight: 600; }
    .graph-node__status { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }

    .talk-form { display: flex; flex-direction: column; gap: 8px; }
    .talk-node-info { font-size: var(--font-size-sm); margin: 0; }
    .talk-answer { margin-top: 12px; padding: 12px; border-radius: var(--radius); background: var(--surface-ice, var(--surface-ice)); }
    .talk-answer h5 { margin: 0 0 6px; font-size: var(--font-size-sm); font-weight: 700; }
    .talk-answer p { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }

    .swimlane-container { display: flex; flex-direction: column; gap: 12px; }
    .swimlane { border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius); overflow: hidden; }
    .swimlane__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 12px; background: var(--surface-ice, #f0f4f8);
      font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .swimlane__count {
      background: var(--primary, var(--primary)); color: #fff; font-size: var(--font-size-xs);
      min-width: 16px; height: 16px; line-height: 16px; border-radius: var(--radius); text-align: center; padding: 0 4px;
    }
    .swimlane__nodes { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 12px; }

    .playback-section { margin-top: 16px; padding: 12px; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius); }
    .playback-section h5 { margin: 0 0 8px; font-size: var(--font-size-sm); font-weight: 700; }
    .playback-timeline { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
    .playback-event {
      display: flex; gap: 8px; padding: 4px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-xs);
      background: var(--surface-ice, var(--surface-ice)); opacity: 0.5; transition: opacity 150ms;
    }
    .playback-event--active { opacity: 1; background: #eff6ff; }
    .playback-event__time { font-weight: 600; min-width: 60px; }
    .playback-event__type { flex: 1; }
    .playback-event__node { color: var(--text-muted, var(--text-muted)); }
    .playback-controls { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px; font-size: var(--font-size-sm); }

    .versions-section { margin-top: 12px; padding: 12px; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius); }
    .versions-section h5 { margin: 0 0 8px; font-size: var(--font-size-sm); font-weight: 700; }
    .version-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: var(--font-size-xs); border-bottom: 1px solid var(--border-subtle, var(--surface-ice)); }
    .version-num { font-weight: 800; min-width: 24px; color: var(--primary, var(--primary)); }
    .version-summary { flex: 1; }
    .version-time { color: var(--text-muted, var(--text-muted)); }
  `],
})
export class AgentHubComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  private confirmSvc = inject(ConfirmationService);
  modeService = inject(PlatformModeService);
  readonly i18n = inject(I18nService);
  private toast = inject(ToastService);
  private api = environment.apiUrl;

  proposals = signal<AgentProposal[]>([]);
  runs = signal<AgentRun[]>([]);
  shadowAgents = signal<ShadowAgentConfig[]>([]);
  selectedRun = signal<AgentRun | null>(null);
  graphNodes = signal<RunGraphNode[]>([]);
  swimlanes = signal<{ name: string; nodes: RunGraphNode[] }[]>([]);
  playbackEvents = signal<GrcRecord[]>([]);
  playbackIndex = signal(0);
  graphVersions = signal<GrcRecord[]>([]);

  proposalStatusFilter = 'pending_approval';
  proposalStatusOptions = [
    { label: 'Pending', value: 'pending_approval' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: '' },
  ];

  reviewDialogVisible = false;
  reviewAction: 'approve' | 'reject' = 'approve';
  reviewComment = '';
  reviewProposal: AgentProposal | null = null;

  talkDialogVisible = false;
  talkQuestion = '';
  talkNodeId = '';
  talkNodeLabel = '';
  talkNodeStatus = '';
  talkAnswer = signal<string>('');
  talkLoading = signal(false);

  ngOnInit(): void {
    this.loadProposals();
    this.loadRuns();
    this.loadShadowAgents();
  }

  loadProposals(): void {
    const params: Record<string, string> = {};
    if (this.proposalStatusFilter) params.status = this.proposalStatusFilter;
    this.http.get<{ proposals: AgentProposal[] }>(`${this.api}/agrc-os/proposals`, { params }).pipe(
      tap(res => this.proposals.set(res?.proposals ?? [])),
      catchError(() => { this.proposals.set([]); return of(null); }),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  loadRuns(): void {
    this.http.get<{ runs: AgentRun[] }>(`${this.api}/agrc-os/agent-runs`).pipe(
      tap(res => this.runs.set(res?.runs ?? [])),
      catchError(() => { this.runs.set([]); return of(null); }),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  loadShadowAgents(): void {
    this.http.get<{ shadowAgents: ShadowAgentConfig[] }>(`${this.api}/agrc-os/shadow-agents`).pipe(
      tap(res => this.shadowAgents.set(res?.shadowAgents ?? [])),
      catchError(() => { this.shadowAgents.set([]); return of(null); }),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  openApproveDialog(p: AgentProposal): void {
    this.reviewProposal = p;
    this.reviewAction = 'approve';
    this.reviewComment = '';
    this.reviewDialogVisible = true;
  }

  openRejectDialog(p: AgentProposal): void {
    this.reviewProposal = p;
    this.reviewAction = 'reject';
    this.reviewComment = '';
    this.reviewDialogVisible = true;
  }

  submitReview(): void {
    if (!this.reviewProposal) return;
    const obs = this.reviewAction === 'approve'
      ? this.modeService.approveProposal(this.reviewProposal.proposal_id, this.reviewComment)
      : this.modeService.rejectProposal(this.reviewProposal.proposal_id, this.reviewComment);
    obs.pipe(
      tap(() => { this.reviewDialogVisible = false; this.loadProposals(); }),
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  toggleShadowAgent(sa: ShadowAgentConfig): void {
    this.modeService.updateShadowAgent(sa.user_id, { enabled: sa.enabled }).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  editShadowAgent(sa: ShadowAgentConfig): void {
    // placeholder for future edit dialog
  }

  openGraph(run: AgentRun): void {
    this.selectedRun.set(run);
    this.playbackEvents.set([]);
    this.graphVersions.set([]);
    this.playbackIndex.set(0);
    this.http.get<{ nodes: RunGraphNode[] }>(`${this.api}/agrc-os/agent-runs/${run.run_id}/graph`).pipe(
      tap(res => {
        const nodes = res?.nodes ?? [];
        this.graphNodes.set(nodes);
        const laneMap = new Map<string, RunGraphNode[]>();
        for (const n of nodes) {
          const lane = n.lane || 'Default';
          if (!laneMap.has(lane)) laneMap.set(lane, []);
          laneMap.get(lane)!.push(n);
        }
        this.swimlanes.set([...laneMap.entries()].map(([name, laneNodes]) => ({ name, nodes: laneNodes })));
      }),
      catchError(() => { this.graphNodes.set([]); this.swimlanes.set([]); return of(null); }),
    ).subscribe();
  }

  loadPlaybackEvents(): void {
    const run = this.selectedRun();
    if (!run) return;
    this.http.get<{ events: Record<string, any>[] }>(`${this.api}/agrc-os/agent-runs/${run.run_id}/events`).pipe(
      tap(res => { this.playbackEvents.set(res?.events ?? []); this.playbackIndex.set(0); }),
      catchError(() => { this.playbackEvents.set([]); return of(null); }),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  playbackStep(delta: number): void {
    const next = this.playbackIndex() + delta;
    if (next >= 0 && next < this.playbackEvents().length) {
      this.playbackIndex.set(next);
    }
  }

  loadVersions(): void {
    const run = this.selectedRun();
    if (!run) return;
    this.http.get<{ versions: Record<string, any>[] }>(`${this.api}/agrc-os/workflow-versions/${run.run_id}`).pipe(
      tap(res => this.graphVersions.set(res?.versions ?? [])),
      catchError(() => { this.graphVersions.set([]); return of(null); }),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  grantConsent(sa: ShadowAgentConfig): void {
    this.http.post(`${this.api}/agrc-os/consent/${sa.user_id}/grant`, {
      purpose: 'GRC agent assistance and memory-based learning',
    }).pipe(
      tap(() => this.loadShadowAgents()),
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  revokeConsent(sa: ShadowAgentConfig): void {
    this.http.post(`${this.api}/agrc-os/consent/${sa.user_id}/revoke`, {}).pipe(
      tap(() => this.loadShadowAgents()),
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  exerciseRightToForget(sa: ShadowAgentConfig): void {
    this.confirmSvc.confirm({
      message: this.i18n.translate('agentHub.areYouSureThisWillDeleteAllMemoriesForTh'),
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.post(`${this.api}/agrc-os/consent/${sa.user_id}/forget`, {}).pipe(
          tap(() => this.loadShadowAgents()),
          catchError(() => of(null)),
          takeUntilDestroyed(this.destroyRef)).subscribe();
      }
    });
  }

  viewDelegationRules(sa: ShadowAgentConfig): void {
    this.http.get<{ rules: Record<string, any>[] }>(`${this.api}/agrc-os/delegation-rules/${sa.user_id}`).pipe(
      tap(res => {
        const rules = res?.rules ?? [];
        const msg = rules.length > 0
          ? rules.map(r => `${r.agent_id}/${r.action_type}: ${r.allowed ? 'Allowed' : 'Blocked'} (max: ${r.max_risk_level})`).join('\n')
          : (this.i18n.translate('agentHub.noDelegationRulesConfigured'));
        this.toast.info(msg);
      }),
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  talkToNode(node: RunGraphNode): void {
    const run = this.selectedRun();
    if (!run) return;
    this.talkNodeId = node.id;
    this.talkNodeLabel = node.label;
    this.talkNodeStatus = node.status;
    this.talkQuestion = '';
    this.talkAnswer.set('');
    this.talkDialogVisible = true;
  }

  submitTalkToNode(): void {
    const run = this.selectedRun();
    if (!run || !this.talkQuestion.trim()) return;
    this.talkLoading.set(true);
    this.http.post<{ answer: string }>(`${this.api}/agrc-os/agent-runs/${run.run_id}/node/${this.talkNodeId}/ask`, {
      question: this.talkQuestion, mode: 'manager',
    }).pipe(
      tap(res => { this.talkAnswer.set(res?.answer ?? ''); this.talkLoading.set(false); }),
      catchError(() => { this.talkAnswer.set('Unable to get answer'); this.talkLoading.set(false); return of(null); }),
      takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  prioritySeverity(p: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (p) { case 'critical': return 'danger'; case 'high': return 'warning'; case 'medium': return 'info'; default: return 'success'; }
  }

  statusSeverity(s: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (s) { case 'approved': case 'executed': return 'success'; case 'rejected': return 'danger'; case 'pending_approval': return 'warning'; default: return 'info'; }
  }

  runStatusSeverity(s: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (s) { case 'completed': return 'success'; case 'failed': return 'danger'; case 'running': return 'info'; case 'awaiting_approval': return 'warning'; default: return 'info'; }
  }

  autonomySeverity(l: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (l) { case 'L0': return 'success'; case 'L1': return 'info'; case 'L2': return 'warning'; case 'L3': return 'danger'; default: return 'info'; }
  }

  nodeIcon(type: string): string {
    switch (type) { case 'start': return 'pi-play'; case 'end': return 'pi-stop'; case 'approval': return 'pi-check-circle'; case 'gateway': return 'pi-share-alt'; default: return 'pi-cog'; }
  }

}
