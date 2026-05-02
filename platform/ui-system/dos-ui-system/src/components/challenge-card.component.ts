import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-challenge-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-metric-card">
      <span class="dos-metric-card__label">{{ category }}</span>
      <strong class="dos-metric-card__value">{{ title }}</strong>
      <p class="dos-page-header__description">{{ description }}</p>
      <div class="dos-stack-h">
        <button type="button" class="dos-command-bar__btn" (click)="dismiss.emit()">{{ dismissLabel }}</button>
        <button type="button" class="dos-command-bar__btn dos-command-bar__btn--primary" (click)="accept.emit()">
          {{ acceptLabel }}
        </button>
      </div>
    </article>
  `,
})
export class DosChallengeCardComponent {
  @Input() category = '';
  @Input() title = '';
  @Input() description = '';
  @Input() acceptLabel = 'Accept';
  @Input() dismissLabel = 'Dismiss';
  @Output() accept = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
}
