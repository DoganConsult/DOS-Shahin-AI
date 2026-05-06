/**
 * Shell host — render-only. All data from WorkspaceShellBindingService.
 * No hardcoded labels, routes, icons, fallback CSS, or local policy.
 *
 * Layout responsibility (Option A):
 *   - Provide ONLY the canonical workspace chrome grid containers:
 *     header / sidebar / main / router-outlet. ShellHost owns NO
 *     visual rendering — every visible Carbon component is mounted by
 *     <dos-surface-renderer> off the resolver-emitted rendererKey.
 *   - For each zone, iterate visualSurfacesByZone(zone) and emit one
 *     <dos-surface-renderer> per surface. ShellHost never imports
 *     DosWorkspaceHeader / DosWorkspaceSidebar directly.
 *   - Structural shell-frame surfaces (componentType='shell-frame')
 *     are intentionally excluded from this iteration; ShellHost may
 *     consume them only for layout policy if/when needed.
 *   - The shell host never invents nav, labels, icons, or routes — if
 *     the resolver emits zero visual surfaces in a zone, the zone
 *     renders empty (no static fallback).
 */
import { Component, DestroyRef, ElementRef, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import {
  DosSurfaceRendererComponent,
  type WorkspaceSurfaceInput,
} from '@dos/ui-system';
import { WorkspaceShellBindingService, type WorkspaceShellSurface } from './workspace-shell-binding.service';
import { ShellPreferencesService } from './shell-preferences.service';
import { AuthLogoutService } from './auth-logout.service';
import type { ShellAction } from '@dos/ui-contracts';

@Component({
  selector: 'app-shell-host',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DosSurfaceRendererComponent,
  ],
  template: `
    <div class="dos-shell-host">
      <header
        class="cds--header dos-shell-zone dos-shell-zone--header"
        data-zone="header"
        role="banner"
        aria-label="Workspace header"
        [attr.data-surface-count]="headerSurfaces().length"
        [attr.data-visual-surface-count]="visualHeaderSurfaces().length"
      >
        <div class="dos-shell-zone__header-start">
          @for (s of visualHeaderStart(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
        </div>
        <div class="dos-shell-zone__header-end">
          @for (s of visualHeaderEnd(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
        </div>
      </header>
      <aside
        class="cds--side-nav cds--side-nav--expanded dos-shell-zone dos-shell-zone--sidebar"
        data-zone="sidebar"
        role="complementary"
        aria-label="Workspace sidebar"
        [attr.data-surface-count]="sidebarSurfaces().length"
        [attr.data-visual-surface-count]="visualSidebarSurfaces().length"
      >
        @for (s of visualSidebarSurfaces(); track surfaceTrack(s, $index)) {
          <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
        }
      </aside>
      <main
        class="cds--content dos-shell-zone dos-shell-zone--main"
        data-zone="main"
        role="main"
        id="main-content"
        [attr.data-surface-count]="mainSurfaces().length"
        [attr.data-visual-surface-count]="visualMainSurfaces().length"
      >
        <div class="dos-shell-zone__main-inner">
          @for (s of visualMainSurfaces(); track surfaceTrack(s, $index)) {
            <dos-surface-renderer [surface]="asSurfaceInput(s)"></dos-surface-renderer>
          }
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--cds-background); }
    .dos-shell-host {
      display: grid;
      grid-template-columns: 16rem 1fr;
      grid-template-rows: 3rem 1fr;
      grid-template-areas:
        'header  header'
        'sidebar main';
      min-height: 100vh;
    }
    .dos-shell-zone--header {
      grid-area: header;
      display: flex; align-items: stretch;
      height: 3rem;
      background: var(--cds-background);
      border-bottom: 1px solid var(--cds-border-subtle);
      padding: 0;
    }
    .dos-shell-zone__header-start {
      display: inline-flex; align-items: stretch;
      flex: 0 0 auto;
      gap: var(--cds-spacing-05);
    }
    .dos-shell-zone__header-end {
      display: inline-flex; align-items: stretch;
      flex: 1 1 auto; justify-content: flex-end;
      gap: var(--cds-spacing-03);
      padding-inline-end: var(--cds-spacing-03);
    }
    .dos-shell-zone--sidebar {
      grid-area: sidebar;
      background: var(--cds-background);
      border-right: 1px solid var(--cds-border-subtle);
      overflow-y: auto;
    }
    .dos-shell-zone--main {
      grid-area: main; min-width: 0; min-height: 0;
      padding: 0;
      background: var(--cds-layer);
      overflow: auto;
    }
    .dos-shell-zone__main-inner {
      max-width: 80rem;
      margin: 0 auto;
      padding: var(--cds-spacing-07) var(--cds-spacing-06);
      display: flex; flex-direction: column;
      gap: var(--cds-spacing-05);
    }
  `],
})
export class ShellHostComponent {
  private readonly router = inject(Router);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly prefs = inject(ShellPreferencesService);
  private readonly authLogout = inject(AuthLogoutService);
  private readonly destroyRef = inject(DestroyRef);
  readonly shell = inject(WorkspaceShellBindingService);

