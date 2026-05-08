// Real renderer components for the F7 minimum COMPONENT_MAP closure.
// Doctrine:
//   - No placeholder. Each component is a real renderer.
//   - No hardcoded user-facing labels. All display text comes from `surface.props` (camelCase).
//     Missing prop = empty / diagnostic-safe rendering.
//   - All components accept `surface = input.required<FcWorkspaceSurface>()` because the
//     DosSurfaceRenderer outlet binds via `{ surface }`.
//   - The `workspace.shell|header|sidebar|content` keys map to IN-ZONE CONTENT renderers.
//     The outer V2 layout (fc-workspace-shell-v2 / -header-v2 / -sidebar-v2 / -content-host-v2)
//     is composed at the SHELL ROOT and iterates zone surfaces — these surface components
//     must NOT re-instantiate the V2 layout (would cause infinite recursion).
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { FcI18nLabel, FcNavGroup, FcNavItem, FcWorkspaceSurface } from '@fc/ui-contracts';

interface BrandStripProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly brand?: string;
  readonly label?: FcI18nLabel;
}

function labelText(p: BrandStripProps): string {
  if (typeof p.title === 'string' && p.title) return p.title;
  if (typeof p.brand === 'string' && p.brand) return p.brand;
  const l = p.label;
  if (l) {
    if (typeof l.label === 'string' && l.label) return l.label;
    if (typeof l.fallback === 'string' && l.fallback) return l.fallback;
  }
  return '';
}

// ── workspace.shell ─────────────────────────────────────────────────
// Defensive renderer: the runtime resolver should never seed a `workspace.shell`
// inside a zone — the shell is the root composer. If it ever appears as a child
// surface, render an inert marker (no recursion) instead of remounting the shell.
@Component({
  selector: 'fc-workspace-shell-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-zone-shell"
             [attr.data-surface-id]="surface().surfaceId"
             [attr.data-component-key]="surface().componentKey"></section>
  `,
  styles: [`.fc-zone-shell { display: block; }`],
})
export class WorkspaceShellSurfaceComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
}

// ── workspace.header ────────────────────────────────────────────────
// In-zone header CONTENT (brand strip). Reads display text from props only.
@Component({
  selector: 'fc-workspace-header-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-header-brand"
         [attr.data-surface-id]="surface().surfaceId"
         [attr.data-component-key]="surface().componentKey">
      @if (title()) { <span class="fc-header-brand__title">{{ title() }}</span> }
      @if (subtitle()) { <span class="fc-header-brand__sub">{{ subtitle() }}</span> }
    </div>
  `,
  styles: [
    `
      .fc-header-brand { display: inline-flex; align-items: baseline; gap: 0.5rem; }
      .fc-header-brand__title { font-weight: 600; }
      .fc-header-brand__sub { opacity: 0.7; font-size: 0.875rem; }
    `,
  ],
})
export class WorkspaceHeaderSurfaceComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly title = computed<string>(() => labelText(this.surface().props as BrandStripProps));
  readonly subtitle = computed<string>(() => {
    const p = this.surface().props as BrandStripProps;
    return typeof p.subtitle === 'string' ? p.subtitle : '';
  });
}

