// @fc/ui-contracts — typed runtime contracts. camelCase only. Zero legacy fields.
// What flows app ↔ gateway ↔ ui-os ↔ dynamic-ui must conform to these types.

export interface FcI18nLabel {
  readonly i18nKey?: string;
  readonly fallback?: string;
  readonly label?: string;
}

export type FcShellAction =
  | { kind: 'navigate'; path: string }
  | { kind: 'open_external'; url: string }
  | { kind: 'toggle_language' }
  | { kind: 'toggle_theme' }
  | { kind: 'open_context_tab'; tab: string }
  | { kind: 'open_command' }
  | { kind: 'close_overlay' }
  | { kind: 'clear_error' }
  | { kind: 'dispatch_event'; eventName: string; payload?: Record<string, unknown> };

export interface FcWorkspaceSurface {
  readonly surfaceId: string;
  readonly slotKey: string;
  readonly zone: string;
  readonly position: number;
  readonly enabled: boolean;
  readonly version: number;
  readonly componentKey: string;
  readonly componentType: string | null;
  readonly rendererKey: string | null;
  readonly carbonKey: string | null;
  readonly permsRequired: readonly string[];
  readonly props: Record<string, unknown>;
}

export interface FcNavItem {
  readonly id: string;
  readonly label: FcI18nLabel;
  readonly icon?: string;
  readonly action: FcShellAction;
  readonly groupId?: string;
  readonly position: number;
  readonly permsRequired: readonly string[];
}

export interface FcNavGroup {
  readonly id: string;
  readonly label: FcI18nLabel;
  readonly position: number;
  readonly icon?: string;
}

export interface FcWorkspaceRuntime {
  readonly tenantId: string;
  readonly userId: string;
  readonly productCode: string;
  readonly version: number;
  readonly shell: {
    readonly version: number;
    readonly surfaces: readonly FcWorkspaceSurface[];
    readonly zones: Readonly<Record<string, readonly string[]>>;
    readonly nav: {
      readonly groups: readonly FcNavGroup[];
      readonly items: readonly FcNavItem[];
    };
    readonly chrome: Record<string, unknown>;
    readonly shortcuts: readonly { readonly id: string; readonly keys: readonly string[]; readonly action: FcShellAction }[];
    readonly banners: readonly { readonly id: string; readonly severity: 'info' | 'warning' | 'error'; readonly label: FcI18nLabel }[];
    readonly policies: Record<string, unknown>;
  };
}

export interface FcRuntimeConfig {
  readonly productCode: string;
  readonly gatewayUrl: string;
  readonly oidc: { readonly issuerUrl: string; readonly realm: string; readonly clientId: string; readonly redirectUri: string };
  readonly endpoints: {
    readonly workspaceRuntime: string;
    readonly pageRuntime: string;
    readonly nav: string;
    readonly myPermissions: string;
  };
}

export type FcPageDiagnostic =
  | { readonly kind: 'page_not_found'; readonly path: string }
  | { readonly kind: 'page_disabled';  readonly path: string; readonly pageId: string }
  | { readonly kind: 'page_empty';     readonly path: string; readonly pageId: string }
  | { readonly kind: 'invalid_path';   readonly path: string };

export interface FcPageRuntime {
  readonly tenantId: string;
  readonly userId: string;
  readonly productCode: string;
  readonly path: string;
  readonly pageId: string | null;
  readonly version: number;
  readonly title: FcI18nLabel;
  readonly permsRequired: readonly string[];
  readonly surfaces: readonly FcWorkspaceSurface[];
  readonly diagnostics: readonly FcPageDiagnostic[];
}
