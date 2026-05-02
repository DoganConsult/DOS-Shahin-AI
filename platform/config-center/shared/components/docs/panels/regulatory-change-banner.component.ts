import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface RegulatoryChangeAlert {
  id: string;
  title_en: string;
  title_ar?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impacted_control_count: number;
  effective_date?: string;
  status: string;
}

/**
 * RegulatoryChangeBannerComponent
 *
 * Alert banner shown at the top of workspace home when pending
 * regulatory changes exist that affect the tenant's frameworks.
 *
 * Market differentiator: auto-detects regulatory changes and shows impact.
 */
@Component({
  selector: 'app-regulatory-change-banner',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rcb" [class.rtl]="lang === 'ar'" *ngIf="changes.length > 0 && !dismissed" role="alert" aria-live="polite">
      <div class="rcb-icon">
        <i class="pi pi-exclamation-triangle"></i>
      </div>
      <div class="rcb-content">
        <span class="rcb-title">
          {{ changes.length }}
          {{ lang === 'ar' ? 'تغيير تنظيمي يتطلب مراجعتك' : 'regulatory change(s) require your review' }}
        </span>
        <span class="rcb-detail" *ngIf="totalImpactedControls > 0">
          {{ lang === 'ar' ? 'يؤثر على' : 'Affecting' }}
          {{ totalImpactedControls }}
          {{ lang === 'ar' ? 'ضابط في بيئة عملك' : 'controls in your workspace' }}
        </span>
      </div>
      <button pButton class="p-button-sm p-button-outlined"
        [label]="lang === 'ar' ? 'مراجعة التغييرات' : 'Review Changes'"
        icon="pi pi-arrow-right" [iconPos]="lang === 'ar' ? 'left' : 'right'"
        (click)="viewDetails.emit()"></button>
      <button pButton class="p-button-sm p-button-text" icon="pi pi-times"
        [attr.aria-label]="lang === 'ar' ? 'إغلاق' : 'Dismiss'"
        (click)="dismissed = true"></button>
    </div>
  `,
  styles: [`
    .rcb {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1.25rem; margin-bottom: 1rem;
      background: var(--status-warning-bg, #fcf4d6);
      border: 1px solid rgba(var(--warning-rgb), 0.3);
      border-radius: var(--radius-lg, 12px);
      animation: rcbIn 0.3s ease both;
    }
    .rcb.rtl { direction: rtl; }

    .rcb-icon {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(var(--warning-rgb), 0.15);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rcb-icon i { font-size: var(--font-size-md); color: #946800; }

    .rcb-content { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .rcb-title { font-size: 0.88rem; font-weight: 600; color: var(--text-heading, #161616); }
    .rcb-detail { font-size: var(--font-size-caption); color: var(--text-body, #525252); }

    @keyframes rcbIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 640px) {
      .rcb { flex-wrap: wrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      .rcb { animation: none !important; }
    }
  `]
})
export class RegulatoryChangeBannerComponent {
  @Input() changes: RegulatoryChangeAlert[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() viewDetails = new EventEmitter<void>();

  dismissed = false;

  get totalImpactedControls(): number {
    return this.changes.reduce((sum, c) => sum + (c.impacted_control_count || 0), 0);
  }
}