// ── workspace.sidebar ───────────────────────────────────────────────
// In-zone sidebar CONTENT (section heading inside the sidebar zone).
@Component({
  selector: 'fc-workspace-sidebar-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-sidebar-section"
         [attr.data-surface-id]="surface().surfaceId"
         [attr.data-component-key]="surface().componentKey">
      @if (title()) { <h2 class="fc-sidebar-section__title">{{ title() }}</h2> }
    </div>
  `,
  styles: [
    `
      .fc-sidebar-section { display: block; padding: 0.5rem 0.75rem; }
      .fc-sidebar-section__title { margin: 0; font-size: 0.875rem; font-weight: 600; opacity: 0.85; }
    `,
  ],
})
export class WorkspaceSidebarSurfaceComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly title = computed<string>(() => labelText(this.surface().props as BrandStripProps));
}

// ── workspace.content ───────────────────────────────────────────────
// In-zone main CONTENT (section heading inside the main zone).
@Component({
  selector: 'fc-workspace-content-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-content-section"
             [attr.data-surface-id]="surface().surfaceId"
             [attr.data-component-key]="surface().componentKey">
      @if (title()) { <h2 class="fc-content-section__title">{{ title() }}</h2> }
    </section>
  `,
  styles: [
    `
      .fc-content-section { display: block; padding: 1rem; }
      .fc-content-section__title { margin: 0 0 0.5rem; font-size: 1.125rem; font-weight: 600; }
    `,
  ],
})
export class WorkspaceContentSurfaceComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly title = computed<string>(() => labelText(this.surface().props as BrandStripProps));
}

// ── workspace.navGroup ───────────────────────────────────────────────
interface NavGroupProps { readonly group?: FcNavGroup; readonly items?: readonly FcNavItem[] }
@Component({
  selector: 'fc-workspace-nav-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-nav-group" [attr.data-group-id]="group()?.id">
      @if (group(); as g) {
        <header class="fc-nav-group__header">{{ g.label.label || g.label.fallback || g.id }}</header>
      }
      <ul class="fc-nav-group__items">
        @for (it of items(); track it.id) {
          <li class="fc-nav-item" [attr.data-action-kind]="it.action.kind">
            {{ it.label.label || it.label.fallback || it.id }}
          </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .fc-nav-group { margin-bottom: 0.75rem; }
      .fc-nav-group__header { font-weight: 600; padding: 0.25rem 0; }
      .fc-nav-group__items { list-style: none; padding: 0; margin: 0; }
      .fc-nav-item { padding: 0.25rem 0; }
    `,
  ],
})
export class WorkspaceNavGroupComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly group = computed<FcNavGroup | null>(() => {
    const p = this.surface().props as NavGroupProps;
    return p.group ?? null;
  });
  readonly items = computed<readonly FcNavItem[]>(() => {
    const p = this.surface().props as NavGroupProps;
    return p.items ?? [];
  });
}

// ── workspace.navItem ────────────────────────────────────────────────
interface NavItemProps { readonly item?: FcNavItem }
@Component({
  selector: 'fc-workspace-nav-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as it) {
      <span class="fc-nav-item" [attr.data-item-id]="it.id"
                                [attr.data-action-kind]="it.action.kind">
        {{ it.label.label || it.label.fallback || it.id }}
      </span>
    }
  `,
  styles: [`.fc-nav-item { display: inline-block; padding: 0.25rem 0; }`],
})
export class WorkspaceNavItemComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly item = computed<FcNavItem | null>(() => {
    const p = this.surface().props as NavItemProps;
    return p.item ?? null;
  });
}

// ── workspace.surface ────────────────────────────────────────────────
@Component({
  selector: 'fc-workspace-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-generic-surface"
             [attr.data-surface-id]="surface().surfaceId"
             [attr.data-zone]="surface().zone"
             [attr.data-component-key]="surface().componentKey">
      <span class="fc-generic-surface__sid">{{ surface().surfaceId }}</span>
    </section>
  `,
  styles: [
    `
      .fc-generic-surface { display: block; padding: 0.5rem; }
      .fc-generic-surface__sid { font: 12px/1.4 ui-monospace, monospace; opacity: 0.85; }
    `,
  ],
})
export class WorkspaceSurfaceComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
}

// ── workspace.emptyState ─────────────────────────────────────────────
interface EmptyStateProps { readonly title?: string; readonly description?: string }
@Component({
  selector: 'fc-workspace-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-empty" [attr.data-surface-id]="surface().surfaceId">
      @if (title()) { <h3 class="fc-empty__title">{{ title() }}</h3> }
      @if (description()) { <p class="fc-empty__desc">{{ description() }}</p> }
    </section>
  `,
  styles: [
    `
      .fc-empty { display: block; padding: 1rem; text-align: center; }
      .fc-empty__title { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 600; }
      .fc-empty__desc  { margin: 0; opacity: 0.75; }
    `,
  ],
})
export class WorkspaceEmptyStateComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly title = computed<string>(() => {
    const p = this.surface().props as EmptyStateProps;
    return p.title ?? '';
  });
  readonly description = computed<string>(() => {
    const p = this.surface().props as EmptyStateProps;
    return p.description ?? '';
  });
}

