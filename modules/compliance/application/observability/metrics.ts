/**
 * In-process metrics registry.
 *
 * Lightweight counter/gauge surface so the module is observable without
 * forcing a Prometheus client dependency. Hosts can mirror these values into
 * their own metrics pipeline by reading `snapshot()`.
 */
export type MetricKind = 'counter' | 'gauge';

export interface MetricEntry {
  name: string;
  kind: MetricKind;
  value: number;
  labels?: Record<string, string>;
  updatedAt: string;
}

const store = new Map<string, MetricEntry>();

const keyOf = (name: string, labels?: Record<string, string>): string => {
  if (!labels) return name;
  const parts = Object.keys(labels).sort().map((k) => `${k}=${labels[k]}`);
  return `${name}{${parts.join(',')}}`;
};

export function incCounter(name: string, by = 1, labels?: Record<string, string>): MetricEntry {
  const k = keyOf(name, labels);
  const now = new Date().toISOString();
  const cur = store.get(k);
  const next: MetricEntry = cur
    ? { ...cur, value: cur.value + by, updatedAt: now }
    : { name, kind: 'counter', value: by, labels, updatedAt: now };
  store.set(k, next);
  return next;
}

export function setGauge(name: string, value: number, labels?: Record<string, string>): MetricEntry {
  const k = keyOf(name, labels);
  const next: MetricEntry = { name, kind: 'gauge', value, labels, updatedAt: new Date().toISOString() };
  store.set(k, next);
  return next;
}

export function snapshot(): MetricEntry[] {
  return [...store.values()];
}

export function __resetMetricsForTest(): void { store.clear(); }

const escapeLabelValue = (v: string): string =>
  v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');

const formatLabels = (labels?: Record<string, string>): string => {
  if (!labels) return '';
  const parts = Object.keys(labels)
    .sort()
    .map((k) => `${k}="${escapeLabelValue(labels[k])}"`);
  return parts.length ? `{${parts.join(',')}}` : '';
};

/**
 * Render the metrics store as Prometheus text exposition format
 * (Content-Type: text/plain; version=0.0.4). One HELP + TYPE block per metric
 * name, then one line per labelset.
 */
export function renderPrometheus(): string {
  const entries = snapshot();
  if (entries.length === 0) return '# no metrics recorded\n';

  const byName = new Map<string, { kind: MetricKind; entries: MetricEntry[] }>();
  for (const e of entries) {
    const bucket = byName.get(e.name) ?? { kind: e.kind, entries: [] };
    bucket.entries.push(e);
    byName.set(e.name, bucket);
  }

  const lines: string[] = [];
  for (const [name, { kind, entries: es }] of byName) {
    lines.push(`# HELP ${name} dos compliance ${kind}`);
    lines.push(`# TYPE ${name} ${kind}`);
    for (const e of es) {
      lines.push(`${name}${formatLabels(e.labels)} ${e.value}`);
    }
  }
  return lines.join('\n') + '\n';
}
