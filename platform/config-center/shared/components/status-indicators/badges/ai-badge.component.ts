import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AiBadgeVariant = 'inline' | 'block' | 'subtle';

@Component({
    selector: 'app-ai-badge',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <span class="ai-badge"
          [class.ai-badge--block]="variant === 'block'"
          [class.ai-badge--subtle]="variant === 'subtle'"
          [attr.title]="tooltip"
          role="status"
          [attr.aria-label]="ariaLabel">
      <svg *ngIf="showIcon" class="ai-badge__icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1L10 5.5L15 6.5L11.5 10L12.5 15L8 12.5L3.5 15L4.5 10L1 6.5L6 5.5L8 1Z"
              fill="currentColor" opacity="0.9"/>
      </svg>
      <span class="ai-badge__label">{{ label }}</span>
      <span *ngIf="model" class="ai-badge__model">{{ model }}</span>
    </span>
  `,
    styles: [`
    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--radius-sm, 4px);
      background: var(--primary-50, #eff6ff);
      color: var(--primary-700, #1d4ed8);
      font-size: var(--font-size-xs);
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      user-select: none;
      border: 1px solid var(--primary-100, #dbeafe);
    }

    .ai-badge--block {
      display: flex;
      padding: 6px 12px;
      border-radius: var(--radius, 6px);
      font-size: var(--font-size-sm);
    }

    .ai-badge--subtle {
      background: transparent;
      border-color: transparent;
      padding: 0 4px;
      font-size: var(--font-size-nano);
      opacity: 0.7;
    }

    .ai-badge__icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    .ai-badge--block .ai-badge__icon {
      width: 14px;
      height: 14px;
    }

    .ai-badge__model {
      opacity: 0.6;
      font-weight: 400;
      margin-inline-start: 2px;
    }

    .ai-badge__model::before {
      content: '·';
      margin-inline-end: 2px;
    }
  `]
})
export class AiBadgeComponent {
  @Input() label = 'AI';
  @Input() variant: AiBadgeVariant = 'inline';
  @Input() model = '';
  @Input() showIcon = true;
  @Input() tooltip = 'This content was generated or assisted by AI';
  @Input() ariaLabel = 'AI-generated content indicator';
}
