import type { DNOCPort } from '@dos/ports/dnoc';

let current: DNOCPort | null = null;

export function getDNOCPort(): DNOCPort {
  if (!current) {
    throw new Error(
      '[DNOC] DNOCPort has not been instantiated. Call setDNOCPort() in dnoc-service bootstrap before consumers query the port.',
    );
  }
  return current;
}
export function tryGetDNOCPort(): DNOCPort | null { return current; }
export function setDNOCPort(port: DNOCPort): void { current = port; }
export function resetDNOCPort(): void { current = null; }
