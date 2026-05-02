import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription } from 'rxjs';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceReview {
  review_id: string; evidence_id: string; reviewer_id: string;
  review_type: string; outcome: string; comments: string;
  reviewed_at: string; created_at: string;
  evidence_title: string; control_id: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-evidence-reviews',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
    CardModule, TableModule, TagModule, ButtonModule,
    DropdownModule, DialogModule, InputTextarea, AppDatePipe],
  styles: [`
    .stat-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-box { padding: 14px 20px; border-radius: var(--radius-md); background: var(--surface-card); border: 1px solid var(--surface-border); min-width: 140px; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .filter-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary); }
    .review-actions { display: flex; gap: 8px; margin-top: 16px; }
  `],
  template: `
    <app-page-shell icon="eye"
      [title]="i18n.translate('evidenceReviews.title')"
      [subtitle]="i18n.translate('evidenceReviews.subtitle')"
      [breadcrumbs]="['Dashboard', 'Evidence', 'Reviews']"
      [loading]="loading">

      <div class="stat-row">
        <div class="stat-box"><div class="stat-value">{{ reviews.length }}</div><div class="stat-label">{{ i18n.translate('evidenceReviews.totalReviews') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ acceptedCount }}</div><div class="stat-label">{{ i18n.translate('evidenceReviews.accepted') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ rejectedCount }}</div><div class="stat-label">{{ i18n.translate('evidenceReviews.rejected') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ needsRevisionCount }}</div><div class="stat-label">{{ i18n.translate('evidenceReviews.needsRevision') }}</div></div>
      </div>

      <div class="filter-row">
        <p-dropdown [options]="outcomeOptions" [(ngModel)]="filterOutcome" optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('evidenceReviews.outcome')" [showClear]="true" (onChange)="applyFilter()" />
        <p-button [label]="i18n.translate('evidenceReviews.reviewEvidence')" icon="pi pi-plus" (onClick)="showReviewDialog = true" />
      </div>

      @if (filtered.length === 0 && !loading) {
        <div class="empty-state">
          <i class="pi pi-eye" style="font-size:40px;opacity:.3;display:block;margin-bottom:12px"></i>
          {{ i18n.translate('evidenceReviews.noReviews') }}
        </div>
      }

      @if (filtered.length > 0) {
        <p-card>
          <p-table aria-label="Filtered table" [value]="filtered" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('evidenceReviews.evidenceTitle') }}</th>
                <th>{{ i18n.translate('evidenceReviews.control') }}</th>
                <th>{{ i18n.translate('evidenceReviews.outcome') }}</th>
                <th>{{ i18n.translate('evidenceReviews.reviewer') }}</th>
                <th>{{ i18n.translate('evidenceReviews.date') }}</th>
                <th>{{ i18n.translate('evidenceReviews.comments') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.evidence_title }}</td>
                <td>{{ r.control_id || '-' }}</td>
                <td>
                  <app-status-badge [status]="r.outcome" />
                  <p-tag [value]="r.outcome"
                    [severity]="r.outcome === 'accepted' ? 'success' : r.outcome === 'rejected' ? 'danger' : r.outcome === 'needs_revision' ? 'warning' : 'info'" styleClass="ms-1" />
                </td>
                <td>{{ r.reviewer_id }}</td>
                <td>{{ r.reviewed_at | appDate:'medium' }}</td>
                <td>{{ r.comments || '-' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      }

      <!-- Review dialog -->
      <p-dialog [header]="i18n.translate('evidenceReviews.submitReview')" [(visible)]="showReviewDialog" [modal]="true" [style]="{width:'480px'}">
        <div class="flex flex-column gap-3">
          <div><label>{{ i18n.translate('evidenceReviews.evidenceId') }} *</label>
            <input pInputText [(ngModel)]="newReview.evidenceId" class="w-full" placeholder="UUID" aria-label="UUID" /></div>
          <div><label>{{ i18n.translate('evidenceReviews.outcome') }} *</label>
            <p-dropdown [options]="reviewOutcomeOptions" [(ngModel)]="newReview.outcome" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          <div><label>{{ i18n.translate('evidenceReviews.comments') }}</label>
            <textarea pInputTextarea [(ngModel)]="newReview.comments" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" styleClass="p-button-text" (onClick)="showReviewDialog = false" />
          <p-button [label]="i18n.translate('common.submit')" icon="pi pi-check" (onClick)="submitReview()" [disabled]="!newReview.evidenceId || !newReview.outcome" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
})
export class EvidenceReviewsComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private readonly live = inject(GrcLiveService);
  private readonly route = inject(ActivatedRoute);
  private sub?: Subscription;

  loading = true;
  reviews: EvidenceReview[] = [];
  filtered: EvidenceReview[] = [];
  filterOutcome = '';
  showReviewDialog = false;
  newReview = { evidenceId: '', outcome: '', comments: '' };

  outcomeOptions = [
    { label: 'Accepted', value: 'accepted' }, { label: 'Rejected', value: 'rejected' },
    { label: 'Needs Revision', value: 'needs_revision' }, { label: 'Expired', value: 'expired' },
  ];
  reviewOutcomeOptions = [
    { label: 'Accept', value: 'accepted' }, { label: 'Reject', value: 'rejected' },
    { label: 'Needs Revision', value: 'needs_revision' },
  ];

  get acceptedCount() { return this.reviews.filter(r => r.outcome === 'accepted').length; }
  get rejectedCount() { return this.reviews.filter(r => r.outcome === 'rejected').length; }
  get needsRevisionCount() { return this.reviews.filter(r => r.outcome === 'needs_revision').length; }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      this.filterOutcome = p['status'] || '';
      this.loadData();
    });
    this.sub = this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.loading = true;
    let qs = this.filterOutcome ? `?status=${this.filterOutcome}` : '';
    this.apiclientSvc.get(`/evidence/reviews${qs}`).subscribe({
      next: (data: any) => { this.reviews = data.reviews || []; this.applyFilter(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  applyFilter() {
    this.filtered = this.filterOutcome
      ? this.reviews.filter(r => r.outcome === this.filterOutcome)
      : [...this.reviews];
  }

  submitReview() {
    if (!this.newReview.evidenceId || !this.newReview.outcome) return;
    this.apiclientSvc.post(`/evidence/${this.newReview.evidenceId}/review`, {
      outcome: this.newReview.outcome,
      comments: this.newReview.comments || undefined,
    }).subscribe({
      next: () => {
        this.showReviewDialog = false;
        this.newReview = { evidenceId: '', outcome: '', comments: '' };
        this.loadData();
      },
    });
  }
}
