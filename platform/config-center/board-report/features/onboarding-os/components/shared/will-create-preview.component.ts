import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilingualPipe } from './bilingual.pipe';

export interface WillCreateItem {
  icon: string;
  labelEn: string;
  labelAr: string;
  count?: number;
}

@Component({
    selector: 'app-will-create-preview',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, BilingualPipe],
    template: `
    <div class="will-create" *ngIf="items.length > 0" [class.rtl]="lang === 'ar'">
      <span class="will-create-label">
        <i class="pi pi-sparkles"></i>
        {{ { en: 'Shahin will create:', ar: 'شاهين سينشئ:' } | bilingual:lang }}
      </span>
      <div class="will-create-items">
        <span *ngFor="let item of items" class="wc-item">
          <i class="pi" [ngClass]="item.icon"></i>
          <span *ngIf="item.count">{{ item.count }}×</span>
          {{ { en: item.labelEn, ar: item.labelAr } | bilingual:lang }}
        </span>
      </div>
    </div>
  `,
    styles: [`
    .will-create {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
      padding: 0.6rem 0.8rem; border-radius: var(--radius);
      background: rgba(var(--primary-rgb), 0.04); border: 1px solid rgba(var(--primary-rgb), 0.12);
      font-size: var(--font-size-sm); color: var(--text-secondary);
      animation: wc-fade 0.4s ease both;
    }
    .will-create-label { font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
    .will-create-items { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .wc-item {
      display: inline-flex; align-items: center; gap: 0.2rem;
      background: var(--surface-card, #fff); border-radius: var(--radius-xs); padding: 0.15rem 0.45rem;
      border: 1px solid var(--border-subtle, #e5e7eb); font-weight: 500;
    }
    .wc-item i { font-size: var(--font-size-xs); color: var(--primary); }
    .rtl { direction: rtl; }
    @keyframes wc-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class WillCreatePreviewComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() items: WillCreateItem[] = [];
}
