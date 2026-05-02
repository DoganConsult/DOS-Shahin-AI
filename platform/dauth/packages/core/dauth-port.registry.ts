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

let current: DAuthPort | null = null;

export function getDAuthPort(): DAuthPort {
  if (!current) {
    throw new Error(
      '[DAuth] DAuthPort has not been instantiated. Call setDAuthPort() ' +
      'in the auth-service bootstrap before consumers query the port.',
    );
  }
  return current;
}

/** Returns null if the port has not been bound — for callers that want to opt-in to a default fallback. */
export function tryGetDAuthPort(): DAuthPort | null {
  return current;
}

export function setDAuthPort(port: DAuthPort): void {
  current = port;
}

export function resetDAuthPort(): void {
  current = null;
}
