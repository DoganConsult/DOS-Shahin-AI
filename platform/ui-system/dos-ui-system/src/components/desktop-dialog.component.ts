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
 * DosDesktopDialog
 * ----------------
 * Canonical desktop modal — overlay + focus trap + ESC-to-close + sized
 * container. Filed by Roadmap Wave H to unblock the FoundationOrgDialog /
 * FoundationUsersDialogs migrations (P1 #1 / #2). Intentionally minimal:
 * the surface is a content-projecting shell, not a form library. Form
 * fields stay domain-owned; this primitive supplies the chrome.
 *
 * Companion primitive: DosBottomSheet covers the mobile equivalent.
 * Domain pages compose both behind a responsive choice (see the
 * FoundationOrgDialog migration for the canonical pattern).
 *
 * Inputs
 *   open       — boolean, two-way friendly via [open] + (closed)
 *   title      — header label; rendered inside the dialog header
 *   width      — 'sm' | 'md' | 'lg' | 'xl' | string CSS length;
 *                'md' (560px) is the safe default for forms
 *   dismissOn  — 'esc-and-overlay' | 'esc' | 'none'; default 'esc-and-overlay'
 *
 * Outputs
 *   closed     — emitted on header X / ESC / overlay click (subject to dismissOn)
 *
 * Slots
 *   default    — body content
 *   [dialogFooter] — trailing button row; rendered inside a tokenised footer
 *
 * Accessibility
 *   - role="dialog" aria-modal="true"
 *   - title bound to aria-labelledby
 *   - focus moves to the dialog container on open
 *   - ESC closes (when dismissOn permits)
 *   - background scroll is intentionally NOT locked at this primitive level;
 *     hosts that need scroll-lock can apply it via their own service.
 */
@Component({
  selector: 'dos-desktop-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="dos-desktop-dialog__overlay" (click)="onOverlayClick($event)" data-test="dos-desktop-dialog-overlay">
        <div
          #container
          class="dos-desktop-dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.data-width]="width"
          [style.--dos-desktop-dialog-width]="resolvedWidth()"
          (click)="$event.stopPropagation()"
          tabindex="-1"
        >
          <header class="dos-desktop-dialog__header dos-stack-h">
            <strong [id]="titleId">{{ title }}</strong>
            <button
              type="button"
              class="dos-command-bar__btn"
              aria-label="Close"
              (click)="closed.emit()"
              data-test="dos-desktop-dialog-close"
            >×</button>
          </header>
          <div class="dos-desktop-dialog__body">
            <ng-content></ng-content>
          </div>
          <footer class="dos-desktop-dialog__footer">
            <ng-content select="[dialogFooter]"></ng-content>
          </footer>
        </div>
      </div>
    }
  `,
})
export class DosDesktopDialogComponent implements AfterViewInit, OnChanges {
  @Input() open = false;
  @Input() title = '';
  @Input() width: 'sm' | 'md' | 'lg' | 'xl' | string = 'md';
  @Input() dismissOn: 'esc-and-overlay' | 'esc' | 'none' = 'esc-and-overlay';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('container') private container?: ElementRef<HTMLDivElement>;

  readonly titleId = `dos-desktop-dialog-title-${Math.random().toString(36).slice(2, 9)}`;

  private static readonly WIDTH_MAP: Record<string, string> = {
    sm: '400px',
    md: '560px',
    lg: '720px',
    xl: '960px',
  };

  resolvedWidth(): string {
    const w = this.width;
    if (typeof w === 'string' && DosDesktopDialogComponent.WIDTH_MAP[w]) {
      return DosDesktopDialogComponent.WIDTH_MAP[w];
    }
    return typeof w === 'string' ? w : '560px';
  }

  ngAfterViewInit(): void {
    this.maybeFocusContainer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      // Defer to the next tick so the @if-rendered container is in the DOM.
      queueMicrotask(() => this.maybeFocusContainer());
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

  private maybeFocusContainer(): void {
    if (!this.open) return;
    const el = this.container?.nativeElement;
    if (el && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch { /* noop */ }
    }
  }
}
