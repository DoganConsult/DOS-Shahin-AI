var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
/**
 * PlatformReadinessService — DNA-only readiness probe.
 *
 * Probes `GET /api/health/<dna-module-code>` per platform DNA module.
 * Result feeds the nav resolver's tier-aware filter pipeline:
 *   - tier === 'dna' nav items use this for backend-offline / route-not-wired.
 *   - tier === 'module' (tenant-entitled) and tier === 'product' do NOT use it.
 *
 * Foundation gets `/api/health/foundation` today. DAuth/DNOC/DSOC/DOS/AI follow
 * the same convention as their endpoints land. 1.5s per-probe timeout, 404 → 'down'.
 */
let PlatformReadinessService = class PlatformReadinessService {
    http = inject(HttpClient);
    _health = signal({});
    health = this._health.asReadonly();
    /** Per-DNA-module readiness flag. */
    ready(moduleCode, hasRouteCatalog) {
        return hasRouteCatalog && this._health()[moduleCode] === 'up';
    }
    /** Disabled reason for a DNA nav item, or null when ready. */
    disabledReason(moduleCode, hasRouteCatalog) {
        if (!hasRouteCatalog)
            return 'route-not-wired';
        if ((this._health()[moduleCode] ?? 'unknown') !== 'up')
            return 'backend-offline';
        return null;
    }
    /** Probe every DNA module in the registry. Idempotent on per-call. */
    async probeAll(modules) {
        await Promise.all(modules.map((m) => this.probeOne(m)));
    }
    async probeOne(moduleCode) {
        const url = `/api/health/${moduleCode}`;
        const result = await firstValueFrom(this.http.get(url, { withCredentials: true }).pipe(timeout(1500), catchError(() => of(null))));
        const next = { ...this._health() };
        if (result === null) {
            next[moduleCode] = 'down';
        }
        else {
            const s = String(result.status ?? '').toLowerCase();
            next[moduleCode] = s === 'up' || s === 'ok' ? 'up' : 'down';
        }
        this._health.set(next);
    }
};
PlatformReadinessService = __decorate([
    Injectable({ providedIn: 'root' })
], PlatformReadinessService);
export { PlatformReadinessService };
//# sourceMappingURL=platform-readiness.service.js.map