/**
 * DAuth port registry.
 *
 * Holds the singleton `DAuthPort` instance built by the runtime service
 * (auth-service) at bootstrap. Other platform modules and products call
 * `getDAuthPort()` to obtain the typed surface and never reach into
 * DAuth's internals.
 *
 * `setDAuthPort()` is invoked exactly once on bootstrap. Tests can call
 * `resetDAuthPort()` between cases.
 */
import type { DAuthPort } from '@dos/ports/dauth';
export declare function getDAuthPort(): DAuthPort;
/** Returns null if the port has not been bound — for callers that want to opt-in to a default fallback. */
export declare function tryGetDAuthPort(): DAuthPort | null;
export declare function setDAuthPort(port: DAuthPort): void;
export declare function resetDAuthPort(): void;
