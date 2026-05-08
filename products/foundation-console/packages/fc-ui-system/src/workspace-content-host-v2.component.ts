// WorkspaceContentHostV2 — renders the active page surfaces resolved from PageRuntimeService.
// Doctrine: page runtime is the source of truth for main content. No shell-side fallback.
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { FcPageDiagnostic, FcWorkspaceRuntime, FcWorkspaceSurface } from '@fc/ui-contracts';
import { DosSurfaceRendererComponent } from './dos-surface-renderer.component.js';
import { PageRuntimeService } from './page-runtime.service.js';

@Component({
  selector: 'fc-workspace-content-host-v2',
  standalone: true,
  imports: [DosSurfaceRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="fc-shell__main" role="main" [attr.data-page-id]="pageId()">
      @switch (state().kind) {
        @case ('idle') {
          <span class="fc-shell__empty">no page selected</span>
        }
        @case ('loading') {
          <span class="fc-shell__empty">loading page runtime…</span>
        }
        @case ('error') {
          <span class="fc-shell__empty fc-shell__empty--error">
            page-runtime failed: {{ errorMessage() }} (status {{ errorStatus() }})
          </span>
        }
        @case ('ready') {
          @for (d of diagnostics(); track $index) {
            <section class="fc-page-diagnostic" [attr.data-kind]="d.kind">
              <strong>{{ d.kind }}</strong>
              <span class="fc-page-diagnostic__path">{{ d.path }}</span>
            </section>
          }
          @for (s of pageSurfaces(); track s.surfaceId) {
            <fc-surface-renderer [surface]="s" />
          } @empty {
            @if (diagnostics().length === 0) {
              <span class="fc-shell__empty">no page surfaces</span>
            }
          }
        }
      }
    </main>
  `,
  styles: [
    `
      .fc-shell__main { display: block; flex: 1 1 auto; padding: 1rem; }
      .fc-shell__empty { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; }
      .fc-shell__empty--error { color: #b00020; }
      .fc-page-diagnostic {
        display: inline-flex; gap: 0.5rem; padding: 0.25rem 0.5rem; margin-bottom: 0.5rem;
        font: 12px/1.4 ui-monospace, monospace; border: 1px dotted currentColor;
      }
      .fc-page-diagnostic__path { opacity: 0.75; }
    `,
  ],
})
export class WorkspaceContentHostV2Component {
  readonly runtime = input.required<FcWorkspaceRuntime>();
  private readonly pages = inject(PageRuntimeService);
  readonly state = this.pages.state;

  readonly pageSurfaces = computed<readonly FcWorkspaceSurface[]>(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.page.surfaces : [];
  });
  readonly diagnostics = computed<readonly FcPageDiagnostic[]>(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.page.diagnostics : [];
  });
  readonly pageId = computed<string>(() => {
    const s = this.state();
    return s.kind === 'ready' ? (s.page.pageId ?? '') : '';
  });
  readonly errorMessage = computed<string>(() => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  });
  readonly errorStatus = computed<number>(() => {
    const s = this.state();
    return s.kind === 'error' ? s.status : 0;
  });
}
