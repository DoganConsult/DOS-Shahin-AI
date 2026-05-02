import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, catchError, of, interval, switchMap, startWith, filter } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WebSocketClientService } from '@app/core/services/websocket/websocket-client.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { GrcDataTableComponent, GrcFormFieldComponent } from '@app/shared/components';
import { GraphExplorerComponent, GraphExplorerNode, GraphExplorerEdge } from '@app/shared/graph-explorer/graph-explorer.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TabViewModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { Workflow3LevelApiService } from '../../services/workflow-3level-api.service';
import type { AINoteDto, DraftActionDto, KillSwitchDto, RollbackLogDto, AIBudgetDto, InterventionLogDto, WorkflowHealthDto, BudgetCheckDto } from '../../services/workflow-3level-api.service';

type SupervisorTab = 'overview' | 'notes' | 'drafts' | 'killswitch' | 'rollback' | 'budget' | 'interventions';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-supervisor-dashboard',
    imports: [CommonModule, FormsModule, RouterModule, GrcDataTableComponent, GrcFormFieldComponent, PageHeaderComponent, StatCardComponent, EmptyStateComponent,
        SkeletonLoaderComponent, GraphExplorerComponent, TagModule, ButtonModule, CardModule, TableModule, TooltipModule,
        DialogModule, InputTextModule, InputTextarea, DropdownModule, TabViewModule, ToastModule],
    providers: [MessageService],
    templateUrl: './workflow-supervisor-dashboard.component.html',
    styleUrls: ['./workflow-supervisor-dashboard.component.scss']
})
export class WorkflowSupervisorDashboardComponent implements OnInit {
  private api = inject(Workflow3LevelApiService);
  private msg = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  private ws = inject(WebSocketClientService);
  i18n = inject(I18nService);

  loading = signal(false);
  activeLevel = signal<string>('L3');
  activeTab = signal<SupervisorTab>('overview');

  health = signal<WorkflowHealthDto | null>(null);
  pendingNotes = signal<AINoteDto[]>([]);
  pendingDrafts = signal<DraftActionDto[]>([]);
  killSwitches = signal<KillSwitchDto[]>([]);
  pendingRollbacks = signal<RollbackLogDto[]>([]);
  budget = signal<AIBudgetDto | null>(null);
  budgetCheck = signal<BudgetCheckDto | null>(null);
  interventions = signal<InterventionLogDto[]>([]);

  tabCounts = computed(() => {
    const c: Record<string, number> = {};
    if (this.pendingNotes().length) c['notes'] = this.pendingNotes().length;
    if (this.pendingDrafts().length) c['drafts'] = this.pendingDrafts().length;
    if (this.killSwitches().length) c['killswitch'] = this.killSwitches().length;
    if (this.pendingRollbacks().length) c['rollback'] = this.pendingRollbacks().length;
    if (this.interventions().filter(i => !i.acknowledged_by).length) c['interventions'] = this.interventions().filter(i => !i.acknowledged_by).length;
    return c;
  });

  agentGraphNodes = computed<GraphExplorerNode[]>(() => {
    const agents = [
      { id: 'A01', label: 'Orchestrator', color: '#7e22ce' },
      { id: 'A02', label: 'Compliance', color: '#3b82f6' },
      { id: 'A03', label: 'Risk', color: '#ef4444' },
      { id: 'A04', label: 'Audit', color: '#f59e0b' },
      { id: 'A05', label: 'Evidence', color: '#22c55e' },
      { id: 'A06', label: 'Policy', color: '#8b5cf6' },
      { id: 'A07', label: 'Vendor', color: '#06b6d4' },
      { id: 'A08', label: 'Reports', color: '#ec4899' },
      { id: 'A09', label: 'NLP', color: '#14b8a6' },
      { id: 'A10', label: 'Advisor', color: '#f97316' },
    ];
    return agents.map(a => ({ id: a.id, label: `${a.id}\n${a.label}`, type: 'agent', size: a.id === 'A01' ? 18 : 12, color: a.color }));
  });

