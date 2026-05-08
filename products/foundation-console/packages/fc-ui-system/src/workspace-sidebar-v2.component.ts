// WorkspaceSidebarV2 — renders nav.groups + nav.items from runtime, plus sidebar surfaces.
// Doctrine: no static landing entries, no module-tree injection, no i18n-key fallback.
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { FcNavGroup, FcNavItem, FcWorkspaceRuntime, FcWorkspaceSurface } from '@fc/ui-contracts';
import { DosSurfaceRendererComponent } from './dos-surface-renderer.component.js';
import { PageRuntimeService } from './page-runtime.service.js';

interface NavGroupView {
  readonly group: FcNavGroup | null;
  readonly items: readonly FcNavItem[];
}

@Component({
  selector: 'fc-workspace-sidebar-v2',
  standalone: true,
  imports: [DosSurfaceRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="fc-shell__sidebar" role="navigation">
      @for (s of sidebarSurfaces(); track s.surfaceId) {
        <fc-surface-renderer [surface]="s" />
      }

      @for (gv of groupedNav(); track $index) {
        <section class="fc-nav-group">
          @if (gv.group; as g) {
            <header class="fc-nav-group__header">
              {{ g.label.label || g.label.fallback || g.id }}
            </header>
          }
          <ul class="fc-nav-group__items">
            @for (item of gv.items; track item.id) {
              <li class="fc-nav-item" [attr.data-action-kind]="item.action.kind">
                <button type="button" class="fc-nav-item__btn"
                        [attr.data-item-id]="item.id"
                        (click)="dispatch(item)">
                  {{ item.label.label || item.label.fallback || item.id }}
                </button>
              </li>
            }
          </ul>
        </section>
      } @empty {
        <span class="fc-shell__empty">no nav</span>
      }
    </aside>
  `,
  styles: [
    `
      .fc-shell__sidebar { display: block; padding: 0.5rem; min-width: 14rem; border-right: 1px solid currentColor; }
      .fc-nav-group { margin-bottom: 0.75rem; }
      .fc-nav-group__header { font-weight: 600; padding: 0.25rem 0; }
      .fc-nav-group__items { list-style: none; padding: 0; margin: 0; }
      .fc-nav-item { padding: 0.25rem 0; }
      .fc-nav-item__btn {
        background: none; border: none; padding: 0; margin: 0;
        font: inherit; color: inherit; cursor: pointer; text-align: left;
      }
      .fc-shell__empty { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; }
    `,
  ],
})
export class WorkspaceSidebarV2Component {
  private readonly pages = inject(PageRuntimeService);
  readonly runtime = input.required<FcWorkspaceRuntime>();

  dispatch(item: FcNavItem): void {
    if (item.action.kind === 'navigate') {
      const path = item.action.path;
      if (typeof window !== 'undefined' && typeof window.history?.pushState === 'function') {
        if (window.location.pathname !== path) {
          window.history.pushState({}, '', path);
        }
      }
      this.pages.setPath(path);
    }
  }

  readonly sidebarSurfaces = computed<readonly FcWorkspaceSurface[]>(() =>
    this.runtime().shell.surfaces.filter((s) => s.zone === 'sidebar'),
  );

  readonly groupedNav = computed<readonly NavGroupView[]>(() => {
    const r = this.runtime();
    const groups = r.shell.nav.groups;
    const items = r.shell.nav.items;
    const byGroup = new Map<string, FcNavItem[]>();
    const ungrouped: FcNavItem[] = [];
    for (const it of items) {
      if (it.groupId) {
        const list = byGroup.get(it.groupId) ?? [];
        list.push(it);
        byGroup.set(it.groupId, list);
      } else {
        ungrouped.push(it);
      }
    }
    const out: NavGroupView[] = [];
    for (const g of groups) {
      out.push({ group: g, items: Object.freeze(byGroup.get(g.id) ?? []) });
    }
    if (ungrouped.length > 0) {
      out.push({ group: null, items: Object.freeze(ungrouped) });
    }
    return Object.freeze(out);
  });
}
