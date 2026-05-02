import { Injectable } from '@angular/core';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

@Injectable({ providedIn: 'root' })
export class SeverityService {
  readonly levels: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info'];

  getColor(level: SeverityLevel): string {
    const map: Record<SeverityLevel, string> = {
      critical: 'var(--severity-critical)',
      high: 'var(--severity-high)',
      medium: 'var(--severity-medium)',
      low: 'var(--severity-low)',
      info: 'var(--severity-info)',
    };
    return map[level] ?? 'var(--text-secondary)';
  }

  getNumericWeight(level: SeverityLevel): number {
    const map: Record<SeverityLevel, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    return map[level] ?? 0;
  }
}
