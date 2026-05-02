import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabs';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

interface CoopWorkflowType {
  key: string;
  label: string;
  labelAr: string;
  icon: string;
  description: string;
  loader: () => void;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cooperative-workflows',
    imports: [CommonModule, FormsModule, GrcDataTableComponent, GrcFormFieldComponent, TableModule, TagModule, ButtonModule, TooltipModule, ToastModule, TabViewModule, DropdownModule, InputTextModule, DialogModule],
    providers: [MessageService],
    templateUrl: './cooperative-workflows.component.html',
    styleUrls: ['./cooperative-workflows.component.scss']
})
export class CooperativeWorkflowsComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);

  activeType = signal<string>('');
  activeLabel = signal('');
  detailLoading = signal(false);
  actionLoading = signal<string>('');
  items = signal<GrcRecord[]>([]);
  filteredItems = signal<GrcRecord[]>([]);
  counts = signal<Record<string, number>>({});
  searchTerm = '';

  detailDialogVisible = false;
  detailItem: GrcRecord | null = null;
  detailExtra: GrcRecord | null = null;

  addAuditItemVisible = false;
  addAuditItemParent: GrcRecord | null = null;
  newAuditItemTitle = '';

  auditStatusVisible = false;
  auditStatusParent: GrcRecord | null = null;
  newAuditStatus = '';
  auditStatusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Ready', value: 'ready' },
    { label: 'Completed', value: 'completed' },
  ];

  workflowTypes: CoopWorkflowType[] = [
    { key: 'triage', label: 'Smart Task Triage', labelAr: 'توزيع المهام الذكي', icon: 'pi-sort-alt', description: 'AI proposes task assignments', loader: () => this.loadTriage() },
    { key: 'codraft', label: 'Co-Drafting', labelAr: 'الصياغة المشتركة', icon: 'pi-file-edit', description: 'AI + Human policy/procedure drafting', loader: () => this.loadCoDraft() },
    { key: 'evidence', label: 'Evidence Relay', labelAr: 'ترحيل الأدلة', icon: 'pi-verified', description: 'AI stages evidence for review', loader: () => this.loadEvidence() },
    { key: 'riskpair', label: 'Risk Pair Review', labelAr: 'مراجعة المخاطر الثنائية', icon: 'pi-shield', description: 'Agent + analyst dual risk scoring', loader: () => this.loadRiskPair() },
    { key: 'prescreen', label: 'Approval Pre-Screening', labelAr: 'فحص الموافقات', icon: 'pi-check-square', description: 'AI pre-screens approvals', loader: () => this.loadPreScreen() },
    { key: 'warroom', label: 'Incident War Room', labelAr: 'غرفة العمليات', icon: 'pi-exclamation-triangle', description: 'Coordinated incident response', loader: () => this.loadWarRoom() },
    { key: 'nudge', label: 'Nudge Negotiation', labelAr: 'التذكير الذكي', icon: 'pi-bell', description: 'Smart nudge feedback loop', loader: () => this.loadNudge() },
    { key: 'calibration', label: 'Score Calibration', labelAr: 'معايرة النقاط', icon: 'pi-chart-bar', description: 'Vendor score calibration', loader: () => this.loadCalibration() },
    { key: 'auditprep', label: 'Audit Prep', labelAr: 'إعداد التدقيق', icon: 'pi-list-check', description: 'AI + team audit preparation', loader: () => this.loadAuditPrep() },
    { key: 'standup', label: 'Agent Standup', labelAr: 'اجتماع الوكلاء', icon: 'pi-users', description: 'Daily AI squad briefing', loader: () => this.loadStandup() },
  ];

  ngOnInit(): void {
    this.loadCounts();
  }

  private loadCounts(): void {
    const c: Record<string, number> = {};
    // HTTP one-shot calls -- no manual cleanup needed, they self-complete
    this.operationsSvc.getTriageProposals().subscribe({ next: (r) => { c['triage'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getCoDraftSessions().subscribe({ next: (r) => { c['codraft'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getEvidenceRelayQueue().subscribe({ next: (r) => { c['evidence'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getRiskPairReviews().subscribe({ next: (r) => { c['riskpair'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getApprovalPreScreens().subscribe({ next: (r) => { c['prescreen'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getWarRooms().subscribe({ next: (r) => { c['warroom'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getNudgeNegotiations().subscribe({ next: (r) => { c['nudge'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getScoreCalibrations().subscribe({ next: (r) => { c['calibration'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getAuditPrepChecklists().subscribe({ next: (r) => { c['auditprep'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
    this.operationsSvc.getStandupDigests().subscribe({ next: (r) => { c['standup'] = this.extractCount(r); this.counts.set({ ...this.counts(), ...c }); }, error: () => {} });
  }

  private extractCount(r: GrcRecord): number {
    if (Array.isArray(r)) return r.length;
    if (r?.count != null) return r.count;
    if (r?.proposals) return r.proposals.length;
    if (r?.sessions) return r.sessions.length;
    if (r?.items) return r.items.length;
    if (r?.reviews) return r.reviews.length;
    if (r?.queue) return r.queue.length;
    if (r?.digests) return r.digests.length;
    if (r?.checklists) return r.checklists.length;
    if (r?.warRooms) return r.warRooms.length;
    if (r?.nudges) return r.nudges.length;
    if (r?.calibrations) return r.calibrations.length;
    return 0;
  }

  selectType(wf: CoopWorkflowType): void {
    this.activeType.set(wf.key);
    this.activeLabel.set(wf.label);
    this.searchTerm = '';
    wf.loader();
  }

  loadActive(): void {
    const wf = this.workflowTypes.find(w => w.key === this.activeType());
    if (wf) wf.loader();
  }

  private setItems(data: GrcRecord): void {
    let list: GrcRecord[] = [];
    if (Array.isArray(data)) list = data;
    else if (data?.proposals) list = data.proposals;
    else if (data?.sessions) list = data.sessions;
    else if (data?.items) list = data.items;
    else if (data?.reviews) list = data.reviews;
    else if (data?.queue) list = data.queue;
    else if (data?.digests) list = data.digests;
    else if (data?.checklists) list = data.checklists;
    else if (data?.warRooms) list = data.warRooms;
    else if (data?.nudges) list = data.nudges;
    else if (data?.calibrations) list = data.calibrations;
    this.items.set(list);
    this.filterItems();
    this.detailLoading.set(false);
  }

  private handleError(): void {
    this.items.set([]);
    this.filteredItems.set([]);
    this.detailLoading.set(false);
    this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadData'), life: 4000 });
  }

  filterItems(): void {
    if (!this.searchTerm) { this.filteredItems.set(this.items()); return; }
    const t = this.searchTerm.toLowerCase();
    this.filteredItems.set(this.items().filter((item) => JSON.stringify(item).toLowerCase().includes(t)));
  }

  private loadTriage(): void { this.detailLoading.set(true); this.operationsSvc.getTriageProposals().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadCoDraft(): void { this.detailLoading.set(true); this.operationsSvc.getCoDraftSessions().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadEvidence(): void { this.detailLoading.set(true); this.operationsSvc.getEvidenceRelayQueue().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadRiskPair(): void { this.detailLoading.set(true); this.operationsSvc.getRiskPairReviews().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadPreScreen(): void { this.detailLoading.set(true); this.operationsSvc.getApprovalPreScreens().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadWarRoom(): void { this.detailLoading.set(true); this.operationsSvc.getWarRooms().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadNudge(): void { this.detailLoading.set(true); this.operationsSvc.getNudgeNegotiations().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadCalibration(): void { this.detailLoading.set(true); this.operationsSvc.getScoreCalibrations().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadAuditPrep(): void { this.detailLoading.set(true); this.operationsSvc.getAuditPrepChecklists().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }
  private loadStandup(): void { this.detailLoading.set(true); this.operationsSvc.getStandupDigests().subscribe({ next: (d) => this.setItems(d), error: () => this.handleError() }); }

  getItemId(item: GrcRecord): string {
    return item.proposalId || item.sessionId || item.relayId || item.reviewId || item.preScreenId || item.warRoomId || item.feedbackId || item.calibrationId || item.checklistId || item.digestId || item.id || '—';
  }

  getItemDetail(item: GrcRecord): string {
    return item.taskTitle || item.entityType || item.controlId || item.riskId || item.incidentId || item.vendorId || item.frameworkId || item.agentName || item.summary || item.description || '—';
  }

  getItemStatus(item: GrcRecord): string {
    return item.status || item.finalMethod || 'pending';
  }

  getItemConfidence(item: GrcRecord): number {
    return item.confidenceScore ?? item.workloadScore ?? item.skillMatchScore ?? -1;
  }

  getItemDate(item: GrcRecord): string {
    const d = item.createdAt || item.generatedAt || item.created_at;
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
    switch (status) {
      case 'completed': case 'finalized': case 'accepted': case 'approved': case 'filed': case 'ready': case 'acknowledged': return 'success';
      case 'pending': case 'drafting': case 'staged': case 'agent_assessed': case 'proposed': case 'generated': return 'info';
      case 'review': case 'reviewing': case 'human_reviewing': case 'dialogue': case 'needs_review': return 'warning';
      case 'rejected': case 'abandoned': case 'failed': return 'danger';
      default: return undefined;
    }
  }

  private actionDone(label: string): void {
    this.actionLoading.set('');
    this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: label, life: 3000 });
    this.loadActive();
  }

  private actionFail(label: string): void {
    this.actionLoading.set('');
    this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: label, life: 4000 });
  }

  openDetailDialog(item: GrcRecord): void {
    this.detailItem = item;
    this.detailExtra = null;
    this.detailDialogVisible = true;
    const id = this.getItemId(item);
    const type = this.activeType();
    const detailLoaders: Record<string, () => void> = {
      codraft: () => this.operationsSvc.getCoDraftSession(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
      riskpair: () => this.operationsSvc.getRiskPairReview(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
      prescreen: () => this.operationsSvc.getPreScreenDetail(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
      warroom: () => this.operationsSvc.getWarRoom(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
      calibration: () => this.operationsSvc.getCalibrationDetail(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
      auditprep: () => this.operationsSvc.getAuditPrepChecklist(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
      standup: () => this.operationsSvc.getStandupDigest(id).subscribe({ next: (d) => { this.detailExtra = d; }, error: () => {} }),
    };
    if (detailLoaders[type]) detailLoaders[type]();
  }

  resolveTriage(item: GrcRecord, decision: string): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_' + (decision === 'accepted' ? 'accept' : 'reject'));
    this.operationsSvc.resolveTriageProposal(id, { decision }).subscribe({ next: () => this.actionDone(`Triage ${decision}`), error: () => this.actionFail('Failed to resolve triage') });
  }

  resolveCoDraft(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_resolve');
    this.operationsSvc.resolveCoDraftQuestion(id, { answer: 'resolved' }).subscribe({ next: () => this.actionDone('Co-draft resolved'), error: () => this.actionFail('Failed to resolve co-draft') });
  }

  finalizeCoDraft(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_finalize');
    this.operationsSvc.finalizeCoDraftSession(id).subscribe({ next: () => this.actionDone('Co-draft finalized'), error: () => this.actionFail('Failed to finalize co-draft') });
  }

  reviewEvidence(item: GrcRecord, decision: string): void {
    const id = this.getItemId(item);
    const suffix = decision === 'approved' ? 'approve' : decision === 'rejected' ? 'reject' : 'changes';
    this.actionLoading.set(id + '_' + suffix);
    this.operationsSvc.reviewEvidenceRelay(id, { decision, comments: `${decision} via cooperative workflows` } as any).subscribe({ next: () => this.actionDone(`Evidence ${decision}`), error: () => this.actionFail('Failed to review evidence') });
  }

  submitRiskHuman(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_submit');
    this.operationsSvc.submitHumanRiskAssessment(id, { likelihood: item.agentScore || 50, impact: 50, notes: 'Human assessment submitted' }).subscribe({ next: () => this.actionDone('Risk assessment submitted'), error: () => this.actionFail('Failed to submit assessment') });
  }

  finalizeRiskPair(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_finalize');
    this.operationsSvc.finalizeRiskPairReview(id, {}).subscribe({ next: () => this.actionDone('Risk pair finalized'), error: () => this.actionFail('Failed to finalize') });
  }

  runPreScreen(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_prescreen');
    this.operationsSvc.runPreScreen(id).subscribe({ next: () => this.actionDone('Pre-screen executed'), error: () => this.actionFail('Failed to run pre-screen') });
  }

  claimWarRoom(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_claim');
    this.operationsSvc.claimWarRoomTask(id).subscribe({ next: () => this.actionDone('War room claimed'), error: () => this.actionFail('Failed to claim') });
  }

  resolveWarRoom(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_resolve');
    this.operationsSvc.resolveWarRoom(id).subscribe({ next: () => this.actionDone('War room resolved'), error: () => this.actionFail('Failed to resolve') });
  }

  sendNudge(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_nudge');
    this.operationsSvc.createNudge({ targetUserId: id, type: 'follow-up', message: 'Follow-up nudge from cooperative workflows' }).subscribe({ next: () => this.actionDone('Nudge sent'), error: () => this.actionFail('Failed to send nudge') });
  }

  submitCalibrationItem(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_submit');
    this.operationsSvc.submitCalibration(id, { proposedScore: item.proposedScore || item.currentScore || 50 }).subscribe({ next: () => this.actionDone('Calibration submitted'), error: () => this.actionFail('Failed to submit calibration') });
  }

  acceptCalibrationItem(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_accept');
    this.operationsSvc.acceptCalibration(id).subscribe({ next: () => this.actionDone('Calibration accepted'), error: () => this.actionFail('Failed to accept calibration') });
  }

  markAuditReady(item: GrcRecord): void {
    const id = this.getItemId(item);
    const parentId = item.checklistId || id;
    this.actionLoading.set(id + '_ready');
    this.operationsSvc.markAuditPrepItemReady(parentId, id).subscribe({ next: () => this.actionDone('Marked ready'), error: () => this.actionFail('Failed to mark ready') });
  }

  openAddAuditItem(item: GrcRecord): void {
    this.addAuditItemParent = item;
    this.newAuditItemTitle = '';
    this.addAuditItemVisible = true;
  }

  confirmAddAuditItem(): void {
    if (!this.addAuditItemParent || !this.newAuditItemTitle.trim()) return;
    const parentId = this.getItemId(this.addAuditItemParent);
    this.operationsSvc.addAuditPrepItem(parentId, { title: this.newAuditItemTitle.trim() }).subscribe({
      next: () => { this.addAuditItemVisible = false; this.actionDone('Checklist item added'); },
      error: () => this.actionFail('Failed to add item'),
    });
  }

  openAuditStatusDialog(item: GrcRecord): void {
    this.auditStatusParent = item;
    this.newAuditStatus = '';
    this.auditStatusVisible = true;
  }

  confirmAuditStatus(): void {
    if (!this.auditStatusParent || !this.newAuditStatus) return;
    const id = this.getItemId(this.auditStatusParent);
    this.operationsSvc.updateAuditPrepStatus(id, { status: this.newAuditStatus }).subscribe({
      next: () => { this.auditStatusVisible = false; this.actionDone('Status updated'); },
      error: () => this.actionFail('Failed to update status'),
    });
  }

  acknowledgeStandup(item: GrcRecord): void {
    const id = this.getItemId(item);
    this.actionLoading.set(id + '_ack');
    this.operationsSvc.acknowledgeStandupDigest(id).subscribe({ next: () => this.actionDone('Standup acknowledged'), error: () => this.actionFail('Failed to acknowledge') });
  }
}
