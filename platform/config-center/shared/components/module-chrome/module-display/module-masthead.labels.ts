export type MastheadHealthLevel = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface FreshnessDescriptor {
  unit: 'just-now' | 'minutes' | 'hours' | 'days';
  count?: number;
}

export function shouldDisplayHealthTag(level: MastheadHealthLevel | null | undefined): boolean {
  return !!level && level !== 'unknown';
}

export function describeFreshness(nowMs: number, freshnessIso?: string | null): FreshnessDescriptor | null {
  if (!freshnessIso) return null;

  const freshnessMs = new Date(freshnessIso).getTime();
  if (!Number.isFinite(freshnessMs)) return null;

  const diff = Math.max(nowMs - freshnessMs, 0);
  if (diff < 60000) {
    return { unit: 'just-now' };
  }

  if (diff < 3600000) {
    return { unit: 'minutes', count: Math.floor(diff / 60000) };
  }

  if (diff < 86400000) {
    return { unit: 'hours', count: Math.floor(diff / 3600000) };
  }

  return { unit: 'days', count: Math.floor(diff / 86400000) };
}