/**
 * Structural shell-frame surface — diagnostic placeholder.
 *
 * The 14 `workspace.frame.*` Dynamic UI catalog rows are catalog-observable
 * structural primitives (Carbon UIShell anchors): cds-header, cds-sidenav,
 * cds-side-nav-items, cds-content, etc. Their visible Carbon DOM is
 * painted by the **visual** shell surfaces (workspace-header,
 * sidebar-nav, module-cards, …) which compose the real Carbon UIShell
 * primitives directly. The frame surfaces themselves render a hidden
 * marker span only — proof that UI-OS resolved a structural primitive,
 * with zero invented labels/icons/routes/markup.
 *
 * Doctrine compliance: render-only, no nav/labels invented, no fallback.
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-shell-frame-structural',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="dos-shell-frame-structural"
      hidden
      aria-hidden="true"
      [attr.data-frame-renderer-key]="rendererKey || null"
      [attr.data-frame-carbon-key]="carbonKey || null"
      [attr.data-frame-component-key]="componentKey || null"
    ></span>
  `,
  styles: [`
    :host { display: contents; }
    .dos-shell-frame-structural { display: none; }
  `],
})
export class DosShellFrameStructuralComponent {
  @Input() rendererKey: string | null = null;
  @Input() carbonKey: string | null = null;
  @Input() componentKey: string | null = null;
}
