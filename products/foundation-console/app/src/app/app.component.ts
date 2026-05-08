// Root app host — mounts WorkspaceShellV2Component directly.
// Doctrine: NO hardcoded nav/labels/routes/icons. Shell consumes runtime via service.
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspaceShellV2Component } from '@fc/ui-system';

@Component({
  selector: 'fc-root',
  standalone: true,
  imports: [WorkspaceShellV2Component],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fc-workspace-shell-v2 />`,
})
export class AppComponent {}
