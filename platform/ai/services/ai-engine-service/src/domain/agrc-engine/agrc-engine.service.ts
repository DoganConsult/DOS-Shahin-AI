/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './services/agrc-engine.service';

export class AgrcEngineService {
  constructor(..._args: any[]) {}
  [key: string]: any;
}