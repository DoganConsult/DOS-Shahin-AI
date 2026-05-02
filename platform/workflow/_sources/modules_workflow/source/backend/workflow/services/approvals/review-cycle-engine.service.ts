import { safeQuery } from "@dos/db";

/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './review-cycle-engine.service';

export const getReviewCalendar = (..._args: any[]): any => { return {} as any; };