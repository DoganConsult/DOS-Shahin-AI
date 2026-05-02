// ============================================
// AGRC-OS trailer: small strip/teaser for dashboard or workspace
// ============================================

import { Component, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-agrc-os-trailer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="agrc-trailer">
      <span class="trailer-label">AGRC-OS</span>
      <span class="trailer-text">Workspace-driven dashboards &amp; drawer</span>
      <a routerLink="/agrc-dashboard/big_picture" class="trailer-cta">Open Big Picture</a>
    </div>
  `,
  styles: [`
    .agrc-trailer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      background: var(--surface-100, var(--surface-ice));
      border-top: 1px solid var(--surface-border, var(--border-subtle));
      font-size: var(--font-size-xs-plus);
    }
    .trailer-label { font-weight: 700; color: var(--primary); }
    .trailer-text { color: var(--text-color-secondary); }
    .trailer-cta { margin-inline-start: auto; padding: 0.25rem 0.75rem; border-radius: var(--radius-sm); background: var(--primary); color: #fff; text-decoration: none; font-weight: 500; }
    .trailer-cta:hover { opacity: 0.9; }
  `],
})
export class AgrcosTrailerComponent {}
