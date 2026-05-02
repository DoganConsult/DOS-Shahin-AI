/* dev-logger — lightweight console wrapper for development diagnostics */
const isDev = typeof ngDevMode === 'undefined' || ngDevMode;

export function devLog(tag: string, ...args: unknown[]): void {
  if (isDev) { console.log(`[${tag}]`, ...args); }
}

export function devWarn(tag: string, ...args: unknown[]): void {
  if (isDev) { console.warn(`[${tag}]`, ...args); }
}

export function devError(tag: string, ...args: unknown[]): void {
  console.error(`[${tag}]`, ...args);
}

export const DevLogger = { log: devLog, warn: devWarn, error: devError };
export default DevLogger;
