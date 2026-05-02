import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosSideDrawer
 * -------------
 * Right- (or left-) edge sliding side panel. Filed as Wave H-2 to
 * unblock detail-drawer migrations that the original PrimeNG estate
 * shipped as <p-dialog position="right"> or <p-sidebar position="right">
 * or custom `.drawer { height:100vh; box-shadow:-4px 0 24px... }`.
 *
 * Distinct from:
 *   - DosDesktopDialog (centered modal)
 *   - DosBottomSheet   (mobile bottom edge)
 *   - DosMobileDrawer  (mobile bottom-sheet alias used by app shell)
 *
 * API
 *   open       — boolean, two-way friendly via [open] + (closed)
 *   title      — header label (aria-labelledby bound)
 *   position   — 'left' | 'right' (default 'right')
 *   width      — 'sm' | 'md' | 'lg' | 'xl' | css length string
 *                'md' (560px) is the safe default for detail panels
 *   dismissOn  — 'esc-and-overlay' | 'esc' | 'none'; default 'esc-and-overlay'
 *
 * Slots
 *   default          — body content (scrollable)
 *   [drawerFooter]   — sticky-bottom action row, auto-hidden when empty
 *
 * Accessibility
 *   - role="dialog" aria-modal="true"
 *   - title bound to aria-labelledby
 *   - focus moves to the panel container on open
 *   - ESC closes (when dismissOn permits)
 *   - body scroll-lock is intentionally NOT applied at primitive level;
 *     hosts apply it via their own service if needed.
 */
@Component({
  selector: 'dos-side-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="dos-side-drawer__overlay" (click)="onOverlayClick($event)" data-test="dos-side-drawer-overlay">
        <aside
          #panel
          class="dos-side-drawer"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.data-position]="position"
          [style.--dos-side-drawer-width]="resolvedWidth()"
          (click)="$event.stopPropagation()"
          tabindex="-1"
        >
          <header class="dos-side-drawer__header dos-stack-h">
            <strong [id]="titleId">{{ title }}</strong>
            <button
              type="button"
              class="dos-command-bar__btn"
              aria-label="Close"
              (click)="closed.emit()"
              data-test="dos-side-drawer-close"
            >×</button>
          </header>
          <div class="dos-side-drawer__body">
            <ng-content></ng-content>
          </div>
          <footer class="dos-side-drawer__footer">
            <ng-content select="[drawerFooter]"></ng-content>
          </footer>
        </aside>
      </div>
    }
  `,
})
export class DosSideDrawerComponent implements AfterViewInit, OnChanges {
  @Input() open = false;
  @Input() title = '';
  @Input() position: 'left' | 'right' = 'right';
  @Input() width: 'sm' | 'md' | 'lg' | 'xl' | string = 'md';
  @Input() dismissOn: 'esc-and-overlay' | 'esc' | 'none' = 'esc-and-overlay';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;

  readonly titleId = `dos-side-drawer-title-${Math.random().toString(36).slice(2, 9)}`;

  private static readonly WIDTH_MAP: Record<string, string> = {
    sm: '360px',
    md: '560px',
    lg: '720px',
    xl: '900px',
  };

  resolvedWidth(): string {
    const w = this.width;
    if (typeof w === 'string' && DosSideDrawerComponent.WIDTH_MAP[w]) {
      return DosSideDrawerComponent.WIDTH_MAP[w];
    }
    return typeof w === 'string' ? w : '560px';
  }

  ngAfterViewInit(): void {
    this.maybeFocusPanel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      queueMicrotask(() => this.maybeFocusPanel());
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open) return;
    if (this.dismissOn === 'none') return;
    this.closed.emit();
  }

  onOverlayClick(_event: MouseEvent): void {
    if (this.dismissOn !== 'esc-and-overlay') return;
    this.closed.emit();
  }

  private maybeFocusPanel(): void {
    if (!this.open) return;
    const el = this.panel?.nativeElement;
    if (el && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch { /* noop */ }
    }
  }
}
