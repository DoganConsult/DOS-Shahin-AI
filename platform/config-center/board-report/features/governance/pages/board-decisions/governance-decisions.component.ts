import { Component, OnInit, inject, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { devError } from '../../../core/utils/dev-logger';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-decisions',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, TabViewModule, RouterModule, AppDatePipe,
    ],
    providers: [MessageService],
    templateUrl: './governance-decisions.component.html',
    styleUrls: ['./governance-decisions.component.scss']
})
export class GovernanceDecisionsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private governanceSvc = inject(GrcGovernanceService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  private router = inject(Router);

  readonly dir  = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'Add Decision', labelAr: 'إضافة قرار', icon: 'plus', primary: true },
  ];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }

  readonly doaMatrix = [
    { type: 'Strategic Resolution', typeAr: 'قرار استراتيجي',    level: 'Board / CEO',         levelAr: 'مجلس الإدارة / الرئيس', quorum: '75%' },
    { type: 'Policy Approval',      typeAr: 'اعتماد سياسة',       level: 'CISO / Compliance',   levelAr: 'مدير الأمن / الامتثال', quorum: '60%' },
    { type: 'Budget Decision',      typeAr: 'قرار ميزانية',        level: 'CFO + Department Head',levelAr: 'المدير المالي + رئيس القسم', quorum: '2/2' },
    { type: 'Operational Directive',typeAr: 'توجيه تشغيلي',        level: 'Department Head',     levelAr: 'رئيس القسم',            quorum: '50%' },
    { type: 'Exception Waiver',     typeAr: 'استثناء / إعفاء',     level: 'Risk Owner + CISO',   levelAr: 'مالك المخاطر + مدير الأمن', quorum: '2/2' },
    { type: 'Audit Remediation',    typeAr: 'معالجة تدقيق',        level: 'Audit Committee',     levelAr: 'لجنة التدقيق',          quorum: '50%' },
  ];

  loading = true;
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  searchTerm = '';
  statusFilter = '';

  approvedCount = 0;
  pendingCount = 0;
  draftCount = 0;

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending Vote', value: 'pending_vote' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Implemented', value: 'implemented' },
  ];

  drawerVisible = false;
  selectedDecision: Record<string, any> | null = null;
  votes: Record<string, any>[] = [];
  votesLoading = false;
  forCount = 0;
  againstCount = 0;
  abstainCount = 0;

  voteForm: Record<string, any> = { vote: '', comments: '' };
  voteOptions = [
    { label: 'For', value: 'for' },
    { label: 'Against', value: 'against' },
    { label: 'Abstain', value: 'abstain' },
  ];

  totalEligible = 0;
  quorumPct = 50;
  quorumMet = false;

  showCreateDialog = false;
  createForm: Record<string, any> = { decision_text: '', meeting_id: '', committee_id: '', decision_type: 'resolution', effective_date: '' };

  committeeOptions: { label: string; value: string }[] = [];
  meetingOptions: { label: string; value: string }[] = [];
  private committeesCache: Record<string, any>[] = [];
  decisionTypeOptions = [
    { label: 'Resolution', value: 'resolution' },
    { label: 'Directive', value: 'directive' },
    { label: 'Recommendation', value: 'recommendation' },
  ];

  ngOnInit(): void {
    this.loadDecisions();
    this.loadCommittees();
  }

  loadCommittees(): void {
    this.governanceSvc.getCommittees().subscribe({
      next: (res: Record<string, any>) => {
        this.committeesCache = res.committees || res || [];
        this.committeeOptions = this.committeesCache.map((c: Record<string, any>) => ({
          label: c.name,
          value: c.committee_id || c.id,
        }));
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  onCommitteeChange(event: Record<string, any>): void {
    const committeeId = event.value;
    this.createForm.meeting_id = '';
    this.meetingOptions = [];
    if (!committeeId) return;
    this.governanceSvc.getCommitteeMeetings(committeeId).subscribe({
      next: (res: Record<string, any>) => {
        const meetings = res.meetings || res || [];
        this.meetingOptions = meetings.map((m: Record<string, any>) => ({
          label: `${m.title || 'Meeting'} — ${m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString() : ''}`,
          value: m.meeting_id || m.id,
        }));
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  loadDecisions(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/decisions').subscribe({
      next: (res: Record<string, any>) => {
        this.items = res.decisions || res.data || [];
        this.computeHealth();
        this.filterList();
        this.loading = false;
      },
      error: () => { this.items = []; this.filteredItems = []; this.loading = false; },
    });
  }

  computeHealth(): void {
    this.approvedCount = this.items.filter(d => d.status === 'approved' || d.status === 'implemented').length;
    this.pendingCount = this.items.filter(d => d.status === 'pending_vote').length;
    this.draftCount = this.items.filter(d => d.status === 'draft').length;
  }

  filterList(): void {
    let list = [...this.items];
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(i => (i.decision_text || '').toLowerCase().includes(t) || (i.committee_name || '').toLowerCase().includes(t));
    }
    if (this.statusFilter) {
      list = list.filter(i => i.status === this.statusFilter);
    }
    this.filteredItems = list;
  }

  openDetail(item: Record<string, any>): void {
    this.selectedDecision = item;
    this.drawerVisible = true;
    this.votes = [];
    this.forCount = 0;
    this.againstCount = 0;
    this.abstainCount = 0;
    this.voteForm = { vote: '', comments: '' };
    this.votesLoading = true;
    this.governanceSvc.getDecisionVotes(item.decision_id).subscribe({
      next: (r: Record<string, any>) => {
        this.votes = r.votes || [];
        this.forCount = this.votes.filter((v: Record<string, any>) => v.vote === 'for').length;
        this.againstCount = this.votes.filter((v: Record<string, any>) => v.vote === 'against').length;
        this.abstainCount = this.votes.filter((v: Record<string, any>) => v.vote === 'abstain').length;
        this.totalEligible = r.total_eligible || this.votes.length || 1;
        this.quorumMet = this.votes.length >= Math.ceil(this.totalEligible * (this.quorumPct / 100));
        this.votesLoading = false;
      },
      error: () => { this.votesLoading = false; },
    });
  }

  castVote(): void {
    if (!this.voteForm.vote || !this.selectedDecision) return;
    this.governanceSvc.castDecisionVote(this.selectedDecision.decision_id, this.voteForm as any).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.voteRecorded'), life: 3000 });
        this.openDetail(this.selectedDecision);
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.voteFailed'), life: 4000 }); },
    });
  }

  openCreate(): void {
    this.createForm = { decision_text: '', meeting_id: '', decision_type: 'resolution' };
    this.showCreateDialog = true;
  }

  createDecision(): void {
    if (!this.createForm.decision_text || !this.createForm.meeting_id) return;
    this.governanceSvc.createDecision(this.createForm as any).subscribe({
      next: () => { this.showCreateDialog = false; this.loadDecisions(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.decisionCreated'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  changeDecisionStatus(status: string): void {
    if (!this.selectedDecision) return;
    this.governanceSvc.updateDecision(this.selectedDecision.decision_id, { status }).subscribe({
      next: () => {
        this.selectedDecision = { ...this.selectedDecision, status };
        this.loadDecisions();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.statusUpdated'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  implStatusOptions = [
    { label: 'Not Started', value: 'not_started' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Delayed', value: 'delayed' },
    { label: 'Completed', value: 'completed' },
    { label: 'Verified', value: 'verified' },
  ];
  implForm: Record<string, any> = { status: '', pct: 0, note: '' };

  updateImplementation(): void {
    if (!this.selectedDecision || !this.implForm.status) return;
    this.apiclientSvc.put(`/governance/decisions/${this.selectedDecision.decision_id}`, {
      implementation_status: this.implForm.status,
      implementation_pct: this.implForm.pct,
      implementation_note: this.implForm.note,
    }).subscribe({
      next: () => {
        this.selectedDecision = { ...this.selectedDecision, implementation_status: this.implForm.status, implementation_pct: this.implForm.pct };
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.implementationUpdated'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  navigateTo(path: string) { this.router.navigate([path]); }

}
