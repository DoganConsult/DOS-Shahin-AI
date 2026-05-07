/**
 * Generic surface renderer (Option A — hybrid-static COMPONENT_MAP).
 *
 * Mounts an approved Angular component for a single resolver-emitted
 * workspace surface. Mapping is keyed strictly off the resolver-emitted
 * `rendererKey` (NOT the surfaceId pattern, NOT the raw componentKey).
 * The DB stores `renderer_key` as a stable, vendor-neutral string; this
 * file is the single source of truth for `rendererKey → Angular class`.
 *
 * Doctrine compliance:
 *   - Structural shell-frame primitives (rendererKey='shell.frame')
 *     resolve to `null` here — they are NOT visual content. ShellHost
 *     may consume them for layout policy but never mounts them as
 *     children.
 *   - Unknown / NULL rendererKey → fail-closed: render nothing and log
 *     a single `unsupported-renderer` diagnostic line.
 *   - No fallback labels, icons, routes, or CSS values are injected.
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Type,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { DosWorkspaceHeaderComponent } from './workspace-header.component';
import { DosWorkspaceSidebarComponent } from './workspace-sidebar.component';
import { DosEmptyStateComponent } from '../components/empty-state.component';
import {
  DosShellBrandComponent,
  DosShellWorkspaceTitleComponent,
  DosShellUserMenuComponent,
  DosShellSettingsActionComponent,
  DosShellGlobalQuickActionsComponent,
  DosShellSidebarNavComponent,
  DosShellModuleCardsComponent,
} from './visual-shell-surfaces.component';

export interface WorkspaceSurfaceInput {
  enabled: boolean;
  position: number;
  props: Record<string, unknown>;
  version: number;
  zone?: string;
  surfaceId?: string;
  slotKey?: string;
  componentKey?: string | null;
  componentType?: string | null;
  rendererKey?: string | null;
  carbonKey?: string | null;
}

/**
 * Hybrid-static COMPONENT_MAP — keyed by resolver-emitted rendererKey.
 * `null` entries are intentionally non-visual (shell-frame is structural;
 * ShellHost composes Carbon ui-shell directly, never via this map).
 */
export const COMPONENT_MAP: Readonly<Record<string, Type<unknown> | null>> = Object.freeze({
  'shell.frame': null,
  'shell.workspace-header': DosWorkspaceHeaderComponent as Type<unknown>,
  'shell.workspace-sidebar': DosWorkspaceSidebarComponent as Type<unknown>,
  'shell.empty-state': DosEmptyStateComponent as Type<unknown>,
  'shell.brand': DosShellBrandComponent as Type<unknown>,
  'shell.workspace-title': DosShellWorkspaceTitleComponent as Type<unknown>,
  'shell.user-menu': DosShellUserMenuComponent as Type<unknown>,
  'shell.settings-action': DosShellSettingsActionComponent as Type<unknown>,
  'shell.global-quick-actions': DosShellGlobalQuickActionsComponent as Type<unknown>,
  'shell.sidebar-nav': DosShellSidebarNavComponent as Type<unknown>,
  'shell.module-cards': DosShellModuleCardsComponent as Type<unknown>,
});

@Component({
  selector: 'dos-surface-renderer',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-surface-renderer"
         [attr.data-surface-id]="surface?.surfaceId ?? null"
         [attr.data-slot-key]="surface?.slotKey ?? null"
         [attr.data-zone]="surface?.zone ?? null"
         [attr.data-component-key]="surface?.componentKey ?? null"
         [attr.data-component-type]="surface?.componentType ?? null"
         [attr.data-renderer-key]="surface?.rendererKey ?? null"
         [attr.data-carbon-key]="surface?.carbonKey ?? null"
         [attr.data-map-hit]="mapHit()">
      @if (resolvedComponent(); as cmp) {
        <ng-container *ngComponentOutlet="cmp; inputs: outletInputs()"></ng-container>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .dos-surface-renderer { display: contents; }
  `],
})
export class DosSurfaceRendererComponent implements OnChanges {
  @Input() surface: WorkspaceSurfaceInput | null = null;

  readonly resolvedComponent = signal<Type<unknown> | null>(null);
  readonly mapHit = signal<'hit' | 'structural' | 'miss' | 'no-key'>('no-key');
  readonly outletInputs = computed<Record<string, unknown>>(() => {
    const p = this.surface?.props;
    return p && typeof p === 'object' ? (p as Record<string, unknown>) : {};
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!('surface' in changes)) return;
    const s = this.surface;
    const rendererKey = s?.rendererKey ?? null;
    let cmp: Type<unknown> | null = null;
    let status: 'hit' | 'structural' | 'miss' | 'no-key' = 'no-key';

    if (!rendererKey) {
      status = 'no-key';
    } else if (!(rendererKey in COMPONENT_MAP)) {
      status = 'miss';
    } else {
      const entry = COMPONENT_MAP[rendererKey];
      if (entry === null) {
        status = 'structural';
      } else {
        cmp = entry;
        status = 'hit';
      }
    }

    this.resolvedComponent.set(cmp);
    this.mapHit.set(status);

    // eslint-disable-next-line no-console
    console.info('[surface-renderer] MOUNT', {
      surfaceId: s?.surfaceId ?? null,
      slotKey: s?.slotKey ?? null,
      zone: s?.zone ?? null,
      componentKey: s?.componentKey ?? null,
      componentType: s?.componentType ?? null,
      rendererKey,
      carbonKey: s?.carbonKey ?? null,
      mapStatus: status,
    });

    if (status === 'miss' || status === 'no-key') {
      // eslint-disable-next-line no-console
      console.warn('[surface-renderer] UNSUPPORTED_RENDERER', {
        surfaceId: s?.surfaceId ?? null,
        rendererKey,
        componentKey: s?.componentKey ?? null,
        componentType: s?.componentType ?? null,
      });
    }
  }
}
