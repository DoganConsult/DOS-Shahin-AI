import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalModule } from 'carbon-components-angular';

export type DosCarbonModalSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'dos-carbon-modal',
  standalone: true,
  imports: [CommonModule, ModalModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-modal
      [open]="open"
      [size]="size"
      [hasScrollingContent]="hasScrollingContent"
      (close)="closed.emit()"
    >
      <cds-modal-header (closeSelect)="closed.emit()">
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
})
export class DosCarbonModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() size: DosCarbonModalSize = 'md';
  @Input() hasScrollingContent = false;
  @Input() showFooter = true;
  @Output() closed = new EventEmitter<void>();
}
