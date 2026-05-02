/**
 * Canonical Ownership Matrix — single source of truth for module/directory classification.
 *
 * Every module directory and canonical module code maps to exactly one ownership tier.
 * Used by:
 *   - Service taxonomy collapse (Pass 3) — determines where root services should move
 *   - Route surface classification (Pass 4) — determines route surface type
 *   - Permission audit (Pass 5) — validates permission family alignment
 *   - Drift tests — ensures no orphan directories or unclassified modules
 *
 * TIERS:
 *   platform-core    — always-on infrastructure (auth, workspace, org, workflow, notifications)
 *   platform-ai      — AI operating layer (agents, LLM, LangGraph, AI governance)
 *   product-agrc     — Shahin-Ai product domains (risk, compliance, audit, governance, etc.)
 *   edge-external    — external portal surfaces (integrations, vendor portal, regulator portal)
 *   shared-internal  — cross-cutting adapters, connectors, utilities (no business ownership)
 *
 * HIERARCHY: Platform → Product → Module → Tenant → User
 * Subscription is a side-layer. See platform/hierarchy-contracts.ts.
 *
 * SEPARATION RULES:
 *   - platform ≠ product: platform-core/platform-ai must NOT depend on product-agrc
 *   - tenant ≠ product:   tenant config holds overrides, product config holds defaults
 *   - subscription ≠ RBAC: subscription gates entitlement, RBAC gates access
 */
import type { CanonicalModuleCode } from '@dos/types';
import type { HierarchyLayer } from './hierarchy-contracts';
export type OwnershipTier = 'platform-core' | 'platform-ai' | 'product-agrc' | 'edge-external' | 'shared-internal';
export interface ModuleOwnership {
    /** Canonical module code or directory name */
    code: string;
    tier: OwnershipTier;
    /** Hierarchy layer this module belongs to (Platform, Product, or Module as sub-boundary) */
    hierarchyLayer: HierarchyLayer;
    /** Canonical service directory (relative to backend/src/) */
    canonicalServiceDir: string;
    /** Route mount prefix (e.g., '/api/risks') */
    mountPrefix: string;
    /** Permission family prefix (e.g., 'risk' → 'risk.record.read', 'risk.record.write') */
    permissionFamily: string;
    /** Event namespace from MODULE_EVENT_CONTRACTS */
    eventNamespace: string;
    /** Human-readable label for business-facing surfaces */
    labelEn: string;
}
export interface DirectoryOwnership {
    directory: string;
    tier: OwnershipTier;
    /** Which canonical module this directory serves (if any) */
    parentModule?: CanonicalModuleCode;
    description: string;
}
export declare const DIRECTORY_OWNERSHIP: DirectoryOwnership[];
/** Get ownership entry for a canonical module code. */
export declare function getModuleOwnership(code: CanonicalModuleCode): ModuleOwnership;
/** Get all modules belonging to a given tier. */
export declare function getModulesByTier(tier: OwnershipTier): ModuleOwnership[];
/** Get ownership tier for a directory path (relative to backend/src/). */
export declare function getDirectoryTier(directory: string): OwnershipTier | undefined;
/** Get all canonical module ownership entries. */
export declare function getAllModuleOwnership(): Record<CanonicalModuleCode, ModuleOwnership>;
/** Validate that all 25 canonical codes are covered. Throws if any are missing. */
export declare function validateOwnershipCompleteness(): string[];
/** Get all modules belonging to a given hierarchy layer. */
export declare function getModulesByHierarchyLayer(layer: HierarchyLayer): ModuleOwnership[];
/** Validate hierarchy layer consistency: tier and hierarchyLayer must agree. */
export declare function validateHierarchyLayerConsistency(): string[];
