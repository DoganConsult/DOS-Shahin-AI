// WorkspaceHeaderV2 — renders only surfaces in zone "header". No hardcoded brand/labels.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { FcWorkspaceRuntime, FcWorkspaceSurface } from '@fc/ui-contracts';
import { DosSurfaceRendererComponent } from './dos-surface-renderer.component.js';

@Component({
  selector: 'fc-workspace-header-v2',
  standalone: true,
  imports: [DosSurfaceRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fc-shell__header" role="banner">
      @for (s of headerSurfaces(); track s.surfaceId) {
        <fc-surface-renderer [surface]="s" />
      } @empty {
        <span class="fc-shell__empty">no header surfaces</span>
      }
    </header>
  `,
  styles: [
    `
      .fc-shell__header {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.5rem 1rem; border-bottom: 1px solid currentColor;
      }
      .fc-shell__empty { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; }
    `,
  ],
})
export class WorkspaceHeaderV2Component {
  readonly runtime = input.required<FcWorkspaceRuntime>();
  readonly headerSurfaces = computed<readonly FcWorkspaceSurface[]>(() =>
    this.runtime().shell.surfaces.filter((s) => s.zone === 'header'),
  );
}
