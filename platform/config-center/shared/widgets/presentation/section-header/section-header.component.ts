import { Component, Input, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-section-header',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="sh-wrap">
      <span class="sh-badge">
        <i *ngIf="badgeIcon" class="pi" [ngClass]="badgeIcon"></i>
        {{ i18n.localize(badge, badgeAr) }}
      </span>
      <h2 class="sh-title">{{ i18n.localize(title, titleAr) }}</h2>
      <p class="sh-subtitle">{{ i18n.localize(subtitle, subtitleAr) }}</p>
    </div>
  `,
    styles: [`
    /* ── Section Header — Enterprise Glassmorphism ── */
    .sh-wrap {
      text-align: center;
      margin-bottom: var(--space-2xl);
    }

    .sh-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-sm) var(--space-xl);
      border-radius: var(--radius-pill);
      background: var(--glass-icon-bg, color-mix(in srgb, var(--primary) 8%, transparent));
      border: 1px solid var(--glass-icon-border, color-mix(in srgb, var(--primary) 18%, transparent));
      box-shadow: var(--glass-icon-shadow, 0 var(--space-xs) var(--space-md) color-mix(in srgb, var(--primary) 10%, transparent));
      backdrop-filter: blur(var(--glass-icon-blur, 12px));
      -webkit-backdrop-filter: blur(var(--glass-icon-blur, 12px));
      color: var(--primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-black, 800);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: var(--space-lg);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sh-badge:hover {
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      border-color: color-mix(in srgb, var(--primary) 28%, transparent);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .sh-badge i {
      font-size: var(--font-size-base);
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }

    .sh-title {
      font-size: clamp(22px, 3.2vw, 32px);
      font-weight: var(--font-black, 800);
      color: var(--text-heading);
      margin: 0 0 var(--space-md);
      letter-spacing: -0.02em;
      line-height: 1.22;
      text-wrap: balance;
      overflow-wrap: anywhere;
    }
    :host-context([dir="rtl"]) .sh-title { line-height: 1.4; letter-spacing: 0; }

    .sh-subtitle {
      font-size: clamp(15px, 1.4vw, 18px);
      color: var(--text-muted);
      max-width: 768px;
      margin: 0 auto;
      line-height: 1.7;
      text-wrap: pretty;
    }
    :host-context([dir="rtl"]) .sh-subtitle { line-height: 1.9; }

    @media (max-width: 768px) {
      .sh-badge { padding: var(--space-xs) var(--space-md); font-size: var(--font-size-xs); }
    }
  `]
})
export class SectionHeaderComponent {
  @Input() badge = '';
  @Input() badgeAr = '';
  @Input() badgeIcon = '';
  @Input() title = '';
  @Input() titleAr = '';
  @Input() subtitle = '';
  @Input() subtitleAr = '';

  i18n = inject(I18nService);
}
