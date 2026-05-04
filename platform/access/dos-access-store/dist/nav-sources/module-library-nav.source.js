var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@angular/core';
import { getModuleNavContract, } from '../generated/module-navigation.registry';
/**
 * L3 — Module library nav source.
 *
 * Reads the host product's manifest (`product.manifest.json`) to learn which
 * `modules/<x>/` the product subscribes to via `enabledModules[]`, then
 * resolves each module's nav contract from
 * `platform/access/dos-access-store/src/generated/module-navigation.registry.ts`
 * (codegen scans `**\/contracts/navigation/navigation.json` files at build
 * time — `pnpm modulenav:codegen:write`). Emits DosNavItems tagged tier='module'.
 *
 * For workspace-sidebar context, this source returns Foundation module items
 * when the user has Foundation entitlement. Other modules' internal nav items
 * are not surfaced in the workspace sidebar (they belong in module-context sidebars).
 *
 * Items are tenant-entitled — final visibility decided downstream by the
 * filter pipeline against `access.modules()`. This source emits unfiltered.
 *
 * Path-clean: all modules are kebab-case post-consolidation (no spaces,
 * no "Module" suffix), so `modules/<moduleCode>/contracts/navigation/...`
 * is canonical, and the codegen registers them under that exact moduleCode.
 *
 * If a module has NO navigation.json (most modules today), the registry
 * returns undefined for that code and L5 surfaces the entitlement gap with
 * `route-not-wired` rather than the source emitting empty items.
 */
let ModuleLibraryNavSource = class ModuleLibraryNavSource {
    id = 'module-library';
    async resolve(ctx) {
        const { access } = ctx;
        // For workspace-sidebar context, return Foundation items if entitled.
        // Other modules' internal navigation items are not surfaced in the
        // workspace sidebar — they belong in module-context sidebars (Phase F+).
        const foundationContract = getModuleNavContract('foundation');
        if (foundationContract && access.modules().includes('foundation')) {
            const items = [];
            for (const it of foundationContract.items) {
                items.push(this.toModuleItem(it, 'foundation', foundationContract));
            }
            return items;
        }
        // No Foundation entitlement or no contract → return null
        return null;
    }
    /**
     * Converts a module navigation contract item to a DosNavItem.
     * Reserved for module-context sidebar (Phase F+). Reads the codegen
     * registry directly when the host product is showing a single module's
     * page.
     */
    toModuleItem(it, moduleCode, contract) {
        // Resolve enclosing group: a group whose `items[]` contains this item id.
        const enclosing = (contract.groups || []).find((g) => Array.isArray(g.items) && g.items.includes(it.id));
        const group = it.group ?? enclosing?.id ?? moduleCode;
        return {
            id: String(it.id),
            label: it.label ?? it.id,
            labelKey: it.labelKey,
            route: it.route,
            icon: it.icon,
            badge: it.badge,
            requiredPermission: it.permission,
            moduleCode,
            enabled: true,
            group,
            ...{ __tier: 'module' },
        };
    }
};
ModuleLibraryNavSource = __decorate([
    Injectable({ providedIn: 'root' })
], ModuleLibraryNavSource);
export { ModuleLibraryNavSource };
//# sourceMappingURL=module-library-nav.source.js.map