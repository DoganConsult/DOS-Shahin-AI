/**
 * Module Workflow Map — Maps module codes to their default workflow template codes.
 *
 * Used by the workflow engine to determine which template to instantiate
 * when a module triggers a workflow (e.g., policy approval, risk assessment review).
 *
 * This is the canonical map. Module manifests declare workflowTemplateCode,
 * and this map aggregates them for runtime lookup.
 */
export interface ModuleWorkflowMapping {
    moduleCode: string;
    templateCode: string;
    entityTypes: string[];
    slaHours: number;
    autoAssign: boolean;
}
/**
 * Static map of module codes to their workflow configurations.
 * Populated from module manifests at build time and enriched at runtime
 * via registerModuleWorkflow().
 */
export declare const MODULE_WORKFLOW_MAP: Record<string, ModuleWorkflowMapping>;
/**
 * Register a module's workflow mapping at runtime.
 * Called during module initialization.
 */
export declare function registerModuleWorkflow(mapping: ModuleWorkflowMapping): void;
/**
 * Get the workflow mapping for a module.
 */
export declare function getModuleWorkflowMapping(moduleCode: string): ModuleWorkflowMapping | undefined;
/**
 * Get the workflow template code for a module.
 */
export declare function getWorkflowTemplateForModule(moduleCode: string): string | undefined;
/**
 * Get all module codes that have workflow mappings.
 */
export declare function getWorkflowEnabledModules(): string[];
/**
 * Canonical module-code type derived from the MODULE_WORKFLOW_MAP keys.
 * Used by the template/workflow resolution layer to narrow unknown module
 * codes before running lookups.
 */
export type CanonicalModuleCode = keyof typeof MODULE_WORKFLOW_MAP;
/**
 * Platform-only modules have no workflow by design (R2) — dashboard,
 * navigation, admin-only utility surfaces. A request to start a workflow
 * against them is a hard error.
 *
 * Conservative default: any module code NOT present in MODULE_WORKFLOW_MAP
 * is treated as platform-only. This can be overridden at registration time
 * via `registerModuleWorkflow`.
 */
export declare function isPlatformOnly(moduleCode: string): boolean;
