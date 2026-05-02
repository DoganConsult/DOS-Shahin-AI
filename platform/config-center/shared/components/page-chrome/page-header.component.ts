import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icon.component';

export interface PageHeaderAction {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  primary?: boolean;
  route?: string;
  chip?: boolean;
  severity?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-page-header',
    imports: [CommonModule, RouterModule, IconComponent],
    template: `
    <div class="ph-root" [attr.dir]="dir">
      <div class="ph-breadcrumbs" *ngIf="breadcrumbs.length > 1">
        <ng-container *ngFor="let crumb of breadcrumbs; let last = last; let i = index">
          <span class="ph-crumb" [class.ph-crumb-active]="last">{{ crumb }}</span>
          <app-icon name="chevron_right" type="ui" size="xs" *ngIf="!last" />
        </ng-container>
      </div>

      <div class="ph-main">
        <div class="ph-identity">
          <div class="ph-icon-wrap" *ngIf="icon">
            <app-icon [name]="icon" type="route" size="lg" />
          </div>
          <div class="ph-text">
            <h1 class="ph-title">{{ isAr ? titleAr : titleEn }}</h1>
            <p class="ph-subtitle" *ngIf="subtitleEn || subtitleAr">{{ isAr ? subtitleAr : subtitleEn }}</p>
          </div>
        </div>

        <div class="ph-actions" *ngIf="actions.length > 0">
          <ng-container *ngFor="let a of actions">
            <span tabindex="0" role="button" (keyup.enter)="actionClick.emit(a.id)" *ngIf="a.chip" class="ph-chip" (click)="actionClick.emit(a.id)">
              <app-icon [name]="a.icon" type="action" size="xs" />
              {{ isAr ? a.labelAr : a.labelEn }}
            </span>
            <button *ngIf="!a.chip"
              class="ph-action-btn"
              [class.ph-action-primary]="a.primary"
              (click)="actionClick.emit(a.id)">
              <app-icon [name]="a.icon" type="action" size="sm" />
              <span>{{ isAr ? a.labelAr : a.labelEn }}</span>
            </button>
          </ng-container>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .ph-root {
      padding: var(--space-lg) var(--space-xl) 0;
      background: var(--surface);
      border-bottom: 1px solid var(--border-subtle);
    }

    .ph-breadcrumbs {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      margin-bottom: var(--space-md);
      flex-wrap: wrap;
    }
    .ph-crumb {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-muted);
    }
    .ph-crumb.ph-crumb-active {
      color: var(--text-body);
      font-weight: 600;
    }
    .ph-sep {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }
    [dir="rtl"] .ph-sep { transform: scaleX(-1); }

    .ph-main {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-md);
      padding-bottom: var(--space-lg);
      flex-wrap: wrap;
    }

    .ph-identity {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      min-width: 0;
    }

    .ph-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--carbon-blue-10, var(--primary-50));
      border: 1px solid var(--carbon-blue-20, var(--primary-100));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--primary);
      font-size: var(--font-size-xl);
    }

    .ph-text { min-width: 0; }

    .ph-title {
      margin: 0;
      font-size: var(--font-size-xl);
      font-weight: 800;
      color: var(--text-heading, var(--text-heading));
      line-height: 1.25;
      letter-spacing: -0.01em;
    }

    .ph-subtitle {
      margin: var(--space-xs) 0 0;
      font-size: var(--font-size-sm);
      font-weight: 400;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .ph-actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
      align-items: center;
      flex-shrink: 0;
    }

    .ph-action-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      background: var(--surface-card, var(--surface));
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-body);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .ph-action-btn:hover {
      background: var(--carbon-blue-10, var(--primary-50));
      border-color: var(--carbon-blue-30, var(--primary-200));
      color: var(--carbon-blue-70, var(--primary-700));
    }
    .ph-action-btn.ph-action-primary {
      background: var(--primary);
      color: var(--surface);
      border-color: var(--primary);
    }
    .ph-action-btn.ph-action-primary:hover {
      background: var(--carbon-blue-70, var(--primary-700));
      border-color: var(--carbon-blue-70, var(--primary-700));
    }
    .ph-action-btn .pi { font-size: var(--font-size-sm); }

    .ph-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-xl);
      background: var(--status-success-bg, var(--carbon-green-10));
      border: 1px solid var(--carbon-green-20);
      color: var(--carbon-green-70);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.15s;
      white-space: nowrap;
    }
    .ph-chip:hover { filter: brightness(0.95); }
    .ph-chip .pi { font-size: var(--font-size-xs); }

    @media (max-width: 768px) {
      .ph-root { padding: var(--space-md) var(--space-md) 0; }
      .ph-main { flex-direction: column; }
      .ph-actions { width: 100%; overflow-x: auto; flex-wrap: nowrap; }
    }
  `]
})
export class PageHeaderComponent {
  @Input() titleEn = '';
  @Input() titleAr = '';
  @Input() subtitleEn = '';
  @Input() subtitleAr = '';
  @Input() icon = '';
  @Input() breadcrumbs: string[] = [];
  @Input() actions: PageHeaderAction[] = [];
  @Input() isAr = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Output() actionClick = new EventEmitter<string>();

}
