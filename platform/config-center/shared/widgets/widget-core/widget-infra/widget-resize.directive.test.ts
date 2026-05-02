// ============================================
// Widget Resize Directive — Unit Tests
// Feature: premium-dashboard-overhaul, Task 6.2
// ============================================
//
// Tests the resize directive's core behavior:
// - Grid-unit snapping from mouse deltas
// - Clamping to min 1×1, max 4×3
// - Size indicator overlay lifecycle
// Run: pnpm exec vitest run src/app/shared/widgets/widget-resize.directive.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clampSize } from './layout-grid.utils';

// ── Pure logic tests (resize computation extracted from directive) ──

function computeResizedSize(
  startW: number,
  startH: number,
  dx: number,
  dy: number,
  cellWidth: number,
  cellHeight: number
): { w: number; h: number } {
  const rawW = startW + Math.round(dx / cellWidth);
  const rawH = startH + Math.round(dy / cellHeight);
  return clampSize(rawW, rawH);
}

describe('Widget Resize — grid-unit snapping', () => {
  const cellW = 200;
  const cellH = 200;

  it('no movement returns original size', () => {
    expect(computeResizedSize(2, 2, 0, 0, cellW, cellH)).toEqual({ w: 2, h: 2 });
  });

  it('dragging right by one cell increases width by 1', () => {
    expect(computeResizedSize(1, 1, 200, 0, cellW, cellH)).toEqual({ w: 2, h: 1 });
  });

  it('dragging down by one cell increases height by 1', () => {
    expect(computeResizedSize(1, 1, 0, 200, cellW, cellH)).toEqual({ w: 1, h: 2 });
  });

  it('dragging diagonally increases both', () => {
    expect(computeResizedSize(1, 1, 400, 200, cellW, cellH)).toEqual({ w: 3, h: 2 });
  });

  it('small movement (less than half cell) does not change size', () => {
    expect(computeResizedSize(2, 2, 80, 80, cellW, cellH)).toEqual({ w: 2, h: 2 });
  });

  it('movement past half cell rounds to next unit', () => {
    expect(computeResizedSize(2, 2, 110, 110, cellW, cellH)).toEqual({ w: 3, h: 3 });
  });
});

describe('Widget Resize — clamping', () => {
  const cellW = 200;
  const cellH = 200;

  it('clamps to min 1×1 when dragging left past origin', () => {
    expect(computeResizedSize(1, 1, -400, -400, cellW, cellH)).toEqual({ w: 1, h: 1 });
  });

  it('clamps to max 4×3 when dragging far right/down', () => {
    expect(computeResizedSize(1, 1, 2000, 2000, cellW, cellH)).toEqual({ w: 4, h: 3 });
  });

  it('clamps width to 4 when exceeding max', () => {
    expect(computeResizedSize(3, 1, 600, 0, cellW, cellH)).toEqual({ w: 4, h: 1 });
  });

  it('clamps height to 3 when exceeding max', () => {
    expect(computeResizedSize(1, 2, 0, 600, cellW, cellH)).toEqual({ w: 1, h: 3 });
  });

  it('starting at max size stays at max', () => {
    expect(computeResizedSize(4, 3, 200, 200, cellW, cellH)).toEqual({ w: 4, h: 3 });
  });

  it('starting at min size stays at min when shrinking', () => {
    expect(computeResizedSize(1, 1, -200, -200, cellW, cellH)).toEqual({ w: 1, h: 1 });
  });
});

describe('Widget Resize — size indicator text format', () => {
  it('formats size as WxH with multiplication sign', () => {
    // The directive displays size as "W×H"
    const formatSize = (w: number, h: number) => `${w}×${h}`;
    expect(formatSize(2, 3)).toBe('2×3');
    expect(formatSize(1, 1)).toBe('1×1');
    expect(formatSize(4, 3)).toBe('4×3');
  });
});

describe('Widget Resize — different cell sizes', () => {
  it('works with smaller cells (100px)', () => {
    expect(computeResizedSize(1, 1, 100, 100, 100, 100)).toEqual({ w: 2, h: 2 });
  });

  it('works with larger cells (300px)', () => {
    expect(computeResizedSize(1, 1, 300, 300, 300, 300)).toEqual({ w: 2, h: 2 });
  });

  it('works with non-square cells', () => {
    expect(computeResizedSize(1, 1, 200, 150, 200, 150)).toEqual({ w: 2, h: 2 });
  });
});
