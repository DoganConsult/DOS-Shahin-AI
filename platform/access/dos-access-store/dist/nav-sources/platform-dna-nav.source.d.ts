import { InjectionToken, Provider } from '@angular/core';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';
import { DNA_MODULE_CODES } from '../platform-dna.registry';
/**
 * L2 — Platform DNA nav source.
 *
 * Emits DNA nav items for every platform/<x>/ that the host product has
 * registered a nav-contract loader for. Foundation today (18 items / 3 groups).
 * DAuth/DNOC/DSOC/DOS/AI surface here as their nav contracts land and are
 * registered via `provideDnaNavContractLoaders([...])` at app bootstrap.
 *
 * **Always emitted, never gated by entitlement.** Per-DNA-module health
 * gating is applied later via PlatformReadinessService in the filter pipeline.
 *
 * Why DI tokens (vs. relative imports): keeps @dos/access-store free of
 * cross-package paths into platform/foundation. The host product's bundler
 * resolves the JSON contracts and provides them via the loader registry.
 */
export interface DnaNavContract {
    items?: DnaNavJsonItem[];
}
export interface DnaNavJsonItem {
    id?: string;
    label?: string;
    labelKey?: string;
    route?: string;
    icon?: string;
    permission?: string;
    group?: string;
    order?: number;
}
export interface DnaContractLoader {
    moduleCode: string;
    load(): Promise<DnaNavContract | null>;
}
export declare const DNA_NAV_CONTRACT_LOADERS: InjectionToken<DnaContractLoader[]>;
export declare function provideDnaNavContractLoaders(loaders: DnaContractLoader[]): Provider;
export declare class PlatformDnaNavSource implements NavSource {
    readonly id = "platform-dna";
    private readonly loaders;
    resolve(_ctx: NavCtx): Promise<NavSourceResult>;
}
export { DNA_MODULE_CODES };
