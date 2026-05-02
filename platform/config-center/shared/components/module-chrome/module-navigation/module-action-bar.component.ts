import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { DropdownModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';

export type ActionBarSlot = 'new' | 'import' | 'bulk' | 'filter' | 'viewSwitch' | 'export' | 'aiAssist';

export interface ActionBarItem {
  slot: ActionBarSlot;
  labelEn: string;
  labelAr: string;
  icon: string;
  primary?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  menuItems?: MenuItem[];
  badge?: number;
}

export type ViewMode = 'table' | 'cards' | 'board' | 'timeline';

@Component({
    selector: 'app-module-action-bar',
    imports: [CommonModule, ButtonModule, TooltipModule, MenuModule, DropdownModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="mab" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'">
      <div class="mab-start">
        <ng-container *ngFor="let item of startSlots">
          <button *ngIf="!item.hidden" pButton
            [icon]="'pi pi-' + item.icon"
            [label]="lang === 'ar' ? item.labelAr : item.labelEn"
            [severity]="item.primary ? undefined : 'secondary'"
            [disabled]="item.disabled ?? false"
            [pTooltip]="lang === 'ar' ? item.labelAr : item.labelEn"
            tooltipPosition="bottom"
            [pBadge]="item.badge ? '' + item.badge : ''"
            badgeSeverity="danger"
            size="small"
            (click)="slotClick.emit(item.slot)"></button>
        </ng-container>
        <ng-content select="[actionBarStart]"></ng-content>
      </div>

      <div class="mab-end">
        <div class="mab-search" *ngIf="showSearch">
          <i class="pi pi-search"></i>
          <input type="text" [placeholder]="lang === 'ar' ? 'بحث...' : 'Search...'"
                 [value]="searchTerm" (input)="onSearch($event)" />
        </div>

        <div class="mab-view-switch" *ngIf="viewModes.length > 1">
          <button *ngFor="let mode of viewModes"
            class="mab-view-btn" [class.mab-view-btn--active]="mode === activeView"
            [pTooltip]="mode" tooltipPosition="bottom"
            (click)="viewChange.emit(mode)">
            <i class="pi" [ngClass]="viewIcon(mode)"></i>
          </button>
        </div>

        <ng-container *ngFor="let item of endSlots">
          <button *ngIf="!item.hidden" pButton
            [icon]="'pi pi-' + item.icon"
            [label]="lang === 'ar' ? item.labelAr : item.labelEn"
            severity="secondary" size="small"
            [disabled]="item.disabled ?? false"
            (click)="slotClick.emit(item.slot)"></button>
        </ng-container>
        <ng-content select="[actionBarEnd]"></ng-content>
      </div>
    </div>
  `,
    styles: [`
    .mab { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 24px; background: var(--surface-0, #fff); border-bottom: 1px solid var(--border-subtle, #e5e7eb); flex-wrap: wrap; }
    .mab-start { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .mab-end { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-inline-start: auto; }
    .mab-search { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); background: var(--surface-ground, #f5f5f5); }
    .mab-search .pi { font-size: var(--font-size-caption); color: var(--text-muted); }
    .mab-search input { border: none; background: transparent; outline: none; font-size: var(--font-size-caption); width: 180px; color: var(--text-body); }
    .mab-view-switch { display: flex; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .mab-view-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: var(--surface-0, #fff); cursor: pointer; transition: all 0.12s; }
    .mab-view-btn:hover { background: var(--surface-100, #f3f4f6); }
    .mab-view-btn--active { background: var(--primary-50, #eff6ff); color: var(--primary, #3b82f6); }
    .mab-view-btn .pi { font-size: var(--font-size-tag); }
    @media (max-width: 768px) {
      .mab { padding: 8px 12px; }
      .mab-search input { width: 120px; }
    }
  `]
})
export class ModuleActionBarComponent {
  @Input() items: ActionBarItem[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() showSearch = true;
  @Input() searchTerm = '';
  @Input() viewModes: ViewMode[] = ['table'];
  @Input() activeView: ViewMode = 'table';
  @Output() slotClick = new EventEmitter<ActionBarSlot>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() viewChange = new EventEmitter<ViewMode>();

  get startSlots(): ActionBarItem[] {
    return this.items.filter(i => ['new', 'import', 'bulk'].includes(i.slot));
  }

  get endSlots(): ActionBarItem[] {
    return this.items.filter(i => ['filter', 'export', 'aiAssist'].includes(i.slot));
  }

  viewIcon(mode: ViewMode): string {
    const map: Record<ViewMode, string> = { table: 'pi-list', cards: 'pi-th-large', board: 'pi-chart-bar', timeline: 'pi-calendar' };
    return map[mode] || 'pi-list';
  }

  onSearch(e: Event) {
    this.searchChange.emit((e.target as HTMLInputElement).value);
  }
}
