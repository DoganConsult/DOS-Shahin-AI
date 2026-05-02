import type { RebacAdapter } from '../ports/rebac.port';
export interface RebacStack {
    primary: RebacAdapter;
    shadow?: RebacAdapter;
}
export declare function getRebacAdapters(): RebacStack;
export declare function resetRebacFactory(): void;
