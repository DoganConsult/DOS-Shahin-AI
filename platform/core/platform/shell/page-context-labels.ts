const KNOWN_SEGMENT_LABELS: Record<string, string> = {
  ai: 'AI',
  api: 'API',
  kpi: 'KPI',
  sod: 'SoD',
  ui: 'UI',
};

export function routeModuleCode(route: string | null | undefined): string | null {
  if (!route) return null;
  const segment = route.split('?')[0].split('#')[0].split('/').filter(Boolean)[0];
  return segment || null;
}

export function stripModulePrefix(value: string, moduleCode?: string | null): string {
  if (!value || !moduleCode) return value;

  const normalizedModule = moduleCode.replace(/[_\s]+/g, '-').toLowerCase();
  const lowerValue = value.toLowerCase();
  const hyphenPrefix = `${normalizedModule}-`;
  const underscorePrefix = `${normalizedModule}_`;

  if (lowerValue.startsWith(hyphenPrefix)) {
    return value.slice(hyphenPrefix.length);
  }

  if (lowerValue.startsWith(underscorePrefix)) {
    return value.slice(underscorePrefix.length);
  }

  return value;
}

export function humanizeContextToken(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map(segment => {
      const lower = segment.toLowerCase();
      if (KNOWN_SEGMENT_LABELS[lower]) {
        return KNOWN_SEGMENT_LABELS[lower];
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function formatSignatureWidgetLabel(value: string | null | undefined, moduleCode?: string | null): string | null {
  if (!value) return null;
  return humanizeContextToken(stripModulePrefix(value, moduleCode));
}