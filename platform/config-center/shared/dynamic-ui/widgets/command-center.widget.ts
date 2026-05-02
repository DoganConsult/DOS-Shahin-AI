import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosCommandCenterComponent } from '@dos/ui-system';

@Component({
  selector: 'dos-dynamic-command-center-widget',
  standalone: true,
  imports: [CommonModule, DosCommandCenterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-command-center
      [moduleCode]="moduleCode"
      [kpiScope]="kpiScope"
      [density]="density"
      [ariaLabel]="ariaLabel"
    >
      <div slot="work-queue">{{ workQueueLabel }}</div>
      <div slot="readiness">{{ readinessLabel }}</div>
      <div slot="recent-activity">{{ recentActivityLabel }}</div>
      <div slot="quick-actions">{{ quickActionsLabel }}</div>
    </dos-command-center>
  `,
})
export class CommandCenterWidgetComponent {
  @Input() config?: Record<string, unknown>;

  get moduleCode(): string | undefined {
    return typeof this.config?.['moduleCode'] === 'string' ? (this.config['moduleCode'] as string) : undefined;
  }

  get kpiScope(): 'module-overview' | 'page-local' | 'none' {
    const raw = this.config?.['kpiScope'];
    if (raw === 'page-local' || raw === 'none' || raw === 'module-overview') return raw;
    return 'module-overview';
  }

  get density(): 'compact' | 'cozy' | 'comfortable' {
    const raw = this.config?.['density'];
    if (raw === 'compact' || raw === 'cozy' || raw === 'comfortable') return raw;
    return 'comfortable';
  }

  get ariaLabel(): string {
    return typeof this.config?.['ariaLabel'] === 'string' ? (this.config['ariaLabel'] as string) : 'Command Center';
  }

  get workQueueLabel(): string {
    return typeof this.config?.['workQueueLabel'] === 'string' ? (this.config['workQueueLabel'] as string) : 'Work queue not configured.';
  }

  get readinessLabel(): string {
    return typeof this.config?.['readinessLabel'] === 'string' ? (this.config['readinessLabel'] as string) : 'Readiness not configured.';
  }

  get recentActivityLabel(): string {
    return typeof this.config?.['recentActivityLabel'] === 'string' ? (this.config['recentActivityLabel'] as string) : 'Recent activity not configured.';
  }

  get quickActionsLabel(): string {
    return typeof this.config?.['quickActionsLabel'] === 'string' ? (this.config['quickActionsLabel'] as string) : 'Quick actions not configured.';
  }
}