  agentGraphEdges = computed<GraphExplorerEdge[]>(() => {
    return [
      { source: 'A01', target: 'A02', label: 'compliance' },
      { source: 'A01', target: 'A03', label: 'risk' },
      { source: 'A01', target: 'A04', label: 'audit' },
      { source: 'A01', target: 'A05', label: 'evidence' },
      { source: 'A01', target: 'A06', label: 'policy' },
      { source: 'A01', target: 'A07', label: 'vendor' },
      { source: 'A01', target: 'A08', label: 'reports' },
      { source: 'A01', target: 'A09', label: 'nlp' },
      { source: 'A01', target: 'A10', label: 'advisor' },
      { source: 'A02', target: 'A05' },
      { source: 'A03', target: 'A04' },
      { source: 'A04', target: 'A05' },
    ];
  });

  showKillSwitchDialog = false;
  showRejectDialog = false;
  rejectReason = '';
  private rejectTarget: DraftActionDto | null = null;

  killSwitchForm = { scope: 'all_autonomous', reason: '' };
  killSwitchScopes = [
    { label: 'All Autonomous', value: 'all_autonomous' },
    { label: 'Workflow Specific', value: 'workflow_specific' },
    { label: 'Step Type', value: 'step_type' },
    { label: 'Agent Specific', value: 'agent_specific' },
  ];

  levels = [
    { key: 'L1', labelEn: 'Human-Led', labelAr: 'بقيادة بشرية', icon: 'pi-user' },
    { key: 'L2', labelEn: 'AI-Assisted', labelAr: 'بمساعدة الذكاء', icon: 'pi-sparkles' },
    { key: 'L3', labelEn: 'AI-Driven', labelAr: 'بقيادة الذكاء', icon: 'pi-bolt' },
  ];

  tabs: Array<{ key: SupervisorTab; labelEn: string; labelAr: string; icon: string }> = [
    { key: 'overview', labelEn: 'Overview', labelAr: 'نظرة عامة', icon: 'pi-home' },
    { key: 'notes', labelEn: 'AI Notes', labelAr: 'ملاحظات الذكاء', icon: 'pi-file' },
    { key: 'drafts', labelEn: 'Draft Actions', labelAr: 'مسودات الإجراءات', icon: 'pi-file-edit' },
    { key: 'killswitch', labelEn: 'Kill Switch', labelAr: 'مفتاح الإيقاف', icon: 'pi-power-off' },
    { key: 'rollback', labelEn: 'Rollback', labelAr: 'التراجع', icon: 'pi-undo' },
    { key: 'budget', labelEn: 'AI Budget', labelAr: 'ميزانية الذكاء', icon: 'pi-wallet' },
    { key: 'interventions', labelEn: 'Interventions', labelAr: 'التدخلات', icon: 'pi-exclamation-triangle' },
  ];

  selectedNoteIds = signal<string[]>([]);
  selectedDraftIds = signal<string[]>([]);
  showSupervisorDialog = false;
  supervisorForm = { instanceId: '', action: 'pause', reason: '' };
  supervisorActions = [
    { label: 'Pause', value: 'pause' },
    { label: 'Resume', value: 'resume' },
    { label: 'Stop', value: 'stop' },
    { label: 'Force Escalation', value: 'force_escalation' },
  ];

  ngOnInit(): void {
    this.loadAll();
    interval(30000).pipe(startWith(0), switchMap(() => this.api.getWorkflowHealth().pipe(catchError(() => of(null)))), takeUntilDestroyed(this.destroyRef)).subscribe(h => { if (h) this.health.set(h); });
    this.ws.workflowUpdates$.pipe(
      filter(u => !!u),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadAll());
  }

