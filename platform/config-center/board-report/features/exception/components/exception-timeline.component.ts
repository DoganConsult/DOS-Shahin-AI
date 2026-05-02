import { Component, ChangeDetectionStrategy, inject, input, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, TimelineEntry } from '../services/exception-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-timeline',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  styles: [`
    .tl-section { padding: 16px 0; }
    .tl-header { margin: 0 0 16px; font-size: var(--font-size-base); font-weight: 700; }
    .tl-list { position: relative; padding-inline-start: 24px; }
    .tl-list::before { content: ''; position: absolute; inset-inline-start: 8px; top: 0; bottom: 0; width: 2px; background: var(--surface-border); }
    .tl-item { position: relative; padding-bottom: 16px; }
    .tl-dot { position: absolute; inset-inline-start: -20px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-500); border: 2px solid var(--surface-card); }
    .tl-action { font-weight: 600; font-size: var(--font-size-xs-plus); }
    .tl-detail { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin-top: 2px; }
    .tl-time { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 2px; }
    .empty-text { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); padding: 24px; text-align: center; }
    .load-more { display: flex; justify-content: center; margin-top: 12px; }
  `],
  template: `
    <div class="tl-section">
      <h4 class="tl-header">{{ isAr ? 'سجل النشاط' : 'Activity Timeline' }} ({{ total() }})</h4>

      @if (loading() && entries().length === 0) {
        <p class="empty-text">{{ isAr ? 'جارٍ التحميل...' : 'Loading...' }}</p>
      } @else if (entries().length === 0) {
        <p class="empty-text">{{ isAr ? 'لا توجد أنشطة مسجلة' : 'No activity recorded' }}</p>
      } @else {
        <div class="tl-list">
          @for (entry of entries(); track entry.id) {
            <div class="tl-item">
              <div class="tl-dot"></div>
              <div class="tl-action">{{ entry.action }}</div>
              @if (entry.detail) { <div class="tl-detail">{{ entry.detail }}</div> }
              <div class="tl-time">{{ entry.actorName || entry.actorId }} · {{ entry.timestamp | date:'medium' }}</div>
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
export class ExceptionTimelineComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  exceptionId = input.required<string>();

  loading = signal(true);
  entries = signal<TimelineEntry[]>([]);
  total = signal(0);
  page = signal(1);

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getTimeline(this.exceptionId(), this.page()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const items = res?.data?.timeline || [];
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
