import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Simple toggle button for compact / expanded display mode.
 *
 * Feature: premium-dashboard-overhaul, Task 5.1
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-display-mode-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="dm-toggle"
      [class.dm-compact]="currentMode === 'compact'"
      [attr.aria-label]="currentMode === 'compact' ? 'Switch to expanded view' : 'Switch to compact view'"
      (click)="toggle()">
      <span class="dm-icon">{{ currentMode === 'compact' ? '⊞' : '⊟' }}</span>
      <span class="dm-label">{{ currentMode === 'compact' ? 'Compact' : 'Expanded' }}</span>
    </button>
  `,
  styles: [`
    /* ── Display Mode Toggle — Enterprise Glassmorphism ── */
    .dm-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px solid var(--glass-icon-border, rgba(var(--module-accent-sky-rgb), 0.18));
      border-radius: var(--radius, 12px);
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.06));
      backdrop-filter: blur(var(--glass-icon-blur, 12px));
      -webkit-backdrop-filter: blur(var(--glass-icon-blur, 12px));
      cursor: pointer;
      font-size: var(--font-size-sm);
      color: var(--text-body, #334155);
      box-shadow: var(--glass-icon-shadow, 0 4px 16px rgba(var(--module-accent-sky-rgb), 0.10));
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .dm-toggle:hover {
      background: rgba(var(--module-accent-sky-rgb), 0.12);
      border-color: rgba(var(--module-accent-sky-rgb), 0.28);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .dm-toggle:active {
      transform: translateY(0);
    }
    .dm-toggle.dm-compact {
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.08));
      border-color: var(--primary, var(--primary));
      box-shadow: var(--shadow-glow), var(--glass-icon-shadow);
    }
    .dm-icon {
      font-size: var(--font-size-md);
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.08));
      transition: all 200ms;
    }
    .dm-toggle:hover .dm-icon {
      background: rgba(var(--module-accent-sky-rgb), 0.16);
      transform: scale(1.1);
    }
    .dm-label {
      font-weight: var(--font-bold, 700);
      letter-spacing: -0.01em;
      color: var(--text-heading, #0c4a6e);
    }
  `],
})
export class DisplayModeToggleComponent {
  @Input() currentMode: 'compact' | 'expanded' = 'expanded';
  @Output() modeChanged = new EventEmitter<'compact' | 'expanded'>();

  toggle(): void {
    const next = this.currentMode === 'compact' ? 'expanded' : 'compact';
    this.modeChanged.emit(next);
  }
}
