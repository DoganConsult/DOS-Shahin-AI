import { safeQuery } from "@dos/db";

/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from '../../../governance/modules/governance-ai/signal-detection.service';

export const listSignalDetectors = (..._args: any[]): any => { return {} as any; };
export const upsertSignalDetector = (..._args: any[]): any => { return {} as any; };