  readonly headerSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.surfacesByZone('header'));
  readonly sidebarSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.surfacesByZone('sidebar'));
  readonly mainSurfaces = computed<WorkspaceShellSurface[]>(() => this.shell.surfacesByZone('main'));

  readonly visualHeaderSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualSurfacesByZone('header'),
  );
  /** Header surfaces that anchor to the leading edge (brand, title, nav). */
  readonly visualHeaderStart = computed<WorkspaceShellSurface[]>(
    () => this.visualHeaderSurfaces().filter((s) => !this.isTrailingHeaderSurface(s)),
  );
  /** Header surfaces that anchor to the trailing edge (global actions). */
  readonly visualHeaderEnd = computed<WorkspaceShellSurface[]>(
    () => this.visualHeaderSurfaces().filter((s) => this.isTrailingHeaderSurface(s)),
  );

  /**
   * Trailing-edge classification — driven by resolver-emitted
   * `props.placement` metadata (NOT by hardcoded rendererKey list).
   * The DB seed/enricher sets `placement: 'trailing'` on header
   * surfaces that anchor to the trailing edge (settings, user-menu,
   * etc.). Anything without an explicit placement falls to leading.
   */
  private isTrailingHeaderSurface(s: WorkspaceShellSurface): boolean {
    const props = (s.props ?? {}) as Record<string, unknown>;
    return props['placement'] === 'trailing';
  }
  readonly visualSidebarSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualSurfacesByZone('sidebar'),
  );
  readonly visualMainSurfaces = computed<WorkspaceShellSurface[]>(
    () => this.shell.visualSurfacesByZone('main'),
  );

  /** Adapt the binding-row shape to the surface-renderer @Input contract. */
  asSurfaceInput(s: WorkspaceShellSurface): WorkspaceSurfaceInput {
    return {
      enabled: s.enabled,
      position: s.position,
      props: (s.props ?? {}) as Record<string, unknown>,
      version: s.version ?? 0,
      zone: s.zone,
      surfaceId: s.surfaceId,
      slotKey: s.slotKey,
      componentKey: s.componentKey ?? null,
      componentType: s.componentType ?? null,
      rendererKey: s.rendererKey ?? null,
      carbonKey: s.carbonKey ?? null,
    };
  }

  surfaceTrack(s: WorkspaceShellSurface, index: number): string {
    return s.surfaceId ?? s.slotKey ?? `${s.zone ?? 'z'}#${index}`;
  }

  readonly totalSurfaces = computed<number>(
    () => this.headerSurfaces().length + this.sidebarSurfaces().length + this.mainSurfaces().length,
  );
  readonly visualSurfacesTotal = computed<number>(
    () => this.visualHeaderSurfaces().length + this.visualSidebarSurfaces().length + this.visualMainSurfaces().length,
  );

  constructor() {
    // Bridge surface-emitted CustomEvents to canonical service dispatchers.
    // Visual shell components emit `dos:shell-action` for non-navigate
    // actions; ShellHost is the single boundary that routes them to the
    // matching service (preferences, auth, etc.).
    if (typeof window !== 'undefined') {
      const handler = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as ShellAction | { kind?: string; eventName?: string } | null | undefined;
        this.executeShellAction(detail as ShellAction | null | undefined);
      };
      window.addEventListener('dos:shell-action', handler);
      this.destroyRef.onDestroy(() => window.removeEventListener('dos:shell-action', handler));
    }
    // eslint-disable-next-line no-console
    console.log('[workspace] SHELL_HOST_INIT');
    // eslint-disable-next-line no-console
    console.log('[workspace] ROUTER_OUTLET_PRESENT');
    queueMicrotask(() => {
      // eslint-disable-next-line no-console
      console.log('[workspace] SURFACES_RENDER_COUNT', this.totalSurfaces());
    });
    if (typeof window !== 'undefined' && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const root = this.hostRef.nativeElement;
        if (!root) return;
        const all = root.querySelectorAll('*');
        let visible = 0, zero = 0;
        for (const node of Array.from(all)) {
          const r = (node as HTMLElement).getBoundingClientRect();
          if (r.width > 0 && r.height > 0) visible++; else zero++;
        }
        // Count surface-renderer wrappers that report a non-hit map status.
        const renderers = root.querySelectorAll('dos-surface-renderer .dos-surface-renderer');
        let unsupported = 0;
        for (const r of Array.from(renderers)) {
          const status = (r as HTMLElement).getAttribute('data-map-hit');
          if (status === 'miss' || status === 'no-key') unsupported++;
        }
        // eslint-disable-next-line no-console
        console.log('[workspace] SURFACE_DOM_PAINTED', {
          totalSurfaces: this.totalSurfaces(),
          visualSurfaces: this.visualSurfacesTotal(),
          visibleNodes: visible,
          zeroSizeNodes: zero,
          unsupportedRendererCount: unsupported,
        });
      });
    }
  }

  executeShellAction(action: ShellAction | { kind?: string; eventName?: string; payload?: Record<string, unknown> } | null | undefined): void {
    if (!action || typeof (action as { kind?: unknown }).kind !== 'string') return;
    const kind = (action as { kind: string }).kind;
    switch (kind) {
      case 'navigate':
        void this.router.navigateByUrl((action as { path: string }).path);
        break;
      case 'open_external':
        window.open((action as { url: string }).url, '_blank', 'noopener');
        break;
      case 'toggle_language':
        this.prefs.toggleLanguage();
        break;
      case 'toggle_theme':
        this.prefs.toggleTheme();
        break;
      case 'dispatch_event': {
        const evt = (action as { eventName?: string }).eventName ?? '';
        if (evt === 'auth.logout') {
          void this.authLogout.logout();
        } else if (evt === 'preference.toggle.language') {
          this.prefs.toggleLanguage();
        } else if (evt === 'preference.toggle.theme') {
          this.prefs.toggleTheme();
        }
        break;
      }
      default:
        break;
    }
  }
}
