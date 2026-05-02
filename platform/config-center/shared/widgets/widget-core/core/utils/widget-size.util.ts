import { WidgetManifest } from '../models/widget-manifest.model';

/** Resolve effective cols respecting min/max constraints. */
export function clampCols(manifest: WidgetManifest, requestedCols: number): number {
  const min = manifest.defaultSize.minCols ?? 1;
  const max = manifest.defaultSize.maxCols ?? 12;
  return Math.max(min, Math.min(max, requestedCols));
}

/** Resolve effective rows respecting min/max constraints. */
export function clampRows(manifest: WidgetManifest, requestedRows: number): number {
  const min = manifest.defaultSize.minRows ?? 1;
  const max = manifest.defaultSize.maxRows ?? 6;
  return Math.max(min, Math.min(max, requestedRows));
}

/** Parse a size string like '6x3' into { cols, rows }. */
export function parseSize(size: string): { cols: number; rows: number } {
  const [cols, rows] = size.split('x').map(Number);
  return { cols: cols || 6, rows: rows || 2 };
}
