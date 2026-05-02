import { Component, ChangeDetectionStrategy, inject, input, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, ApprovalHistoryEntry } from '../services/exception-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-approval-history',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule],
  styles: [`
    .ah-section { padding: 16px 0; }
    .ah-header { margin: 0 0 16px; font-size: var(--font-size-base); font-weight: 700; }
    .ah-list { display: flex; flex-direction: column; gap: 8px; }
    .ah-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 14px; }
    .ah-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .ah-type { font-weight: 600; font-size: var(--font-size-xs-plus); text-transform: capitalize; }
    .ah-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .ah-comment { font-size: var(--font-size-xs-plus); margin-top: 6px; padding: 8px; background: var(--surface-50); border-radius: var(--radius-sm); }
    .empty-text { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); padding: 24px; text-align: center; }
    .st-pending { background: var(--yellow-50); color: var(--yellow-700); }
    .st-approved { background: var(--green-50); color: var(--green-700); }
    .st-rejected { background: var(--red-50); color: var(--red-700); }
    .st-delegated { background: var(--blue-50); color: var(--blue-700); }
    .st-escalated { background: var(--orange-50); color: var(--orange-700); }
    .load-more { display: flex; justify-content: center; margin-top: 12px; }
  `],
  template: `
    <div class="ah-section">
      <h4 class="ah-header">{{ isAr ? 'سجل الموافقات' : 'Approval History' }} ({{ total() }})</h4>

      @if (loading() && entries().length === 0) {
        <p class="empty-text">{{ isAr ? 'جارٍ التحميل...' : 'Loading...' }}</p>
      } @else if (entries().length === 0) {
        <p class="empty-text">{{ isAr ? 'لا يوجد سجل موافقات' : 'No approval history' }}</p>
      } @else {
        <div class="ah-list">
          @for (entry of entries(); track entry.reviewId) {
            <div class="ah-card">
              <div class="ah-row">
                <span class="ah-type">{{ entry.reviewType | titlecase }}</span>
                <p-tag [value]="entry.status" [styleClass]="'st-' + entry.status" />
              </div>
              <div class="ah-meta">
                {{ isAr ? 'طلب من' : 'Requested by' }}: {{ entry.requestedBy }} · {{ entry.requestedAt | date:'mediumDate' }}
                @if (entry.reviewedBy) { · {{ isAr ? 'مراجعة' : 'Reviewed by' }}: {{ entry.reviewedBy }} · {{ entry.reviewedAt | date:'mediumDate' }} }
              </div>
              @if (entry.comments) { <div class="ah-comment">{{ entry.comments }}</div> }
            </div>
          }
        </div>
        @if (entries().length < total()) {
          <div class="load-more">
            <p-button [label]="isAr ? 'تحميل المزيد' : 'Load More'" [outlined]="true" size="small" [loading]="loading()" (onClick)="loadMore()" />
          </div>
        }
      }
    </div>
  `,
})
export class ExceptionApprovalHistoryComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  exceptionId = input.required<string>();

  loading = signal(true);
  entries = signal<ApprovalHistoryEntry[]>([]);
  total = signal(0);
  page = signal(1);

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getApprovalHistory(this.exceptionId(), this.page()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const items = res?.data?.history || [];
        this.entries.set(this.page() === 1 ? items : [...this.entries(), ...items]);
        this.total.set(res?.data?.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore(): void {
    this.page.update(p => p + 1);
    this.load();
  }
}
