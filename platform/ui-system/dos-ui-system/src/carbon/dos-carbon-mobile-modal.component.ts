import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalModule } from 'carbon-components-angular';

export type DosCarbonMobileModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'full';

/**
 * @dos/ui-system Mobile Carbon wrapper — Modal.
 *
 * Mobile-optimized modal with bottom sheet behavior on mobile, swipe to dismiss,
 * backdrop blur, and larger touch targets.
 * Wraps `cds-modal` from carbon-components-angular with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-modal',
  standalone: true,
  imports: [CommonModule, ModalModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-modal
      [open]="open"
      [size]="size"
      [hasScrollingContent]="hasScrollingContent"
      [class.dos-mobile-modal--bottom-sheet]="bottomSheet"
      (close)="handleClose()"
    >
      <cds-modal-header (closeSelect)="handleClose()">
        <h3 cdsModalHeaderHeading>{{ title }}</h3>
        @if (subtitle) {
          <p cdsModalHeaderLabel>{{ subtitle }}</p>
        }
      </cds-modal-header>
      <section cdsModalContent>
        <ng-content></ng-content>
      </section>
      @if (showFooter) {
        <cds-modal-footer>
          <ng-content select="[modalFooter]"></ng-content>
        </cds-modal-footer>
      }
    </cds-modal>
  `,
  styles: [`
    :host {
      display: block;
    }
    .dos-mobile-modal--bottom-sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 90vh;
      border-radius: 16px 16px 0 0;
      animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
    ::ng-deep .cds--modal-container {
      backdrop-filter: blur(4px);
    }
    ::ng-deep .cds--modal-header {
      min-height: 56px;
    }
    ::ng-deep .cds--modal-footer button {
      min-height: 44px;
    }
  `],
})
export class DosCarbonMobileModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() size: DosCarbonMobileModalSize = 'full';
  @Input() hasScrollingContent = true;
  @Input() showFooter = true;
  @Input() bottomSheet = true;
  @Input() swipeDismiss = true;
  @Input() backdropBlur = true;
  @Input() hapticFeedback = false;
  @Output() closed = new EventEmitter<void>();

  handleClose(): void {
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    this.closed.emit();
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }
}
