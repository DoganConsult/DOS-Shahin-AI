import { Component, ChangeDetectionStrategy, signal, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  DosCommandSearchComponent,
  DosWorkspaceStatusBarComponent,
  DosQuickCreateComponent,
  type CommandSearchResult,
  type StatusBarSignal,
  type QuickCreateAction,
} from '@dos/ui-system';

/**
 * Phase WS-2b — App-root mount of always-on workspace-shell surfaces.
 *
 * Mounts the three globally-visible shell wrappers (command-search,
 * status-bar, quick-create) around <router-outlet> so end users actually
 * see them. Per-route chrome (header/sidebar) remains owned by each page
 * to avoid double-chrome. Inbox/context-panel/agent-strip remain
 * toggleable and are mounted by their host pages.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    DosCommandSearchComponent,
    DosWorkspaceStatusBarComponent,
    DosQuickCreateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />

    <!-- Phase WS — global status bar (bottom) -->
    <dos-workspace-status-bar
      class="dos-app-status-bar"
      [signals]="statusSignals"
      [mobileMode]="isMobile()">
    </dos-workspace-status-bar>

    <!-- Phase WS — global quick-create FAB (bottom-end) -->
    <dos-quick-create
      [actions]="quickActions"
      [mobileMode]="isMobile()">
    </dos-quick-create>

    <!-- Phase WS — cmd-k command search palette (toggled by hotkey) -->
    @if (commandPaletteOpen()) {
      <div class="dos-app-command-overlay" (click)="commandPaletteOpen.set(false)">
        <div class="dos-app-command-modal" (click)="$event.stopPropagation()">
          <dos-command-search
            [results]="searchResults"
            [mobileMode]="isMobile()">
          </dos-command-search>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .dos-app-status-bar { position: fixed; inset-inline: 0; inset-block-end: 0; z-index: 50; background: var(--cds-layer, #fff); }
    .dos-app-command-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; }
    .dos-app-command-modal { width: min(640px, 92vw); background: var(--cds-layer, #fff); padding: 1rem; box-shadow: 0 8px 32px rgba(0,0,0,.2); }
  `],
})
export class AppComponent {
  readonly commandPaletteOpen = signal(false);
  readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= 480);

  readonly statusSignals: StatusBarSignal[] = [
    { id: 'system',  label: { i18nKey: 'shell.status.system',  fallback: 'System'  }, level: 'ok',   value: 'healthy' },
    { id: 'tenant',  label: { i18nKey: 'shell.status.tenant',  fallback: 'Tenant'  }, level: 'info', value: 'active' },
    { id: 'sync',    label: { i18nKey: 'shell.status.sync',    fallback: 'Sync'    }, level: 'ok',   value: 'live' },
  ];

  readonly quickActions: QuickCreateAction[] = [
    { id: 'risk',     label: { i18nKey: 'shell.quick.risk',     fallback: 'New risk'      }, hotkey: 'R' },
    { id: 'control',  label: { i18nKey: 'shell.quick.control',  fallback: 'New control'   }, hotkey: 'C' },
    { id: 'evidence', label: { i18nKey: 'shell.quick.evidence', fallback: 'New evidence'  }, hotkey: 'E' },
    { id: 'task',     label: { i18nKey: 'shell.quick.task',     fallback: 'New task'      }, hotkey: 'T' },
  ];

  readonly searchResults: CommandSearchResult[] = [];

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      this.commandPaletteOpen.update(v => !v);
    }
    if (ev.key === 'Escape' && this.commandPaletteOpen()) {
      this.commandPaletteOpen.set(false);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth <= 480);
  }
}
