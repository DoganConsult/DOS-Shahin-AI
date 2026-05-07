import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextMenuModule } from 'carbon-components-angular';

export interface DosCarbonContextMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  ariaLabel?: string | null;
  icon?: string | null;
  /** Optional surface-specific data carried back on (selected). */
  data?: Record<string, unknown>;
}

/**
 * Carbon-backed disclosure menu wrapper.
 *
 * Composes Carbon Angular's `cds-context-menu` + `cds-context-menu-item`
 * pair. Use this whenever a shell, page, or panel needs a render-only
 * disclosure menu driven by an items array — coordinated open/close
 * state stays with the parent (typically `ShellOverlayService` for
 * shell surfaces) so this wrapper stays purely presentational.
 *
 * Why a wrapper instead of importing `ContextMenuModule` at the call
 * site? Angular's compiled-component emit references Carbon's source
 * files via relative paths into the pnpm virtual store; that breaks
 * downstream esbuild bundles when Carbon is imported outside this
 * barrel. The carbon-boundary guard enforces the same rule.
 */
@Component({
  selector: 'dos-carbon-context-menu',
  standalone: true,
  imports: [CommonModule, ContextMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-context-menu [open]="open" [size]="size">
      <cds-context-menu-item
        *ngFor="let item of items; trackBy: trackById"
        [label]="item.label"
        [disabled]="item.disabled || false"
        [danger]="item.danger || false"
        [icon]="item.icon || ''"
        [value]="item.id"
        [attr.aria-label]="item.ariaLabel || item.label || null"
        (itemClick)="onItemClick(item)"
      ></cds-context-menu-item>
    </cds-context-menu>
  `,
})
export class DosCarbonContextMenuComponent {
  @Input() open = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() items: DosCarbonContextMenuItem[] = [];
  @Output() selected = new EventEmitter<DosCarbonContextMenuItem>();

  trackById = (_: number, item: DosCarbonContextMenuItem) => item.id;

  onItemClick(item: DosCarbonContextMenuItem): void {
    if (item.disabled) return;
    this.selected.emit(item);
  }
}
