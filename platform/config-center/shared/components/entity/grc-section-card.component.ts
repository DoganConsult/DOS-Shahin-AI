import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'grc-section-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grc-section" [class.grc-section--flush]="flush" [class.grc-section--accent]="accent"
         [class.grc-section--elevated]="elevated" [ngClass]="styleClass">
      <div class="grc-section__header" *ngIf="title || icon">
        <div class="grc-section__title-row">
          <div class="grc-section__icon" *ngIf="icon" [ngClass]="'grc-icon--' + variant">
            <i class="pi" [ngClass]="'pi-' + icon"></i>
          </div>
          <div class="grc-section__title-block">
            <h3 class="grc-section__title">{{ title }}</h3>
            <p class="grc-section__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <div class="grc-section__actions">
          <ng-content select="[sectionActions]"></ng-content>
        </div>
      </div>
      <div class="grc-section__body" [class.grc-section__body--no-pad]="noPadBody">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .grc-section {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      box-shadow: var(--shadow-card);
      transition: border-color 150ms var(--ease-premium), box-shadow 150ms var(--ease-premium);
      overflow: hidden;
      position: relative;
    }
    .grc-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--primary);
      opacity: 0;
      transition: opacity 150ms var(--ease-premium);
    }
    .grc-section--accent::before { opacity: 1; }
    .grc-section--elevated {
      box-shadow: var(--shadow-md);
    }
    .grc-section--elevated:hover {
      box-shadow: var(--shadow-card-hover);
      border-color: var(--primary-lightest);
    }

    .grc-section__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
      gap: 16px;
    }
    .grc-section__title-row {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }
    .grc-section__icon {
      width: 42px;
      height: 42px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-lg);
      flex-shrink: 0;
      background: var(--glass-icon-bg);
      border: 1px solid var(--glass-icon-border);
      color: var(--primary);
      transition: background 150ms var(--ease-premium);
    }
    .grc-icon--success { background: rgba(var(--success-rgb), 0.06); border-color: rgba(var(--success-rgb), 0.15); color: var(--success); }
    .grc-icon--warning { background: rgba(var(--warning-rgb), 0.08); border-color: rgba(var(--warning-rgb), 0.20); color: var(--warning); }
    .grc-icon--danger  { background: rgba(var(--danger-rgb), 0.06);  border-color: rgba(var(--danger-rgb), 0.15);  color: var(--error); }
    .grc-icon--purple  { background: rgba(var(--module-accent-purple-rgb), 0.06); border-color: rgba(var(--module-accent-purple-rgb), 0.15); color: #8a3ffc; }
    .grc-icon--amber   { background: rgba(var(--color-amber-600-rgb), 0.06);  border-color: rgba(var(--color-amber-600-rgb), 0.15);  color: var(--warning); }

    .grc-section__title-block { min-width: 0; }
    .grc-section__title {
      font-size: var(--font-size-md);
      font-weight: var(--font-bold);
      color: var(--text-heading);
      margin: 0;
      line-height: 1.3;
    }
    .grc-section__subtitle {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin: 2px 0 0;
      line-height: 1.4;
    }
    .grc-section__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .grc-section__body {
      padding: 20px 24px 24px;
    }
    .grc-section__body--no-pad { padding: 0; }
    .grc-section--flush .grc-section__header { padding: 16px 20px 0; }
    .grc-section--flush .grc-section__body { padding: 16px 20px 20px; }

    @media (max-width: 768px) {
      .grc-section__header { padding: 16px 16px 0; flex-direction: column; align-items: flex-start; }
      .grc-section__body { padding: 16px; }
    }
  `]
})
export class GrcSectionCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() variant: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'amber' = 'primary';
  @Input() accent = false;
  @Input() elevated = false;
  @Input() flush = false;
  @Input() noPadBody = false;
  @Input() styleClass = '';
}
