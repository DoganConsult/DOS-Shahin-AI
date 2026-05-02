import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendors-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentBadgeComponent, HubHelpPanelComponent],
  template: `
    <div class="grc-hub" [dir]="i18n.direction()">
      <div class="hub-toolbar">
        <app-agent-badge [agentId]="agentId" />
        <app-hub-help-panel [hubRoute]="'/vendor-risk'" />
      </div>
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .grc-hub { min-height: 100vh; background: var(--surface-ground, var(--surface-ice)); position: relative; }
    .hub-toolbar {
      position: sticky; top: 0; z-index: var(--z-dropdown);
      display: flex; align-items: center; gap: 8px;
      justify-content: flex-end;
      padding: 6px 20px;
      pointer-events: none;
    }
    .hub-toolbar > * { pointer-events: auto; }
    .hub-content { padding: 0; }
  `]
})
export class VendorsShellComponent {
  i18n = inject(I18nService);
  readonly agentId = 'A08';
}
