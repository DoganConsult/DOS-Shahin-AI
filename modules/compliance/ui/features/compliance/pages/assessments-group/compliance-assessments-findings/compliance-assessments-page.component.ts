import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-assessments-page',
  imports: [],
    providers: [],
    templateUrl: './compliance-assessments-page.component.html',
    styleUrls: ['./compliance-assessments-page.component.scss']
})
export class ComplianceAssessmentsPageComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private msg = inject(MessageService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  loading = signal(true);
  /** Set when load fails so we show "Failed to load" + retry */
  loadError = signal<string | null>(null);
  allAssessments = signal<GrcRecord[]>([]);
  selectedAssessment = signal<GrcRecord | null>(null);
  assessmentItems = signal<GrcRecord[]>([]);
  foundationUsers = signal<GrcRecord[]>([]);

  statusFilter = '';
  frameworkFilter = '';
  showCreateDialog = false;
  showRejectDialog = false;
  newTitle = '';
  newFrameworkId = '';
  reviewerInput = '';
  rejectNotes = '';
  rejectTarget: GrcRecord | null = null;

  frameworkOptions = computed(() => {
    const fws = new Set<string>();
    this.allAssessments().forEach(a => { if (a.framework_id || a.frameworkId) fws.add(a.framework_id || a.frameworkId); });
    return Array.from(fws);
  });

  filtered = computed(() => {
    let list = this.allAssessments();
    if (this.statusFilter) list = list.filter(a => a.status === this.statusFilter);
    if (this.frameworkFilter) list = list.filter(a => (a.framework_id || a.frameworkId) === this.frameworkFilter);
    return list;
  });

  exportData = computed(() => this.filtered().map(a => ({
    title: a.title,
    framework: a.framework_id || a.frameworkId || '',
    status: a.status,
    score: a.score ?? '',
    created: a.created_at || '',
  })));

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['status']) this.statusFilter = qp['status'];
    if (qp['frameworkId']) this.frameworkFilter = qp['frameworkId'];
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(u => this.foundationUsers.set(u));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    this.api.getAssessmentHistory().pipe(catchError(() => {
      this.loadError.set(failMsg);
      return of([]);
    })).subscribe(data => {
      const list = Array.isArray(data) ? data : [];
      this.allAssessments.set(list.map((a) => ({
        ...a,
        assessment_id: a.assessment_id || a.assessmentId,
        framework_id: a.framework_id || a.frameworkId,
        created_at: a.created_at || a.createdAt,
      })));
      this.loading.set(false);
    });
  }

  countByStatus(status: string): number {
    return this.allAssessments().filter(a => a.status === status).length;
  }

  filterByStatus(status: string): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.applyFilters();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.frameworkFilter = '';
    this.applyFilters();
  }

  applyFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.statusFilter || null, frameworkId: this.frameworkFilter || null },
      queryParamsHandling: 'merge',
    });
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  openDetail(a: GrcRecord): void {
    this.selectedAssessment.set(a);
    this.assessmentItems.set([]);
    this.apiclientSvc.get(`/assessments/${a.assessment_id}/items`).pipe(catchError(() => of([]))).subscribe(items => {
      this.assessmentItems.set(Array.isArray(items) ? items : []);
    });
  }

  closeDetail(): void {
    this.selectedAssessment.set(null);
    this.assessmentItems.set([]);
  }

  createAssessment(): void {
    if (!this.newTitle || !this.newFrameworkId) return;
    this.apiclientSvc.post('/assessments', { title: this.newTitle, frameworkId: this.newFrameworkId }).pipe(catchError(() => of(null))).subscribe(result => {
      if (result) {
        this.showCreateDialog = false;
        this.newTitle = '';
        this.newFrameworkId = '';
        this.load();
      }
    });
  }

  startAssessment(a: GrcRecord): void {
    this.apiclientSvc.put(`/assessments/${a.assessment_id}`, { status: 'in_progress' }).pipe(catchError(() => of(null))).subscribe(() => this.load());
  }

  completeAssessment(a: GrcRecord): void {
    this.apiclientSvc.get(`/assessments/${a.assessment_id}/score`).pipe(catchError(() => of(null))).subscribe(() => {
      this.apiclientSvc.put(`/assessments/${a.assessment_id}`, { status: 'completed' }).pipe(catchError(() => of(null))).subscribe(() => this.load());
    });
  }

  deleteAssessment(a: GrcRecord): void {
    this.apiclientSvc.del(`/assessments/${a.assessment_id}`).pipe(catchError(() => of(null))).subscribe(() => this.load());
  }

  assignReviewer(): void {
    const a = this.selectedAssessment();
    if (!a || !this.reviewerInput) return;
    this.api.assignReviewer(a.assessment_id, { reviewerId: this.reviewerInput }).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToAssignReviewer') }); return of(null); })
    ).subscribe(result => {
      if (result) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.assigned'), detail: this.i18n.translate('common.reviewerAssigned') });
        this.reviewerInput = '';
        this.closeDetail();
        this.load();
      }
    });
  }

  submitForReview(a: GrcRecord): void {
    this.api.submitForReview(a.assessment_id).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToSubmitForReview') }); return of(null); })
    ).subscribe(r => { if (r) { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.submitted'), detail: this.i18n.translate('common.submittedForReview') }); this.load(); } });
  }

  approveAssessment(a: GrcRecord): void {
    this.api.approveAssessment(a.assessment_id, {}).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToApprove') }); return of(null); })
    ).subscribe(r => { if (r) { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.approved'), detail: this.i18n.translate('common.assessmentApproved') }); this.load(); } });
  }

  openRejectDialog(a: GrcRecord): void {
    this.rejectTarget = a;
    this.rejectNotes = '';
    this.showRejectDialog = true;
  }

  rejectAssessment(): void {
    if (!this.rejectTarget || !this.rejectNotes) return;
    this.api.rejectAssessment(this.rejectTarget.assessment_id, { notes: this.rejectNotes }).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.rejectFailed') }); return of(null); })
    ).subscribe(r => {
      if (r) {
        this.msg.add({ severity: 'info', summary: this.i18n.translate('common.reject'), detail: this.i18n.translate('common.assessmentRejected') });
        this.showRejectDialog = false;
        this.rejectTarget = null;
        this.rejectNotes = '';
        this.load();
      }
    });
  }

  viewAuditLog(): void {
    const a = this.selectedAssessment();
    if (!a) return;
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'assessment', entityId: a.assessment_id } });
  }
}
