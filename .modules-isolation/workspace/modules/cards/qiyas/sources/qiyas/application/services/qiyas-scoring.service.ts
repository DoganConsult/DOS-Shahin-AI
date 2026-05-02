/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from '../services/qiyas-scoring.service';

export const QiyasScoringService = (..._args: any[]): any => { return {} as any; };