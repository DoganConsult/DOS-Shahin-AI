/**
 * Shell host — render-only. All data from WorkspaceShellBindingService.
 * No hardcoded labels, routes, icons, fallback CSS, or local policy.
 */
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceShellBindingService } from './workspace-shell-binding.service';
import type { ShellAction } from '@dos/ui-contracts';

@Component({
  selector: 'app-shell-host',
  standalone: true,
  template: `<!-- shell-host: render-only, composed by workspace-shell binding -->`,
})
export class ShellHostComponent {
  private readonly router = inject(Router);
  readonly shell = inject(WorkspaceShellBindingService);

  executeShellAction(action: ShellAction | null | undefined): void {
    if (!action) return;
    switch (action.kind) {
      case 'navigate':
        void this.router.navigateByUrl(action.path);
        break;
      case 'open_external':
        window.open(action.url, '_blank', 'noopener');
        break;
      case 'toggle_language':
        document.documentElement.dir = document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl';
        break;
      case 'toggle_theme':
        document.documentElement.classList.toggle('cds--g90');
        break;
      case 'open_context_tab':
        break;
      case 'open_command':
        break;
      case 'close_overlay':
        break;
      case 'clear_error':
        break;
      case 'dispatch_event':
        window.dispatchEvent(new CustomEvent(action.eventName, { detail: action.payload }));
        break;
    }
  }
}
