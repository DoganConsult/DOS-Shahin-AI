import type { DSOCPort } from '@dos/ports/dsoc';

let current: DSOCPort | null = null;

export function getDSOCPort(): DSOCPort {
  if (!current) {
    throw new Error(
      '[DSOC] DSOCPort has not been instantiated. Call setDSOCPort() in dsoc-service bootstrap before consumers query the port.',
    );
  }
  return current;
}

export function tryGetDSOCPort(): DSOCPort | null {
  return current;
}

export function setDSOCPort(port: DSOCPort): void {
  current = port;
}

export function resetDSOCPort(): void {
  current = null;
}
