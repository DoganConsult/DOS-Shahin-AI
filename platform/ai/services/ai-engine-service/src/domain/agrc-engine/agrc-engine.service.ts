/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './services/agrc-engine.service';

export const AgrcEngineService = (..._args: any[]): any => { return {} as any; };