/**
 * Shell host — render-only. All data from WorkspaceShellBindingService.
 * No hardcoded labels, routes, icons, fallback CSS, or local policy.
 *
 * Layout responsibility (Option A):
 *   - Provide ONLY the canonical workspace chrome grid containers:
 *     header / banners / sidebar / main / router-outlet. ShellHost owns NO
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
import { Component, DestroyRef, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import {
  DosSurfaceRendererComponent,
  DosShellBannerStripComponent,
  type WorkspaceSurfaceInput,
} from '@dos/ui-system';
import { WorkspaceShellBindingService, type WorkspaceShellSurface } from './workspace-shell-binding.service';
import { ShellPreferencesService } from './shell-preferences.service';
import { AuthLogoutService } from './auth-logout.service';
import { ShellErrorStateService } from './shell-error-state.service';
import type { ShellAction, ShellBanner } from '@dos/ui-contracts';

@Component({
  selector: 'app-shell-host',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DosSurfaceRendererComponent,
    DosShellBannerStripComponent,
  ],
  template: `
    <div
      class="dos-shell-host"
      [class.dos-shell-host--rtl]="isRtl()"
    >
      @if (skipToMainText()) {
        <a class="dos-shell-skip" href="#main-content">{{ skipToMainText() }}</a>
      }
      <header
        class="cds--header dos-shell-zone dos-shell-zone--header"
        data-zone="header"
        role="banner"
        [attr.aria-label]="ariaHeaderLabel() || null"
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
      <div
        class="dos-shell-zone dos-shell-zone--banners"
        data-zone="banners"
        role="region"
        [attr.aria-label]="ariaBannersLabel() || null"
      >
        <dos-shell-banner-strip
          [banners]="shell.shellBannerCandidates()"
          (action)="onBannerAction($event)"
          (dismiss)="onBannerDismiss($event)"
        />
      </div>
      <aside
        class="dos-shell-zone dos-shell-zone--sidebar"
        data-zone="sidebar"
        role="complementary"
        [attr.aria-label]="ariaSidebarLabel() || null"
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
        [attr.aria-label]="ariaMainLabel() || null"
        [attr.data-surface-count]="mainSurfaces().length"
        [attr.data-visual-surface-count]="visualMainSurfaces().length"
      >
        @if (!shell.loaded() && loadingLabel()) {
          <div class="dos-shell-loading" role="status" aria-live="polite">
            {{ loadingLabel() }}
          </div>
        }
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
    .dos-shell-skip {
      position: absolute;
      inset-inline-start: -9999px;
      inset-block-start: 0;
      z-index: 9999;
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      text-decoration: none;
    }
    .dos-shell-skip:focus {
      inset-inline-start: var(--cds-spacing-05);
      inset-block-start: var(--cds-spacing-05);
      outline: 2px solid var(--cds-focus);
    }
    .dos-shell-host {
      display: grid;
      grid-template-columns: 16rem 1fr;
      grid-template-rows: 3rem auto 1fr;
      grid-template-areas:
        'header header'
        'banners banners'
        'sidebar main';
      min-height: 100vh;
    }
    .dos-shell-host--rtl {
      grid-template-columns: 1fr 16rem;
      grid-template-areas:
        'header header'
        'banners banners'
        'main sidebar';
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
      flex: 1 1 auto;
      margin-inline-start: auto;
      gap: var(--cds-spacing-03);
      padding-inline-end: var(--cds-spacing-03);
    }
    .dos-shell-zone--banners {
      grid-area: banners;
    }
    .dos-shell-zone--sidebar {
      grid-area: sidebar;
      background: var(--cds-background);
      border-inline-end: 1px solid var(--cds-border-subtle);
      overflow-y: auto;
    }
    .dos-shell-zone--main {
      grid-area: main; min-width: 0; min-height: 0;
      padding: 0;
      background: var(--cds-layer);
      overflow: auto;
    }
    .dos-shell-loading {
      padding: var(--cds-spacing-07) var(--cds-spacing-06);
      color: var(--cds-text-secondary);
    }
    .dos-shell-zone__main-inner {
      width: 100%;
      margin: 0;
      padding: var(--cds-spacing-07) var(--cds-spacing-06);
      display: flex; flex-direction: column;
      gap: var(--cds-spacing-05);
    }
  `],
})
export class ShellHostComponent {
  private readonly router = inject(Router);
  private readonly prefs = inject(ShellPreferencesService);
  private readonly authLogout = inject(AuthLogoutService);
  private readonly shellError = inject(ShellErrorStateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly shell = inject(WorkspaceShellBindingService);

  /** DB-driven copy from workspace-runtime `chrome.tplStrings` (shell.tpl.*). */
  private readonly tplStrings = computed(() => {
    const chrome = this.shell.chrome() as Record<string, unknown>;
    const raw = chrome['tplStrings'];
    return raw && typeof raw === 'object' ? (raw as Record<string, string>) : {};
  });

  readonly skipToMainText = computed(() => this.tplStrings()['shell.tpl.skip_to_main'] ?? '');
  readonly loadingLabel = computed(() => this.tplStrings()['shell.tpl.loading'] ?? '');
  readonly ariaHeaderLabel = computed(() => this.tplStrings()['shell.tpl.aria.header'] ?? '');
  readonly ariaSidebarLabel = computed(() => this.tplStrings()['shell.tpl.aria.sidebar'] ?? '');
  readonly ariaMainLabel = computed(() => this.tplStrings()['shell.tpl.aria.main'] ?? '');
  readonly ariaBannersLabel = computed(() => this.tplStrings()['shell.tpl.aria.banners'] ?? '');
  readonly isRtl = computed(() => this.prefs.dir() === 'rtl');

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

  constructor() {
    if (typeof window !== 'undefined') {
      const handler = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as ShellAction | { kind?: string; eventName?: string } | null | undefined;
        this.executeShellAction(detail as ShellAction | null | undefined);
      };
      window.addEventListener('dos:shell-action', handler);
      this.destroyRef.onDestroy(() => window.removeEventListener('dos:shell-action', handler));
    }
  }

  onBannerAction(b: ShellBanner): void {
    const a = b.action;
    if (a) this.executeShellAction(a);
  }

  onBannerDismiss(b: ShellBanner): void {
    if (b.id === 'shell-error') {
      this.shellError.clearError();
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
      case 'clear_error':
        this.shellError.clearError();
        break;
      case 'open_command':
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dos:workspace-open-command', { bubbles: true, composed: true }),
          );
        }
        break;
      case 'open_context_tab': {
        const tab = (action as { tab?: string }).tab;
        if (
          typeof window !== 'undefined' &&
          typeof tab === 'string' &&
          tab.length > 0
        ) {
          window.dispatchEvent(
            new CustomEvent('dos:workspace-open-context-tab', {
              bubbles: true,
              composed: true,
              detail: { tab },
            }),
          );
        }
        break;
      }
      case 'close_overlay':
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dos:workspace-close-overlay', { bubbles: true, composed: true }),
          );
        }
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
