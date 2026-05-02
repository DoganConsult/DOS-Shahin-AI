/**
 * KRI Sparkline & Anomaly Detection Utilities
 *
 * Pure functions extracted from risk-kris page component.
 * - buildSparklineSvg: generates a tiny inline SVG sparkline for KRI trend data
 * - buildDrawerTrendSvg: generates a larger SVG trend chart for the detail drawer
 * - computeAnomaly: z-score anomaly detection from trend data points
 */

/* ------------------------------------------------------------------ */
/*  Anomaly info interface                                             */
/* ------------------------------------------------------------------ */
export interface AnomalyInfo {
  kriId: string;
  zScore: number;
  isAnomaly: boolean;
  lastValue: number;
  mean: number;
  stdDev: number;
}

/* ------------------------------------------------------------------ */
/*  Sparkline helper -- builds a tiny SVG string                       */
/* ------------------------------------------------------------------ */
export function buildSparklineSvg(
  points: Array<{ value: number; [key: string]: unknown }>,
  thresholdRed: number,
  thresholdAmber: number,
): string {
  if (!points || points.length < 2) return '';
  const W = 80, H = 28, PAD = 2;
  const vals = points.map(p => p.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, thresholdRed * 1.1);
  const range = max - min || 1;
  const coords = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((v - min) / range) * (H - 2 * PAD);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = coords.join(' ');
  const lastVal = vals[vals.length - 1];
  const color = lastVal >= thresholdRed ? 'var(--error, #ef4444)' : lastVal >= thresholdAmber ? 'var(--warning, #d97706)' : 'var(--success, #22c55e)';
  const redY = H - PAD - ((thresholdRed - min) / range) * (H - 2 * PAD);
  const amberY = H - PAD - ((thresholdAmber - min) / range) * (H - 2 * PAD);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="kri-sparkline" role="img" aria-label="KRI trend: current value ${lastVal}">
    <line x1="${PAD}" y1="${redY.toFixed(1)}" x2="${W - PAD}" y2="${redY.toFixed(1)}" stroke="var(--error, #ef4444)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.4"/>
    <line x1="${PAD}" y1="${amberY.toFixed(1)}" x2="${W - PAD}" y2="${amberY.toFixed(1)}" stroke="var(--warning, #d97706)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.4"/>
    <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${coords[coords.length - 1].split(',')[0]}" cy="${coords[coords.length - 1].split(',')[1]}" r="2" fill="${color}"/>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/*  Anomaly detection -- z-score from trend data                       */
/* ------------------------------------------------------------------ */
export function computeAnomaly(points: Array<{ value: number; [key: string]: unknown }>): { zScore: number; mean: number; stdDev: number } {
  if (!points || points.length < 3) return { zScore: 0, mean: 0, stdDev: 0 };
  const vals = points.map(p => p.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
  const stdDev = Math.sqrt(variance);
  const lastVal = vals[vals.length - 1];
  const zScore = stdDev > 0 ? Math.abs(lastVal - mean) / stdDev : 0;
  return { zScore, mean, stdDev };
}

/* ------------------------------------------------------------------ */
/*  Drawer trend chart -- larger SVG with labels and area fill         */
/* ------------------------------------------------------------------ */
export function buildDrawerTrendSvg(
  points: Array<{ date: string; value: number }>,
  threshold: { red: number; amber: number; green: number },
): string {
  const W = 500, H = 140, PAD = 24, PADT = 10, PADB = 20;
  const vals = points.map(p => p.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, threshold.red * 1.1);
  const range = max - min || 1;

  const coords = vals.map((v, i) => {
    const x = PAD + (i / Math.max(vals.length - 1, 1)) * (W - 2 * PAD);
    const y = PADT + (1 - (v - min) / range) * (H - PADT - PADB);
    return { x, y };
  });

  const polyline = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const lastVal = vals[vals.length - 1];
  const color = lastVal >= threshold.red ? '#ef4444' : lastVal >= threshold.amber ? '#d97706' : '#22c55e';
  const redY = PADT + (1 - (threshold.red - min) / range) * (H - PADT - PADB);
  const amberY = PADT + (1 - (threshold.amber - min) / range) * (H - PADT - PADB);
  const greenY = PADT + (1 - (threshold.green - min) / range) * (H - PADT - PADB);

  /* Date labels (first, middle, last) */
  const dateLabels: string[] = [];
  if (points.length > 0) {
    const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }); } catch { return d; } };
    dateLabels.push(`<text x="${PAD}" y="${H - 2}" font-size="9" fill="#9ca3af">${fmt(points[0].date)}</text>`);
    if (points.length > 2) {
      const mid = Math.floor(points.length / 2);
      const mx = PAD + (mid / Math.max(points.length - 1, 1)) * (W - 2 * PAD);
      dateLabels.push(`<text x="${mx.toFixed(0)}" y="${H - 2}" font-size="9" fill="#9ca3af" text-anchor="middle">${fmt(points[mid].date)}</text>`);
    }
    dateLabels.push(`<text x="${W - PAD}" y="${H - 2}" font-size="9" fill="#9ca3af" text-anchor="end">${fmt(points[points.length - 1].date)}</text>`);
  }

  /* Fill area under the line */
  const areaCoords = [
    ...coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
    `${coords[coords.length - 1].x.toFixed(1)},${(H - PADB).toFixed(1)}`,
    `${coords[0].x.toFixed(1)},${(H - PADB).toFixed(1)}`,
  ].join(' ');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="KRI trend chart">
      <rect width="${W}" height="${H}" fill="none"/>
      <line x1="${PAD}" y1="${redY.toFixed(1)}" x2="${W - PAD}" y2="${redY.toFixed(1)}" stroke="#ef4444" stroke-width="0.7" stroke-dasharray="4,3" opacity="0.5"/>
      <text x="${W - PAD + 3}" y="${(redY + 3).toFixed(1)}" font-size="8" fill="#ef4444">Red</text>
      <line x1="${PAD}" y1="${amberY.toFixed(1)}" x2="${W - PAD}" y2="${amberY.toFixed(1)}" stroke="#d97706" stroke-width="0.7" stroke-dasharray="4,3" opacity="0.5"/>
      <text x="${W - PAD + 3}" y="${(amberY + 3).toFixed(1)}" font-size="8" fill="#d97706">Amber</text>
      <line x1="${PAD}" y1="${greenY.toFixed(1)}" x2="${W - PAD}" y2="${greenY.toFixed(1)}" stroke="#22c55e" stroke-width="0.7" stroke-dasharray="4,3" opacity="0.3"/>
      <polygon points="${areaCoords}" fill="${color}" opacity="0.07"/>
      <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${coords.map((c, i) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${i === coords.length - 1 ? 3.5 : 2}" fill="${color}" opacity="${i === coords.length - 1 ? 1 : 0.6}"/>`).join('\n      ')}
      ${dateLabels.join('\n      ')}
    </svg>`;
}
