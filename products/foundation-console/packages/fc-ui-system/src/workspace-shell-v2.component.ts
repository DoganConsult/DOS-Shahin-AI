// WorkspaceShellV2 — top-level shell. Composes header / sidebar / main from runtime only.
// Doctrine: zero static, zero fallback, zero hardcoded routes/labels.
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import { WorkspaceRuntimeService } from './workspace-runtime.service.js';
import { PageRuntimeService } from './page-runtime.service.js';
import { WorkspaceHeaderV2Component } from './workspace-header-v2.component.js';
import { WorkspaceSidebarV2Component } from './workspace-sidebar-v2.component.js';
import { WorkspaceContentHostV2Component } from './workspace-content-host-v2.component.js';

@Component({
  selector: 'fc-workspace-shell-v2',
  standalone: true,
  imports: [
    WorkspaceHeaderV2Component,
    WorkspaceSidebarV2Component,
    WorkspaceContentHostV2Component,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().kind) {
      @case ('idle')    { <div class="fc-shell__diag">idle</div> }
      @case ('loading') { <div class="fc-shell__diag">loading workspace runtime…</div> }
      @case ('error')   {
        <div class="fc-shell__diag fc-shell__diag--error">
          workspace-runtime failed:
          {{ errorMessage() }} (status {{ errorStatus() }})
        </div>
      }
      @case ('ready') {
        <div class="fc-shell">
          <fc-workspace-header-v2  [runtime]="readyRuntime()!" />
          <div class="fc-shell__body">
            <fc-workspace-sidebar-v2     [runtime]="readyRuntime()!" />
            <fc-workspace-content-host-v2 [runtime]="readyRuntime()!" />
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .fc-shell { display: flex; flex-direction: column; min-height: 100vh; }
      .fc-shell__body { display: flex; flex: 1 1 auto; }
      .fc-shell__diag {
        font: 13px/1.4 ui-monospace, monospace; padding: 1rem;
      }
      .fc-shell__diag--error { color: #b00020; }
    `,
  ],
})
export class WorkspaceShellV2Component implements OnInit {
  private readonly svc = inject(WorkspaceRuntimeService);
  private readonly pages = inject(PageRuntimeService);
  readonly state = this.svc.state;

  readonly readyRuntime = computed(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.runtime : null;
  });
  readonly errorMessage = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  });
  readonly errorStatus = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.status : 0;
  });

  ngOnInit(): void {
    void this.svc.load();
    // Initial page request reflects the URL the browser is on. No hardcoded route.
    if (typeof window !== 'undefined' && typeof window.location?.pathname === 'string') {
      this.pages.setPath(window.location.pathname);
    }
  }
}
