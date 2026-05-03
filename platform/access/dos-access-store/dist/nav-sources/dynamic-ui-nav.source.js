var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
/**
 * L1 — Dynamic UI nav source.
 * GET /api/dynamic-ui/workspace/nav with 800ms timeout. Tolerant: any
 * non-2xx, network error, timeout, or malformed payload returns null
 * (skip layer). The dynamic-ui service is currently `.skipped`, so this
 * source's null-return is the default state until that backend lands.
 */
let DynamicUiNavSource = class DynamicUiNavSource {
    id = 'dynamic-ui';
    http = inject(HttpClient);
    async resolve(_ctx) {
        const result = await firstValueFrom(this.http
            .get('/api/dynamic-ui/workspace/nav', { withCredentials: true })
            .pipe(timeout(800), catchError(() => of(null))));
        if (!result || !Array.isArray(result.items))
            return null;
        return result.items.map((it) => {
            const rawLabel = typeof it.label === 'string' ? it.label.trim() : '';
            const labelLooksLikeKey = rawLabel.includes('.') && !rawLabel.includes(' ');
            return {
                ...it,
                labelKey: it.labelKey ?? (labelLooksLikeKey ? rawLabel : undefined),
                requiredPermission: it.requiredPermission ?? it.permission ?? undefined,
                group: it.group ?? this.id,
            };
        });
    }
};
DynamicUiNavSource = __decorate([
    Injectable({ providedIn: 'root' })
], DynamicUiNavSource);
export { DynamicUiNavSource };
//# sourceMappingURL=dynamic-ui-nav.source.js.map