import type { DOSPort } from '@dos/ports/dos';

let current: DOSPort | null = null;

export function getDOSPort(): DOSPort {
  if (!current) {
    throw new Error(
      '[DOS] DOSPort has not been instantiated. Call setDOSPort() in dos-service bootstrap before consumers query the port.',
    );
  }
  return current;
}

export function tryGetDOSPort(): DOSPort | null {
  return current;
}

export function setDOSPort(port: DOSPort): void {
  current = port;
}

export function resetDOSPort(): void {
  current = null;
}
