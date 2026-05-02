import {
  Directive, Input, Output, EventEmitter,
  ElementRef, OnDestroy, NgZone, Renderer2
} from '@angular/core';
import { clampSize } from '../../features/layout-grid/layout-grid.utils';

export interface ResizeResult {
  w: number;
  h: number;
}

/**
 * Standalone directive applied to a resize handle element.
 * Tracks mousedown → mousemove → mouseup to compute new widget size
 * in grid units, clamped to min 1×1 / max 4×3.
 * Shows a size indicator overlay (e.g. "2×3") during the resize.
 */
@Directive({
  selector: '[appWidgetResize]',
  standalone: true,
})
export class WidgetResizeDirective implements OnDestroy {
  /** Current width in grid units (used as starting point) */
  @Input() resizeW = 1;
  /** Current height in grid units (used as starting point) */
  @Input() resizeH = 1;
  /** Approximate pixel width of one grid column */
  @Input() cellWidth = 200;
  /** Approximate pixel height of one grid row */
  @Input() cellHeight = 200;

  /** Emits the clamped new size when resize completes */
  @Output() resized = new EventEmitter<ResizeResult>();

  private startX = 0;
  private startY = 0;
  private startW = 1;
  private startH = 1;
  private overlay: HTMLElement | null = null;
  private removeMouseMove: (() => void) | null = null;
  private removeMouseUp: (() => void) | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    private ngZone: NgZone,
    private renderer: Renderer2
  ) {
    // Listen for mousedown on the resize handle (runs outside Angular zone for perf)
    this.ngZone.runOutsideAngular(() => {
      this.el.nativeElement.addEventListener('mousedown', this.onMouseDown);
    });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('mousedown', this.onMouseDown);
    this.cleanup();
  }

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startW = this.resizeW;
    this.startH = this.resizeH;

    this.showOverlay(this.startW, this.startH);

    this.removeMouseMove = this.renderer.listen('document', 'mousemove', this.onMouseMove);
    this.removeMouseUp = this.renderer.listen('document', 'mouseup', this.onMouseUp);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    const rawW = this.startW + Math.round(dx / this.cellWidth);
    const rawH = this.startH + Math.round(dy / this.cellHeight);

    const clamped = clampSize(rawW, rawH);
    this.updateOverlay(clamped.w, clamped.h);
  };

  private onMouseUp = (e: MouseEvent): void => {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    const rawW = this.startW + Math.round(dx / this.cellWidth);
    const rawH = this.startH + Math.round(dy / this.cellHeight);

    const clamped = clampSize(rawW, rawH);

    this.cleanup();

    this.ngZone.run(() => {
      this.resized.emit(clamped);
    });
  };

  // ── Size indicator overlay ──

  private showOverlay(w: number, h: number): void {
    this.overlay = this.renderer.createElement('div');
    const s = this.overlay!.style;
    s.position = 'fixed';
    s.padding = '4px 10px';
    s.background = 'rgba(var(--color-slate-800-rgb), 0.85)';
    s.color = '#fff';
    s.borderRadius = '6px';
    s.fontSize = '13px';
    s.fontWeight = '600';
    s.pointerEvents = 'none';
    s.zIndex = '10000';
    s.top = `${this.startY - 32}px`;
    s.left = `${this.startX + 12}px`;
    this.overlay!.textContent = `${w}×${h}`;
    document.body.appendChild(this.overlay!);
  }

  private updateOverlay(w: number, h: number): void {
    if (!this.overlay) return;
    this.overlay.textContent = `${w}×${h}`;
  }

  private cleanup(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.removeMouseMove) {
      this.removeMouseMove();
      this.removeMouseMove = null;
    }
    if (this.removeMouseUp) {
      this.removeMouseUp();
      this.removeMouseUp = null;
    }
  }
}