// ── workspace.diagnostic ─────────────────────────────────────────────
interface DiagnosticProps { readonly severity?: 'info' | 'warning' | 'error'; readonly message?: string }
@Component({
  selector: 'fc-workspace-diagnostic',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-diag" [attr.data-severity]="severity()" [attr.data-surface-id]="surface().surfaceId">
      <strong class="fc-diag__sev">{{ severity() }}</strong>
      <span class="fc-diag__msg">{{ message() }}</span>
    </section>
  `,
  styles: [
    `
      .fc-diag { display: inline-flex; gap: 0.5rem; padding: 0.25rem 0.5rem;
                 font: 12px/1.4 ui-monospace, monospace; border: 1px dotted currentColor; }
      .fc-diag[data-severity='error']   { color: #b00020; }
      .fc-diag[data-severity='warning'] { color: #b06f00; }
    `,
  ],
})
export class WorkspaceDiagnosticComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly severity = computed<'info' | 'warning' | 'error'>(() => {
    const p = this.surface().props as DiagnosticProps;
    return p.severity ?? 'info';
  });
  readonly message = computed<string>(() => {
    const p = this.surface().props as DiagnosticProps;
    return p.message ?? '';
  });
}

// ── workspace.loading ────────────────────────────────────────────────
interface LoadingProps { readonly label?: string }
@Component({
  selector: 'fc-workspace-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-loading" role="status" aria-live="polite"
             [attr.data-surface-id]="surface().surfaceId">
      <span class="fc-loading__spinner" aria-hidden="true"></span>
      <span class="fc-loading__label">{{ label() }}</span>
    </section>
  `,
  styles: [
    `
      .fc-loading { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem; }
      .fc-loading__spinner {
        width: 1rem; height: 1rem; border: 2px solid currentColor; border-top-color: transparent;
        border-radius: 50%; animation: fc-spin 0.8s linear infinite;
      }
      @keyframes fc-spin { to { transform: rotate(360deg); } }
    `,
  ],
})
export class WorkspaceLoadingComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly label = computed<string>(() => {
    const p = this.surface().props as LoadingProps;
    return p.label ?? '';
  });
}

// ── workspace.error ──────────────────────────────────────────────────
interface ErrorProps { readonly status?: number; readonly message?: string; readonly code?: string }
@Component({
  selector: 'fc-workspace-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-error" role="alert" [attr.data-surface-id]="surface().surfaceId">
      <strong class="fc-error__head">error</strong>
      @if (code())    { <span class="fc-error__code">{{ code() }}</span> }
      @if (status())  { <span class="fc-error__status">status={{ status() }}</span> }
      @if (message()) { <span class="fc-error__msg">{{ message() }}</span> }
    </section>
  `,
  styles: [
    `
      .fc-error { display: inline-flex; gap: 0.5rem; padding: 0.5rem; color: #b00020;
                  border: 1px solid currentColor; font: 12px/1.4 ui-monospace, monospace; }
    `,
  ],
})
export class WorkspaceErrorComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly status = computed<number>(() => {
    const p = this.surface().props as ErrorProps;
    return typeof p.status === 'number' ? p.status : 0;
  });
  readonly message = computed<string>(() => {
    const p = this.surface().props as ErrorProps;
    return p.message ?? '';
  });
  readonly code = computed<string>(() => {
    const p = this.surface().props as ErrorProps;
    return p.code ?? '';
  });
}
