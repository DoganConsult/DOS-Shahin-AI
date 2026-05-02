var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, InjectionToken, inject } from '@angular/core';
import { DNA_MODULE_CODES } from '../platform-dna.registry';
export const DNA_NAV_CONTRACT_LOADERS = new InjectionToken('DNA_NAV_CONTRACT_LOADERS');
export function provideDnaNavContractLoaders(loaders) {
    return { provide: DNA_NAV_CONTRACT_LOADERS, useValue: loaders };
}
let PlatformDnaNavSource = class PlatformDnaNavSource {
    id = 'platform-dna';
    loaders = inject(DNA_NAV_CONTRACT_LOADERS, { optional: true }) ?? [];
    async resolve(_ctx) {
        if (this.loaders.length === 0)
            return null;
        const items = [];
        await Promise.all(this.loaders.map(async (loader) => {
            try {
                const nav = await loader.load();
                if (Array.isArray(nav?.items)) {
                    for (const it of nav.items) {
                        items.push(toDnaItem(it, loader.moduleCode));
                    }
                }
            }
            catch {
                // Loader failed — surface via downstream filter pipeline.
            }
        }));
        return items;
    }
};
PlatformDnaNavSource = __decorate([
    Injectable({ providedIn: 'root' })
], PlatformDnaNavSource);
export { PlatformDnaNavSource };
function toDnaItem(it, moduleCode) {
    return {
        id: String(it.id ?? `${moduleCode}.${it.route ?? 'unknown'}`),
        label: String(it.label ?? it.id ?? moduleCode),
        labelKey: it.labelKey,
        route: it.route,
        icon: it.icon,
        requiredPermission: typeof it.permission === 'string' ? it.permission : undefined,
        moduleCode,
        enabled: true, // health-pipeline overrides downstream
        group: typeof it.group === 'string' ? it.group : moduleCode,
        ...{ __tier: 'dna' },
    };
}
export { DNA_MODULE_CODES };
//# sourceMappingURL=platform-dna-nav.source.js.map