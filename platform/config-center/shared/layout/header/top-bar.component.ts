import { Component, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationCenterComponent } from '@app/shared/components/messaging/notification-center.component';
import { GlobalSearchComponent } from '@app/shared/global-search/global-search.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, NotificationCenterComponent, GlobalSearchComponent],
  template: `
    <div class="top-bar">
      <app-global-search></app-global-search>
      <div class="top-bar-actions">
        <app-notification-center></app-notification-center>
      </div>
    </div>
  `,
  styles: [`
    .top-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px; margin-bottom: 16px;
      background: var(--surface-card); border-radius: var(--radius-md);
      border: 1px solid var(--surface-border);
    }
    .top-bar-actions { display: flex; align-items: center; gap: 8px; }
  `]
})
export class TopBarComponent {
  constructor(public i18n: I18nService) {}
}
