import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-slide-in-panel',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="slide-in-panel" *ngIf="isOpen || visible"><ng-content /></div>',
  styles: ['.slide-in-panel { position: relative; }']
})
export class SlideInPanelComponent {
  @Input() visible = false;
  @Input() isOpen = false;
  @Input() widgetId: string | null = null;
  @Input() direction: 'ltr' | 'rtl' = 'ltr';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();
}
