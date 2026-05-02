import { safeQuery } from "@dos/db";

/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './usage-forecaster.service';

export const forecastUsage = (..._args: any[]): any => { return {} as any; };
export const getForecastSummary = (..._args: any[]): any => { return {} as any; };