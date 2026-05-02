import { Component, Input, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-trust-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tb" [class.tb-highlight]="highlight" [style.border-color]="color + '33'">
      <span class="tb-code" [style.color]="color">{{ code }}</span>
      <span class="tb-label">{{ i18n.localize(label, labelAr) }}</span>
      <span class="tb-status" [style.background]="statusBg" [style.color]="statusColor">{{ status }}</span>
    </div>
  `,
  styles: [`
    /* ── Trust Badge — Enterprise Glassmorphism ── */
    .tb {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      border-radius: var(--radius-lg, 16px);
      border: 1px solid var(--glass-icon-border, rgba(var(--module-accent-sky-rgb), 0.18));
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.04));
      backdrop-filter: blur(var(--glass-icon-blur, 12px));
      -webkit-backdrop-filter: blur(var(--glass-icon-blur, 12px));
      box-shadow: var(--glass-icon-shadow, 0 4px 16px rgba(var(--module-accent-sky-rgb), 0.10));
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tb:hover {
      background: rgba(var(--module-accent-sky-rgb), 0.08);
      border-color: rgba(var(--module-accent-sky-rgb), 0.28);
      box-shadow: var(--shadow-xl);
      transform: translateY(-4px);
    }
    .tb-highlight {
      border-width: 2px;
      border-color: var(--primary, var(--primary));
      box-shadow: 0 0 0 4px rgba(var(--module-accent-sky-rgb), 0.12), var(--glass-icon-shadow);
    }
    .tb-highlight:hover {
      box-shadow: 0 0 0 4px rgba(var(--module-accent-sky-rgb), 0.18), 0 8px 28px rgba(var(--module-accent-sky-rgb), 0.14);
    }

    .tb-code {
      font-size: var(--font-size-sm);
      font-weight: var(--font-black, 800);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .tb-label {
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--text-muted, #5e6e80);
      text-align: center;
      line-height: 1.5;
    }

    .tb-status {
      font-size: var(--font-size-xs);
      font-weight: var(--font-bold, 700);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 4px 14px;
      border-radius: var(--radius-pill, 99px);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: 1px solid rgba(var(--color-black-rgb), 0.06);
    }
  `],
})
export class TrustBadgeComponent {
  @Input() code = '';
  @Input() label = '';
  @Input() labelAr = '';
  @Input() color = '';
  @Input() status: 'ready' | 'aligned' | 'certified' = 'aligned';
  @Input() highlight = false;

  i18n = inject(I18nService);

  get statusBg(): string {
    return { ready: '#dcfce7', aligned: '#e0f2fe', certified: '#f3e8ff' }[this.status] || '#e0f2fe';
  }
  get statusColor(): string {
    return { ready: '#15803d', aligned: '#0369a1', certified: '#7c3aed' }[this.status] || '#0369a1';
  }
}
