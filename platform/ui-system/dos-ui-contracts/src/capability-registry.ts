/**
 * UI Capability Registry — Dynamic binding
 * ------------------------------------------
 *
 * NO hardcoded entries. The capability registry is populated at bootstrap
 * from the DB (dos.dynamic_ui_component_registry + dos.ui_capability_registry)
 * via the workspace-runtime resolver or /api/ui-os/capabilities endpoint.
 *
 * Migration from static:
 *   - Old: UI_CAPABILITY_REGISTRY = Object.freeze([28 hardcoded entries])
 *   - New: mutable Map populated from resolver at bootstrap
 *
 * Architecture (governed flow):
 *   Module Publisher → DB → Resolver → Bootstrap → registerCapabilities()
 *   → isAllowedComponentKey() / getUiCapability() at render time
 */

import { isApprovedComponentKey, registerComponentKey } from './component-keys.js';

// ── Types (kept — these are contracts, not data) ──────────────────────────

export type UiCapabilityCategory = 'core' | 'layout' | 'domain';
export type UiResponsiveMode = 'mobile' | 'tablet' | 'desktop';

export interface UiCapabilityHook {
  /** e.g. `agent.invoke`, `workflow.transition`, `export.start`. */
  kind: 'agent' | 'workflow' | 'export' | 'realtime' | 'ai';
  /** Stable hook id consumed by Dynamic UI orchestration. */
  id: string;
}

export interface UiCapabilityEntry {
  /** Stable allowlist key. */
  componentKey: string;
  /** Owner package or module folder. */
  owner: string;
  /** core/layout/domain. */
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

// ── Runtime registry (populated from DB at bootstrap) ─────────────────────

const _registry = new Map<string, UiCapabilityEntry>();

/**
 * Populate the capability registry from the resolver bootstrap response.
 * Called once at app init by the bootstrap service.
 * Also syncs to the component-keys approved set.
 */
export function registerCapabilities(entries: ReadonlyArray<UiCapabilityEntry>): void {
  _registry.clear();
  for (const entry of entries) {
    _registry.set(entry.componentKey, entry);
    registerComponentKey(entry.componentKey);
  }
}

/**
 * Register a single capability at runtime (e.g. lazy-loaded module
 * registering a domain widget after bootstrap).
 */
export function registerCapability(entry: UiCapabilityEntry): void {
  _registry.set(entry.componentKey, entry);
  registerComponentKey(entry.componentKey);
}

// ── Query functions (API unchanged) ───────────────────────────────────────

export function getUiCapability(componentKey: string): UiCapabilityEntry | undefined {
  return _registry.get(componentKey);
}

export function isRegisteredComponentKey(componentKey: string): boolean {
  return _registry.has(componentKey);
}

/**
 * Combined allowlist gate: a key is renderable iff it appears in either
 * the component-keys approved set OR the capability registry.
 * Both are populated from DB at bootstrap — zero hardcoded keys.
 */
export function isAllowedComponentKey(componentKey: string): boolean {
  if (_registry.has(componentKey)) return true;
  return isApprovedComponentKey(componentKey);
}

export function listDomainCapabilities(): UiCapabilityEntry[] {
  return Array.from(_registry.values()).filter(e => e.category === 'domain');
}

export function listCoreCapabilities(): UiCapabilityEntry[] {
  return Array.from(_registry.values()).filter(e => e.category === 'core' || e.category === 'layout');
}

export function listAllCapabilities(): UiCapabilityEntry[] {
  return Array.from(_registry.values());
}

/**
 * @deprecated Static array removed. Use listAllCapabilities() instead.
 */
export const UI_CAPABILITY_REGISTRY: ReadonlyArray<UiCapabilityEntry> = [];
