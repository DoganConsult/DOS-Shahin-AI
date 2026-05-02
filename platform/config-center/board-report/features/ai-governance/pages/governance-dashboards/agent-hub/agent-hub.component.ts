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
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';

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
    imports: [CommonModule, AppDatePipe, FormsModule, GrcDataTableComponent, TabViewModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextarea, TooltipModule, DropdownModule, InputSwitchModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    templateUrl: './agent-hub.component.html',
    styleUrls: ['./agent-hub.component.scss']
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
