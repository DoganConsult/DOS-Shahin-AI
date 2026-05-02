import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AnswerHistoryEntry {
  question_code: string;
  question_label: string;
  old_value: string;
  new_value: string;
  changed_at: string;
}

@Component({
    selector: 'app-answer-history',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="history" *ngIf="entries.length > 0" [class.rtl]="lang === 'ar'">
      <div class="history-header">
        <i class="pi pi-history"></i>
        {{ lang === 'ar' ? 'سجل التغييرات' : 'Change History' }}
        <span class="history-count">{{ entries.length }}</span>
      </div>
      <div class="history-timeline">
        <div *ngFor="let e of entries; let last = last" class="history-entry">
          <div class="history-dot"></div>
          <div class="history-content">
            <span class="history-label">{{ e.question_label }}</span>
            <div class="history-change">
              <span class="history-old" *ngIf="e.old_value">{{ e.old_value }}</span>
              <i class="pi pi-arrow-right" *ngIf="e.old_value" style="font-size:0.6rem;color:var(--text-muted)"></i>
              <span class="history-new">{{ e.new_value }}</span>
            </div>
            <span class="history-time">{{ formatTime(e.changed_at) }}</span>
          </div>
          <div class="history-line" *ngIf="!last"></div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .history {
      border-top: 1px solid var(--glass-border, rgba(var(--color-gray-carbon-rgb), 0.4));
      padding: 0.75rem 1rem;
    }
    .history-header {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .history-header i { font-size: var(--font-size-sm); color: var(--primary); }
    .history-count {
      margin-inline-start: auto;
      font-size: 0.6rem; background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      color: var(--primary); padding: 0.05rem 0.3rem;
      border-radius: var(--radius-pill, 20px); font-weight: 700;
    }
    .history-timeline { display: flex; flex-direction: column; }
    .history-entry { display: flex; gap: 0.5rem; position: relative; padding-bottom: 0.5rem; }
    .history-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--primary); flex-shrink: 0; margin-top: 4px;
    }
    .history-line {
      position: absolute; left: 3.5px; top: 14px; bottom: 0;
      width: 1px; background: var(--border-subtle);
    }
    .rtl .history-line { left: auto; right: 3.5px; }
    .history-content { flex: 1; min-width: 0; }
    .history-label { font-size: 0.72rem; font-weight: 600; color: var(--text-heading); display: block; }
    .history-change {
      display: flex; align-items: center; gap: 0.25rem;
      font-size: 0.68rem; margin-top: 0.15rem;
    }
    .history-old { color: var(--text-muted); text-decoration: line-through; }
    .history-new { color: var(--primary); font-weight: 600; }
    .history-time { font-size: 0.6rem; color: var(--text-muted); display: block; margin-top: 0.1rem; }
    .rtl { direction: rtl; }
  `]
})
export class AnswerHistoryComponent {
  @Input() entries: AnswerHistoryEntry[] = [];
  @Input() lang: 'en' | 'ar' = 'en';

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString(this.lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }
}
