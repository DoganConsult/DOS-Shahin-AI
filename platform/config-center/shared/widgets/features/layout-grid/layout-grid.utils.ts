import { GridPosition, GridWidget } from './layout-grid.types';

/**
 * Clamps a widget size to the allowed grid range: min 1×1, max 4×3.
 */
export function clampSize(w: number, h: number): { w: number; h: number } {
  return {
    w: Math.max(1, Math.min(4, Math.round(w))),
    h: Math.max(1, Math.min(3, Math.round(h))),
  };
}

/**
 * Snaps a position to the nearest valid grid cell.
 * Clamps to grid bounds: x in [0, columns-w], y in [0, maxRows-h].
 * Also enforces size clamping (min 1×1, max 4×3).
 */
export function snapToGrid(
  pos: { x: number; y: number; w: number; h: number },
  columns: number,
  maxRows: number
): GridPosition {
  const size = clampSize(pos.w, pos.h);
  const x = Math.max(0, Math.min(columns - size.w, Math.round(pos.x)));
  const y = Math.max(0, Math.min(maxRows - size.h, Math.round(pos.y)));
  return { x, y, w: size.w, h: size.h };
}

/**
 * Returns true if two rectangles overlap (share at least one grid cell).
 */
function rectsOverlap(a: GridPosition, b: GridPosition): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Detects overlaps between a widget and all other widgets.
 * Returns IDs of overlapping widgets (excludes the widget itself).
 */
export function detectOverlaps(
  widget: GridWidget,
  allWidgets: GridWidget[]
): string[] {
  return allWidgets
    .filter((other) => other.id !== widget.id && rectsOverlap(widget.position, other.position))
    .map((other) => other.id);
}

/**
 * Resolves overlaps by pushing displaced widgets downward.
 * Processes widgets top-to-bottom (by y then x). When a widget overlaps
 * a previously placed widget, it is pushed below the conflicting widget.
 * Invariant: no two widgets overlap in the result.
 */
export function resolveOverlaps(
  widgets: GridWidget[],
  columns: number
): GridWidget[] {
  if (widgets.length === 0) return [];

  // Sort by y then x for deterministic top-down placement
  const sorted = [...widgets]
    .map((w) => ({
      ...w,
      position: { ...w.position },
    }))
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

  const placed: GridWidget[] = [];

  for (const widget of sorted) {
    let pos = { ...widget.position };

    // Keep pushing down until no overlap with any placed widget
    let hasOverlap = true;
    while (hasOverlap) {
      hasOverlap = false;
      for (const existing of placed) {
        if (rectsOverlap(pos, existing.position)) {
          // Push below the conflicting widget
          pos = { ...pos, y: existing.position.y + existing.position.h };
          hasOverlap = true;
          break; // restart overlap check from the beginning
        }
      }
    }

    placed.push({ ...widget, position: pos });
  }

  return placed;
}

/**
 * Collapses widgets into a single-column layout for mobile.
 * Stacks widgets vertically in order of their original y,x position.
 * All widgets get x=0, w=1. Heights are preserved.
 */
export function collapseToSingleColumn(widgets: GridWidget[]): GridWidget[] {
  if (widgets.length === 0) return [];

  const sorted = [...widgets].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x
  );

  let currentY = 0;
  return sorted.map((widget) => {
    const result: GridWidget = {
      ...widget,
      position: { x: 0, y: currentY, w: 1, h: widget.position.h },
    };
    currentY += widget.position.h;
    return result;
  });
}
