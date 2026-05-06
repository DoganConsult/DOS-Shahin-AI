var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject } from '@angular/core';
import { AccessStore } from '../access.store';
/**
 * L6 — Survival fallback (dynamic-nav posture).
 *
 * While `!access.loaded()`, returns an empty list so no hardcoded sidebar
 * stubs appear before bootstrap/session resolves (workspace bootstrap / DB is
 * the source of truth for nav rows).
 *
 * Once loaded, returns `null` so merge prefers contributions from L1..L5 only.
 *
 * Anonymous visitors must not enter workspace chrome without passing shell
 * guards; sidebar stays empty until navigation adapters contribute rows.
 */
let SurvivalFallbackNavSource = class SurvivalFallbackNavSource {
    id = 'survival-fallback';
    access = inject(AccessStore);
    async resolve(_ctx) {
        if (!this.access.loaded())
            return [];
        return null;
    }
};
SurvivalFallbackNavSource = __decorate([
    Injectable({ providedIn: 'root' })
], SurvivalFallbackNavSource);
export { SurvivalFallbackNavSource };
//# sourceMappingURL=survival-fallback.source.js.map