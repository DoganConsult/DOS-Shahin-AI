import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ModuleTabVM } from '../../../models/module-overview.vm';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-module-tabs-bar',
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <nav class="mtb-root" role="tablist" [attr.aria-label]="isAr ? 'تبويبات الوحدة' : 'Module tabs'" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      <a
        *ngFor="let tab of tabs"
        class="mtb-tab"
        role="tab"
        [routerLink]="tab.route"
        routerLinkActive="mtb-tab--active"
        [routerLinkActiveOptions]="{ exact: false }"
        [attr.aria-label]="(isAr ? tab.labelAr : tab.labelEn) + (tab.badgeCount ? ': ' + tab.badgeCount : '')">
        <i *ngIf="tab.icon" class="pi" [ngClass]="'pi-' + tab.icon" aria-hidden="true"></i>
        <span>{{ isAr ? tab.labelAr : tab.labelEn }}</span>
        <span class="mtb-badge" *ngIf="tab.badgeCount && tab.badgeCount > 0">{{ tab.badgeCount }}</span>
      </a>
    </nav>
  `,
    styles: [`
    .mtb-root {
      display: flex;
      gap: 6px;
      padding: 0 24px;
      background: var(--surface-card, #fff);
      border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .mtb-root::-webkit-scrollbar { height: 3px; }
    .mtb-root::-webkit-scrollbar-thumb { background: var(--surface-border, #cbd5e1); border-radius: var(--radius-xs); }

    .mtb-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 14px;
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-muted, var(--text-muted));
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      white-space: nowrap;
      flex-shrink: 0;
      transition: color 0.12s, border-color 0.12s;
    }
    .mtb-tab:hover {
      color: var(--text-body, #374151);
    }
    .mtb-tab--active {
      color: var(--primary-700, #1d4ed8);
      border-bottom-color: var(--primary-600, #2563eb);
      font-weight: 700;
    }
    .mtb-tab .pi { font-size: var(--font-size-sm); }

    .mtb-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: var(--radius);
      background: var(--primary-100, #dbeafe);
      color: var(--primary-700, #1d4ed8);
      font-size: var(--font-size-xs);
      font-weight: 700;
    }
    .mtb-tab--active .mtb-badge {
      background: var(--primary-600, #2563eb);
      color: #fff;
    }

    @media (max-width: 600px) {
      .mtb-root { padding: 0 12px; }
      .mtb-tab { padding: 10px 10px; font-size: var(--font-size-sm); }
    }
  `]
})
export class ModuleTabsBarComponent {
  @Input() tabs: ModuleTabVM[] = [];
  @Input() isAr = false;

}
