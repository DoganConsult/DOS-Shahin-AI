import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pulse-indicator',
    imports: [CommonModule, AppDatePipe],
    template: `
    <span class="pulse-wrap" [class.error]="error || errorState" [title]="lastUpdated ? ('Updated ' + (lastUpdated | appDate:'short')) : ''">
      <span class="pulse-dot"></span>
    </span>
  `,
    styles: [`
    .pulse-wrap { display: inline-flex; align-items: center; }
    .pulse-dot {
      width: 6px; height: 6px; border-radius: var(--radius-pill);
      background: var(--green-500, var(--success));
      animation: pulse 2s ease-in-out infinite;
    }
    .pulse-wrap.error .pulse-dot,
    .pulse-wrap.error-state .pulse-dot { background: var(--red-500, var(--error)); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `]
})
export class PulseIndicatorComponent {
  @Input() lastUpdated: Date | null = null;
  @Input() error = false;
  @Input() errorState = false;
}