  loadAll(): void {
    this.loading.set(true);
    forkJoin({
      health: this.api.getWorkflowHealth().pipe(catchError(() => of(null))),
      notes: this.api.getPendingNotes().pipe(catchError(() => of({ items: [], count: 0 }))),
      drafts: this.api.getPendingDrafts().pipe(catchError(() => of({ items: [], count: 0 }))),
      ks: this.api.getActiveKillSwitches().pipe(catchError(() => of([]))),
      rb: this.api.getPendingRollbacks().pipe(catchError(() => of([]))),
      budget: this.api.getBudget().pipe(catchError(() => of(null))),
      budgetCheck: this.api.checkBudget().pipe(catchError(() => of(null))),
      interventions: this.api.getInterventionLog({ limit: 50 }).pipe(catchError(() => of([]))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      if (data.health) this.health.set(data.health as WorkflowHealthDto);
      this.pendingNotes.set(data.notes.items);
      this.pendingDrafts.set(data.drafts.items);
      this.killSwitches.set(data.ks as KillSwitchDto[]);
      this.pendingRollbacks.set(data.rb as RollbackLogDto[]);
      if (data.budget) this.budget.set(data.budget as AIBudgetDto);
      if (data.budgetCheck) this.budgetCheck.set(data.budgetCheck as BudgetCheckDto);
      this.interventions.set(data.interventions as InterventionLogDto[]);
      this.loading.set(false);
    });
  }

  loadTabData(tab: SupervisorTab): void {
    if (tab === 'notes') this.loadPendingNotes();
    else if (tab === 'drafts') this.loadPendingDrafts();
    else if (tab === 'killswitch') this.loadKillSwitches();
    else if (tab === 'rollback') this.loadPendingRollbacks();
    else if (tab === 'budget') this.loadBudget();
    else if (tab === 'interventions') this.loadInterventions();
  }

  loadPendingNotes(): void { this.api.getPendingNotes().pipe(catchError(() => of({ items: [], count: 0 }))).subscribe(r => this.pendingNotes.set(r.items)); }
  loadPendingDrafts(): void { this.api.getPendingDrafts().pipe(catchError(() => of({ items: [], count: 0 }))).subscribe(r => this.pendingDrafts.set(r.items)); }
  loadKillSwitches(): void { this.api.getActiveKillSwitches().pipe(catchError(() => of([]))).subscribe(r => this.killSwitches.set(r)); }
  loadPendingRollbacks(): void { this.api.getPendingRollbacks().pipe(catchError(() => of([]))).subscribe(r => this.pendingRollbacks.set(r)); }
  loadBudget(): void {
    forkJoin({ b: this.api.getBudget().pipe(catchError(() => of(null))), c: this.api.checkBudget().pipe(catchError(() => of(null))) })
      .subscribe(({ b, c }) => { if (b) this.budget.set(b as AIBudgetDto); if (c) this.budgetCheck.set(c as BudgetCheckDto); });
  }
  loadInterventions(): void { this.api.getInterventionLog({ limit: 100 }).pipe(catchError(() => of([]))).subscribe(r => this.interventions.set(r)); }

  reviewNote(note: AINoteDto, decision: 'accepted' | 'rejected' | 'modified'): void {
    this.api.reviewNote(note.note_id, decision).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `Note ${decision}` }); this.loadPendingNotes(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to review note' }),
    });
  }

  acceptDraft(draft: DraftActionDto): void {
    this.api.acceptDraft(draft.draft_id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Draft accepted' }); this.loadPendingDrafts(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to accept draft' }),
    });
  }

  showRejectDraft(draft: DraftActionDto): void { this.rejectTarget = draft; this.rejectReason = ''; this.showRejectDialog = true; }
  confirmRejectDraft(): void {
    if (!this.rejectTarget) return;
    this.api.rejectDraft(this.rejectTarget.draft_id, this.rejectReason).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Draft rejected' }); this.showRejectDialog = false; this.loadPendingDrafts(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to reject draft' }),
    });
  }

  convertDraft(draft: DraftActionDto): void {
    this.api.convertDraft(draft.draft_id, {}).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Draft converted to action' }); this.loadPendingDrafts(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to convert draft' }),
    });
  }

  activateKillSwitch(): void {
    this.api.activateKillSwitch({ scope: this.killSwitchForm.scope, reason: this.killSwitchForm.reason }).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: 'Kill switch activated' }); this.showKillSwitchDialog = false; this.killSwitchForm = { scope: 'all_autonomous', reason: '' }; this.loadKillSwitches(); this.loadAll(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to activate kill switch' }),
    });
  }

  deactivateKillSwitch(ks: KillSwitchDto): void {
    this.api.deactivateKillSwitch(ks.switch_id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Kill switch deactivated' }); this.loadKillSwitches(); this.loadAll(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to deactivate kill switch' }),
    });
  }

  executeRollback(rb: RollbackLogDto): void {
    this.api.executeRollback(rb.rollback_id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Rollback executed' }); this.loadPendingRollbacks(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to execute rollback' }),
    });
  }

  acknowledgeIntervention(iv: InterventionLogDto): void {
    this.api.acknowledgeIntervention(iv.intervention_id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Intervention acknowledged' }); this.loadInterventions(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to acknowledge' }),
    });
  }

  noteTypeSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' {
    return type === 'warning' ? 'danger' : type === 'coaching' ? 'warning' : type === 'recommendation' ? 'success' : 'info';
  }
  trustSeverity(level: string): 'success' | 'info' | 'warning' {
    return level === 'authoritative' ? 'success' : level === 'advisory' ? 'warning' : 'info';
  }
  rollbackStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    return status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'in_progress' ? 'warning' : 'info';
  }
  interventionSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' {
    return type === 'kill_switch_activated' || type === 'forbidden_action_attempted' ? 'danger' : type === 'budget_exceeded' || type === 'confidence_below_threshold' ? 'warning' : 'info';
  }

  summarizeContent(content: Record<string, unknown> | null): string {
    if (!content) return '—';
    const str = JSON.stringify(content);
    return str.length > 120 ? str.slice(0, 120) + '…' : str;
  }

  formatDuration(ms: number): string {
    if (!ms) return '0s';
    if (ms < 60000) return Math.round(ms / 1000) + 's';
    if (ms < 3600000) return Math.round(ms / 60000) + 'm';
    return (ms / 3600000).toFixed(1) + 'h';
  }

  batchAcceptNotes(): void {
    const ids = this.selectedNoteIds();
    if (!ids.length) return;
    this.api.batchAction({ action: 'review_note', ids, decision: 'accepted' }).subscribe({
      next: (r) => { this.msg.add({ severity: 'success', summary: `${r.succeeded} notes accepted` }); this.selectedNoteIds.set([]); this.loadPendingNotes(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Batch failed' }),
    });
  }

  batchRejectNotes(): void {
    const ids = this.selectedNoteIds();
    if (!ids.length) return;
    this.api.batchAction({ action: 'review_note', ids, decision: 'rejected' }).subscribe({
      next: (r) => { this.msg.add({ severity: 'success', summary: `${r.succeeded} notes rejected` }); this.selectedNoteIds.set([]); this.loadPendingNotes(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Batch failed' }),
    });
  }

  batchAcceptDrafts(): void {
    const ids = this.selectedDraftIds();
    if (!ids.length) return;
    this.api.batchAction({ action: 'accept_draft', ids }).subscribe({
      next: (r) => { this.msg.add({ severity: 'success', summary: `${r.succeeded} drafts accepted` }); this.selectedDraftIds.set([]); this.loadPendingDrafts(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Batch failed' }),
    });
  }

  batchRejectDrafts(): void {
    const ids = this.selectedDraftIds();
    if (!ids.length) return;
    this.api.batchAction({ action: 'reject_draft', ids, reason: 'Batch rejected by supervisor' }).subscribe({
      next: (r) => { this.msg.add({ severity: 'success', summary: `${r.succeeded} drafts rejected` }); this.selectedDraftIds.set([]); this.loadPendingDrafts(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Batch failed' }),
    });
  }

  openSupervisorAction(): void {
    this.supervisorForm = { instanceId: '', action: 'pause', reason: '' };
    this.showSupervisorDialog = true;
  }

  executeSupervisorAction(): void {
    if (!this.supervisorForm.instanceId || !this.supervisorForm.reason) return;
    this.api.supervisorAction(this.supervisorForm.instanceId, {
      action: this.supervisorForm.action, reason: this.supervisorForm.reason,
    }).subscribe({
      next: (r) => { this.msg.add({ severity: 'success', summary: `Instance ${r.action}: ${r.status}` }); this.showSupervisorDialog = false; this.loadAll(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Supervisor action failed' }),
    });
  }

  batchAcknowledgeInterventions(): void {
    const ids = this.interventions().filter(i => !i.acknowledged_by).map(i => i.intervention_id);
    if (!ids.length) return;
    this.api.batchAction({ action: 'acknowledge', ids }).subscribe({
      next: (r) => { this.msg.add({ severity: 'success', summary: `${r.succeeded} interventions acknowledged` }); this.loadInterventions(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Batch failed' }),
    });
  }

  protected String = String;
}
