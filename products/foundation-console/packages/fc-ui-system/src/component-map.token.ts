// FC_COMPONENT_MAP — typed registry of componentKey -> Angular standalone component.
// Doctrine:
//   - Zero placeholder. Every entry is a real renderer.
//   - Zero fallback. If a runtime componentKey is absent, DosSurfaceRendererComponent
//     emits a visible "Missing component" diagnostic for that key only.
//   - The default map FC_DEFAULT_COMPONENT_MAP is the F7 closure baseline. Host apps
//     may extend it but must not delete approved keys (the closure test enforces this).
import { InjectionToken, type Type } from '@angular/core';
import {
  WorkspaceShellSurfaceComponent,
  WorkspaceHeaderSurfaceComponent,
  WorkspaceSidebarSurfaceComponent,
  WorkspaceContentSurfaceComponent,
  WorkspaceNavGroupComponent,
  WorkspaceNavItemComponent,
  WorkspaceSurfaceComponent,
  WorkspaceEmptyStateComponent,
  WorkspaceDiagnosticComponent,
  WorkspaceLoadingComponent,
  WorkspaceErrorComponent,
} from './surface-components.js';
import {
  FoundationSectionHeadingComponent,
  FoundationTileMetricComponent,
  FoundationListSimpleComponent,
  FoundationDashboardSummaryComponent,
} from './foundation-domain-components.js';

export type FcComponentMap = ReadonlyMap<string, Type<unknown>>;

export const FC_COMPONENT_MAP = new InjectionToken<FcComponentMap>('FC_COMPONENT_MAP');

// Approved closure (F7 baseline + F10 Foundation domain). Deletion of any key fails the closure test.
export const FC_APPROVED_COMPONENT_KEYS: readonly string[] = Object.freeze([
  // F7 baseline (11)
  'workspace.shell',
  'workspace.header',
  'workspace.sidebar',
  'workspace.content',
  'workspace.navGroup',
  'workspace.navItem',
  'workspace.surface',
  'workspace.emptyState',
  'workspace.diagnostic',
  'workspace.loading',
  'workspace.error',
  // F10 Foundation domain (4)
  'foundation.section.heading',
  'foundation.tile.metric',
  'foundation.list.simple',
  'foundation.dashboard.summary',
]);

export const FC_DEFAULT_COMPONENT_MAP: FcComponentMap = Object.freeze(
  new Map<string, Type<unknown>>([
    ['workspace.shell',             WorkspaceShellSurfaceComponent],
    ['workspace.header',            WorkspaceHeaderSurfaceComponent],
    ['workspace.sidebar',           WorkspaceSidebarSurfaceComponent],
    ['workspace.content',           WorkspaceContentSurfaceComponent],
    ['workspace.navGroup',          WorkspaceNavGroupComponent],
    ['workspace.navItem',           WorkspaceNavItemComponent],
    ['workspace.surface',           WorkspaceSurfaceComponent],
    ['workspace.emptyState',        WorkspaceEmptyStateComponent],
    ['workspace.diagnostic',        WorkspaceDiagnosticComponent],
    ['workspace.loading',           WorkspaceLoadingComponent],
    ['workspace.error',             WorkspaceErrorComponent],
    ['foundation.section.heading',  FoundationSectionHeadingComponent],
    ['foundation.tile.metric',      FoundationTileMetricComponent],
    ['foundation.list.simple',      FoundationListSimpleComponent],
    ['foundation.dashboard.summary',FoundationDashboardSummaryComponent],
  ]),
);
