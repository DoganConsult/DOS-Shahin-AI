import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'grc-detail-drawer',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="grc-detail-drawer" *ngIf="visible"><div class="drawer-header"><span>{{ title }}</span><button type="button" (click)="close()">Close</button></div><div class="drawer-body"><ng-content></ng-content></div></div>',
})
export class GrcDetailDrawerComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() wide = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.closed.emit();
  }
}
