import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, ExceptionRequestDto } from '../services/exception-api.service';
import { EmptyStateComponent } from '@app/shared/components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  styles: [`
    .approvals-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .approval-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 18px; margin-bottom: 10px; }
    .approval-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .approval-title { font-weight: 600; font-size: 0.9375rem; }
    .status-badge { padding: 3px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 600; background: var(--yellow-50); color: var(--yellow-700); }
    .approval-meta { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin-bottom: 12px; }
    .approval-actions { display: flex; gap: 8px; align-items: flex-start; }
    .btn { padding: 6px 14px; border-radius: var(--radius); border: none; font-size: var(--font-size-xs-plus); cursor: pointer; font-weight: 500; }
    .btn-approve { background: var(--green-500); color: #fff; }
    .btn-reject { background: var(--red-500); color: #fff; }
    .reject-form { display: flex; flex-direction: column; gap: 6px; }
    .reject-input { padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs-plus); min-width: 240px; resize: vertical; }
    .reject-error { font-size: var(--font-size-2xs); color: var(--red-500); }
  `],
  template: `
    <div class="approvals-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('exception.approvals') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (pendingItems().length === 0) {
        <app-empty-state variant="default" title="No pending approvals" description="All exception approvals are up to date." [dir]="i18n.direction()" />
      } @else {
        @for (item of pendingItems(); track item.id) {
          <div class="approval-card">
            <div class="approval-header">
              <span class="approval-title">{{ item.title }}</span>
              <span class="status-badge">{{ item.status }}</span>
            </div>
            <div class="approval-meta">
              <span>Requester: {{ item.requesterName }}</span> ·
              <span>Risk: {{ item.riskLevel }}</span> ·
              <span>{{ item.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="approval-actions">
              <button class="btn btn-approve" (click)="approve(item.id)">Approve</button>
              @if (rejectingId() === item.id) {
                <div class="reject-form">
                  <textarea class="reject-input" rows="2" [placeholder]="i18n.translate('exception.rejectReasonPlaceholder')" [(ngModel)]="rejectReason"></textarea>
                  @if (rejectError()) { <span class="reject-error">{{ rejectError() }}</span> }
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-reject" (click)="confirmReject(item.id)">Confirm Reject</button>
                    <button class="btn" (click)="cancelReject()">Cancel</button>
                  </div>
                </div>
              } @else {
                <button class="btn btn-reject" (click)="startReject(item.id)">Reject</button>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ExceptionApprovalsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  pendingItems = signal<ExceptionRequestDto[]>([]);
  rejectingId = signal<string | null>(null);
  rejectReason = '';
  rejectError = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.list({ status: 'submitted' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.pendingItems.set(res.data || []); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  approve(id: string): void {
    this.api.approve(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  startReject(id: string): void {
    this.rejectingId.set(id);
    this.rejectReason = '';
    this.rejectError.set(null);
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectReason = '';
    this.rejectError.set(null);
  }

  confirmReject(id: string): void {
    const reason = this.rejectReason.trim();
    if (!reason) {
      this.rejectError.set('A rejection reason is required.');
      return;
    }
    if (reason.length > 2000) {
      this.rejectError.set('Reason must not exceed 2000 characters.');
      return;
    }
    this.rejectError.set(null);
    this.api.reject(id, reason).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cancelReject();
      this.load();
    });
  }
}
