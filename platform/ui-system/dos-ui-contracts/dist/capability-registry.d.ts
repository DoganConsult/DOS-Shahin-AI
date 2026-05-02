/**
 * UI Capability Registry
 * ----------------------
 *
 * Single source of truth for every component key that Dynamic UI is
 * permitted to coordinate at runtime — both the generic primitives that
 * live in `@dos/ui-system` and the module-owned domain widgets that
 * register themselves with Dynamic UI.
 *
 * Architecture (governed flow):
 *   Module UI Contract → Dynamic UI Resolver → Component Allowlist
 *   → @dos/ui-system Component → Product Theme
 *
 * Categories
 *   - core      : generic primitive owned by `@dos/ui-system`
 *   - layout    : shell/layout primitive owned by `@dos/ui-system`
 *   - domain    : business widget owned by a module; MUST register here
 *
 * Rules (enforced by CI guards + runtime allowlist):
 *   - Generic/shared UI MUST live in `@dos/ui-system` (category `core`/`layout`).
 *   - Domain widgets stay module-owned (category `domain`) but MUST be
 *     listed in this registry; entries declare `owner`, allowed `modules`,
 *     `responsiveModes`, required `permissions`, and any agent/workflow hooks.
 *   - Any componentKey not present in `UI_CAPABILITY_REGISTRY` is refused
 *     by the Dynamic UI runtime allowlist and fails the
 *     `ui-component-allowlist.mjs` CI guard.
 */
export type UiCapabilityCategory = 'core' | 'layout' | 'domain';
export type UiResponsiveMode = 'mobile' | 'tablet' | 'desktop';
export interface UiCapabilityHook {
    /** e.g. `agent.invoke`, `workflow.transition`, `export.start`. */
    kind: 'agent' | 'workflow' | 'export' | 'realtime' | 'ai';
    /** Stable hook id consumed by Dynamic UI orchestration. */
    id: string;
}
export interface UiCapabilityEntry {
    /** Stable allowlist key (must match `APPROVED_COMPONENT_KEYS` for core/layout). */
    componentKey: string;
    /** Owner package or module folder. */
    owner: string;
    /** core/layout/domain (see top-of-file rules). */
    category: UiCapabilityCategory;
    /** Modules permitted to render this component ('*' means any module). */
    allowedModules: ReadonlyArray<string>;
    /** Required input prop names (Dynamic UI rejects render if missing). */
    requiredInputs: ReadonlyArray<string>;
    /** Responsive modes the component implements/declares. */
    responsiveModes: ReadonlyArray<UiResponsiveMode>;
    /** Permission codes (dot style) required to render. Empty = always-on. */
    permissions: ReadonlyArray<string>;
    /** Agent/workflow/export/realtime/AI hooks this component participates in. */
    hooks: ReadonlyArray<UiCapabilityHook>;
    /** Free-form description used by docs + audit. */
    description: string;
}
/**
 * Seed entries.
 *
 * `core` / `layout` entries mirror APPROVED_COMPONENT_KEYS and are owned by
 * `@dos/ui-system`. `domain` entries are placeholders for the canonical
 * domain widgets named in the architecture spec — they remain module-owned;
 * the registry is the governance contract that lets Dynamic UI render them
 * through the allowlist instead of letting modules ship parallel UI shells.
 */
export declare const UI_CAPABILITY_REGISTRY: ReadonlyArray<UiCapabilityEntry>;
export declare function getUiCapability(componentKey: string): UiCapabilityEntry | undefined;
export declare function isRegisteredComponentKey(componentKey: string): boolean;
/**
 * Combined allowlist gate: a key is renderable iff it appears in either
 * `APPROVED_COMPONENT_KEYS` (legacy core allowlist) or in this capability
 * registry (which strictly supersedes the legacy list and adds domain entries).
 */
export declare function isAllowedComponentKey(componentKey: string): boolean;
export declare function listDomainCapabilities(): UiCapabilityEntry[];
export declare function listCoreCapabilities(): UiCapabilityEntry[];
