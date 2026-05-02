import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-module-card',
    imports: [CommonModule, RouterLink],
    templateUrl: './module-card.component.html',
    styleUrls: ['./module-card.component.css']
})
export class ModuleCardComponent {
  @Input() icon = 'folder';
  @Input() iconVariant: 'primary' | 'success' | 'warning' | 'danger' | 'purple' = 'primary';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() route: string | string[] = [];
  @Input() viewAllLabel = 'View all';
  @Input() count: number | null = null;
}
