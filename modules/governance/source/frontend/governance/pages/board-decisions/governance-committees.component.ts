import { Component, OnInit, inject, DestroyRef, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { FoundationDataService } from '@app/grc';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-committees',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, TabViewModule, RouterModule,
        ConfirmDialogModule, AppDatePipe
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './governance-committees.component.html',
    styleUrls: ['./governance-committees.component.scss']
})
export class GovernanceCommitteesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private governanceSvc = inject(GrcGovernanceService);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private msg = inject(MessageService);
  private foundationData = inject(FoundationDataService);
  private router = inject(Router);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir  = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');

  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'Add Committee', labelAr: 'إضافة لجنة', icon: 'plus', primary: true },
  ];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }

  loaded = false;
  items: GrcRecord[] = [];
  filteredItems: GrcRecord[] = [];
  searchTerm = '';
  showDialog = false;
  editMode = false;
  editId = '';
  form: GrcRecord = { name: '', purpose: '', meeting_schedule: '' };

  drawerVisible = false;
  selectedCommittee: GrcRecord | null = null;
  members: GrcRecord[] = [];
  meetings: GrcRecord[] = [];
  committeeDecisions: GrcRecord[] = [];

  showMemberDialog = false;
  memberForm: GrcRecord = { user_id: '', role_in_committee: 'member' };
  roleOptions = [
    { label: 'Chair', value: 'chair' },
    { label: 'Vice Chair', value: 'vice_chair' },
    { label: 'Secretary', value: 'secretary' },
    { label: 'Member', value: 'member' },
    { label: 'Observer', value: 'observer' },
  ];

  showMeetingDialog = false;
  meetingForm: GrcRecord = { title: '', scheduled_at: '', location: '', duration_minutes: 60 };

  charterLoading = false;
  charterText = '';

  selectedMeeting: GrcRecord | null = null;
  meetingAgendaItems: GrcRecord[] = [];
  meetingMinutes = '';
  meetingDecisions: GrcRecord[] = [];
  newAgendaTitle = '';
  newDecisionText = '';
  quorumPercentage = 50;
  meetingAttendeeCount = 0;

  ngOnInit(): void {
    this.foundationData.load();
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  resolveUser(userId: string): string {
    const user = this.foundationData.resolveUser(userId);
    return user?.displayName || user?.email || userId;
  }

  load(): void {
    this.governanceSvc.getCommittees().subscribe({
      next: (res) => { this.items = (res as any).committees || res || []; this.filterList(); this.loaded = true; },
      error: () => { this.items = []; this.filteredItems = []; this.loaded = true; },
    });
  }

  filterList(): void {
    let list = [...this.items];
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(i => (i.name || '').toLowerCase().includes(t) || (i.purpose || '').toLowerCase().includes(t));
    }
    this.filteredItems = list;
  }

  openCreate(): void {
    this.editMode = false; this.editId = '';
    this.form = { name: '', purpose: '', meeting_schedule: '' };
    this.showDialog = true;
  }

  openEdit(item: GrcRecord): void {
    this.editMode = true;
    this.editId = item.committee_id || item.id;
    this.form = { name: item.name, purpose: item.purpose || '', meeting_schedule: item.meeting_schedule || '' };
    this.showDialog = true;
  }

  save(): void {
    if (!this.form.name) return;
    const obs = this.editMode ? this.governanceSvc.updateCommittee(this.editId, this.form) : this.governanceSvc.createCommittee(this.form as any);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); },
    });
  }

  confirmDelete(item: GrcRecord): void {
    this.confirmSvc.confirm({
      message: `Delete committee "${item.name}"?`,
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.governanceSvc.deleteCommittee(item.committee_id || item.id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('governance.deleteFailed'), life: 4000 }); },
      });
      },
    });
  }

  saveCharter(): void {
    if (!this.selectedCommittee || !this.charterText) return;
    const cid = this.selectedCommittee.committee_id || this.selectedCommittee.id;
    this.governanceSvc.updateCommittee(cid, { charter_text: this.charterText } as any).subscribe({
      next: () => {
        this.selectedCommittee = { ...this.selectedCommittee, charter_text: this.charterText };
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.charterSaved'), life: 3000 });
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }),
    });
  }

  openDetail(item: GrcRecord): void {
    this.selectedCommittee = item;
    this.charterText = item.charter_text || '';
    this.drawerVisible = true;
    this.members = [];
    this.meetings = [];
    this.committeeDecisions = [];
    const id = item.committee_id || item.id;
    this.governanceSvc.getCommitteeMembers(id).subscribe({ next: (r) => { this.members = (r as any).members || []; }, error: (e) => devError("[API]", e) });
    this.governanceSvc.getCommitteeMeetings(id).subscribe({
      next: (r) => {
        this.meetings = r.meetings || [];
        this.apiclientSvc.get('/governance/decisions').subscribe({
          next: (dr) => {
            const decisions = dr.decisions || dr.data || [];
            const meetingIds = this.meetings.map((m) => m.meeting_id);
            this.committeeDecisions = decisions.filter((d) => meetingIds.includes(d.meeting_id));
          }, error: (e) => devError("[API]", e)
        });
      }, error: (e) => devError("[API]", e)
    });
  }

  addMember(): void {
    if (!this.memberForm.user_id || !this.selectedCommittee) return;
    const cid = this.selectedCommittee.committee_id || this.selectedCommittee.id;
    const isChair = this.memberForm.role_in_committee === 'chair';
    this.governanceSvc.addCommitteeMember(cid, { ...this.memberForm, is_chair: isChair } as any).subscribe({
      next: () => { this.showMemberDialog = false; this.memberForm = { user_id: '', role_in_committee: 'member' }; this.openDetail(this.selectedCommittee); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.memberAdded'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failedToAddMember'), life: 4000 }); },
    });
  }

  removeMember(m: GrcRecord): void {
    this.confirmSvc.confirm({
      message: 'Remove this member?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const cid = this.selectedCommittee.committee_id || this.selectedCommittee.id;
        this.governanceSvc.removeCommitteeMember(cid, m.member_id).subscribe({
          next: () => { this.openDetail(this.selectedCommittee); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.removed'), life: 3000 }); },
          error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
        });
      }
    });
  }

  setChair(m: GrcRecord): void {
    const cid = this.selectedCommittee.committee_id || this.selectedCommittee.id;
    this.governanceSvc.setCommitteeChair(cid, m.member_id).subscribe({
      next: () => { this.openDetail(this.selectedCommittee); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.chairUpdated'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  createMeeting(): void {
    if (!this.meetingForm.title || !this.meetingForm.scheduled_at) return;
    const cid = this.selectedCommittee.committee_id || this.selectedCommittee.id;
    this.governanceSvc.createMeeting({ committee_id: cid, ...this.meetingForm } as any).subscribe({
      next: () => { this.showMeetingDialog = false; this.meetingForm = { title: '', scheduled_at: '', location: '', duration_minutes: 60 }; this.openDetail(this.selectedCommittee); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.meetingCreated'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  deleteMeeting(m: GrcRecord): void {
    this.confirmSvc.confirm({
      message: `Delete meeting "${m.title}"?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.governanceSvc.deleteMeeting(m.meeting_id).subscribe({
          next: () => { this.openDetail(this.selectedCommittee); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.meetingDeleted'), life: 3000 }); },
          error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
        });
      }
    });
  }

  openMeetingDetail(m: GrcRecord): void {
    this.selectedMeeting = m;
    this.meetingAgendaItems = [];
    this.meetingDecisions = [];
    this.meetingMinutes = m.minutes || '';
    this.newAgendaTitle = '';
    this.newDecisionText = '';
    const mid = m.meeting_id;
    this.governanceSvc.getMeetingAgenda(mid).subscribe({ next: (r) => { this.meetingAgendaItems = (r as any).items || []; }, error: (e) => devError("[API]", e) });
    this.apiclientSvc.get('/governance/decisions').subscribe({
      next: (r) => { this.meetingDecisions = (r.decisions || []).filter((d) => d.meeting_id === mid); },
      error: (e) => devError("[API]", e)
    });
  }

  updateMeetingStatus(status: string): void {
    if (!this.selectedMeeting) return;
    this.governanceSvc.updateMeeting(this.selectedMeeting.meeting_id, { status }).subscribe({
      next: (r) => { this.selectedMeeting = { ...this.selectedMeeting, ...r, status }; this.openDetail(this.selectedCommittee); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.statusUpdated'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  addAgendaItem(): void {
    if (!this.newAgendaTitle || !this.selectedMeeting) return;
    this.governanceSvc.addAgendaItem(this.selectedMeeting.meeting_id, { title: this.newAgendaTitle }).subscribe({
      next: () => { this.newAgendaTitle = ''; this.openMeetingDetail(this.selectedMeeting); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.added'), life: 2000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  deleteAgendaItem(a: GrcRecord): void {
    this.governanceSvc.deleteAgendaItem(a.agenda_item_id).subscribe({
      next: () => { this.openMeetingDetail(this.selectedMeeting); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  saveMinutes(): void {
    if (!this.selectedMeeting) return;
    this.governanceSvc.updateMeeting(this.selectedMeeting.meeting_id, { minutes: this.meetingMinutes } as any).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.minutesSaved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  addMeetingDecision(): void {
    if (!this.newDecisionText || !this.selectedMeeting) return;
    this.governanceSvc.createDecision({ meeting_id: this.selectedMeeting.meeting_id, decision_text: this.newDecisionText } as any).subscribe({
      next: () => { this.newDecisionText = ''; this.openMeetingDetail(this.selectedMeeting); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.decisionAdded'), life: 2000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }); },
    });
  }

  getQuorumRequired(): number {
    const pct = this.selectedCommittee?.quorum_percentage || this.quorumPercentage || 50;
    return Math.ceil((this.members.length * pct) / 100);
  }

  isQuorumMet(): boolean {
    return this.meetingAttendeeCount >= this.getQuorumRequired();
  }

  saveQuorumRule(): void {
    if (!this.selectedCommittee) return;
    const cid = this.selectedCommittee.committee_id || this.selectedCommittee.id;
    this.governanceSvc.updateCommittee(cid, { quorum_percentage: this.quorumPercentage, quorum_rule: `${this.quorumPercentage}% of members` } as any).subscribe({
      next: () => {
        this.selectedCommittee = { ...this.selectedCommittee, quorum_percentage: this.quorumPercentage, quorum_rule: `${this.quorumPercentage}% of members` };
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.quorumRuleSaved'), life: 3000 });
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }),
    });
  }

  saveAttendance(): void {
    if (!this.selectedMeeting) return;
    this.governanceSvc.updateMeeting(this.selectedMeeting.meeting_id, {
      attendee_count: this.meetingAttendeeCount,
      quorum_met: this.isQuorumMet(),
    } as any).subscribe({
      next: () => {
        this.selectedMeeting = { ...this.selectedMeeting, attendee_count: this.meetingAttendeeCount, quorum_met: this.isQuorumMet() };
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.attendanceSaved'), life: 3000 });
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('governance.failed'), life: 4000 }),
    });
  }

  getEffectivenessLabel(): string {
    const total = this.meetings.length;
    if (total === 0) return this.i18n.translate('N/A');
    const completed = this.meetings.filter((m) => m.status === 'completed').length;
    const pct = Math.round((completed / total) * 100);
    if (pct >= 80) return this.i18n.translate('High');
    if (pct >= 50) return this.i18n.translate('Medium');
    return this.i18n.translate('Low');
  }

  getEffectivenessSeverity(): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const total = this.meetings.length;
    if (total === 0) return 'info';
    const completed = this.meetings.filter((m) => m.status === 'completed').length;
    const pct = Math.round((completed / total) * 100);
    if (pct >= 80) return 'success';
    if (pct >= 50) return 'warning';
    return 'danger';
  }

  navigateTo(path: string) { this.router.navigate([path]); }

}
