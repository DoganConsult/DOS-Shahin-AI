import type { AbacAdapter } from '../ports/abac.port';
export interface AbacStack {
    primary: AbacAdapter;
    shadow?: AbacAdapter;
}
export declare function getAbacAdapters(): AbacStack;
/** Reset factory cache — for tests and hot config reloads. */
export declare function resetAbacFactory(): void;
