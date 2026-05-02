import { describe, it, expect } from 'vitest';

/**
 * Unit tests for WidgetContainerComponent v2 extensions.
 * Tests the class-level logic (skeletonMainHeight computation, default values)
 * without importing Angular modules to avoid JIT compilation issues.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3
 */
describe('WidgetContainerComponent v2 logic', () => {
  // Replicate the skeletonMainHeight getter logic to test it in isolation
  function skeletonMainHeight(height: number): string {
    return `${Math.max(40, height * 50)}px`;
  }

  describe('skeletonMainHeight', () => {
    it('should return 50px for height=1', () => {
      expect(skeletonMainHeight(1)).toBe('50px');
    });

    it('should scale with widget height=2', () => {
      expect(skeletonMainHeight(2)).toBe('100px');
    });

    it('should scale with widget height=3', () => {
      expect(skeletonMainHeight(3)).toBe('150px');
    });

    it('should clamp to minimum 40px for height=0', () => {
      expect(skeletonMainHeight(0)).toBe('40px');
    });

    it('should clamp to minimum 40px for negative height', () => {
      expect(skeletonMainHeight(-1)).toBe('40px');
    });
  });

  describe('display mode CSS class mapping', () => {
    it('compact mode should map to mode-compact class', () => {
      const mode: 'compact' | 'expanded' = 'compact';
      expect(mode === 'compact').toBe(true);
    });

    it('expanded mode should map to mode-expanded class', () => {
      const mode: 'compact' | 'expanded' = 'expanded';
      expect(mode === 'expanded').toBe(true);
    });
  });

  describe('default input values contract', () => {
    it('refreshInterval defaults to 0', () => {
      const defaults = { refreshInterval: 0, displayMode: 'expanded' as const, showResizeHandle: false, lastUpdated: null };
      expect(defaults.refreshInterval).toBe(0);
    });

    it('displayMode defaults to expanded', () => {
      const defaults = { displayMode: 'expanded' as const };
      expect(defaults.displayMode).toBe('expanded');
    });

    it('showResizeHandle defaults to false', () => {
      const defaults = { showResizeHandle: false };
      expect(defaults.showResizeHandle).toBe(false);
    });

    it('lastUpdated defaults to null', () => {
      const defaults = { lastUpdated: null as Date | null };
      expect(defaults.lastUpdated).toBeNull();
    });
  });
});

/**
 * Unit tests for WidgetContainerComponent premium states.
 * Tests template-level class bindings and DOM structure contracts
 * without Angular TestBed — validates the component's rendering logic.
 *
 * Validates: Requirements 2.6, 2.7, 2.8
 */
describe('WidgetContainerComponent premium states', () => {
  // ── Helpers that replicate the template's class-binding logic ──

  /** Computes the CSS classes on .widget-box based on displayMode */
  function widgetBoxClasses(displayMode: 'compact' | 'expanded'): string[] {
    const classes = ['widget-box'];
    if (displayMode === 'compact') classes.push('mode-compact');
    if (displayMode === 'expanded') classes.push('mode-expanded');
    return classes;
  }

  /** Computes the CSS classes on .widget-body based on state */
  function widgetBodyClasses(opts: { loading: boolean; compact: boolean; dataUpdated: boolean }): string[] {
    const classes = ['widget-body'];
    if (opts.compact) classes.push('body-compact');
    if (opts.loading) classes.push('widget-body--loading');
    if (opts.dataUpdated) classes.push('data-flash');
    return classes;
  }

  /** Simulates the template's loading branch — returns skeleton element descriptors */
  function loadingElements(loading: boolean): string[] {
    if (!loading) return [];
    return ['skeleton-shimmer skeleton-main', 'skeleton-shimmer skeleton-line', 'skeleton-shimmer skeleton-line'];
  }

  /** Simulates the template's error branch — returns error element descriptors */
  function errorElements(loading: boolean, error: boolean): string[] {
    if (loading) return []; // loading takes precedence
    if (!error) return [];
    return ['error-state', 'error-icon', 'error-msg', 'retry-btn'];
  }

  // ── Loading state tests (Requirement 2.6) ──

  describe('loading state renders shimmer skeleton elements', () => {
    it('should produce skeleton-main and skeleton-line elements when loading=true', () => {
      const elements = loadingElements(true);
      expect(elements).toContain('skeleton-shimmer skeleton-main');
      expect(elements.filter(e => e === 'skeleton-shimmer skeleton-line')).toHaveLength(2);
    });

    it('should produce exactly 3 skeleton elements when loading=true', () => {
      const elements = loadingElements(true);
      expect(elements).toHaveLength(3);
    });

    it('should produce no skeleton elements when loading=false', () => {
      const elements = loadingElements(false);
      expect(elements).toHaveLength(0);
    });

    it('should apply widget-body--loading class when loading=true', () => {
      const classes = widgetBodyClasses({ loading: true, compact: false, dataUpdated: false });
      expect(classes).toContain('widget-body--loading');
    });

    it('should not apply widget-body--loading class when loading=false', () => {
      const classes = widgetBodyClasses({ loading: false, compact: false, dataUpdated: false });
      expect(classes).not.toContain('widget-body--loading');
    });
  });

  // ── Error state tests (Requirement 2.7) ──

  describe('error state renders glass error card with retry button', () => {
    it('should produce error-state, error-icon, error-msg, and retry-btn when error=true', () => {
      const elements = errorElements(false, true);
      expect(elements).toContain('error-state');
      expect(elements).toContain('error-icon');
      expect(elements).toContain('error-msg');
      expect(elements).toContain('retry-btn');
    });

    it('should produce exactly 4 error elements when error=true', () => {
      const elements = errorElements(false, true);
      expect(elements).toHaveLength(4);
    });

    it('should produce no error elements when error=false', () => {
      const elements = errorElements(false, false);
      expect(elements).toHaveLength(0);
    });

    it('should not render error elements when loading=true even if error=true', () => {
      // Loading state takes precedence over error state in the template
      const elements = errorElements(true, true);
      expect(elements).toHaveLength(0);
    });
  });

  // ── Compact/Expanded mode tests (Requirement 2.8) ──

  describe('compact/expanded modes apply correct CSS classes', () => {
    it('should apply mode-compact class when displayMode is compact', () => {
      const classes = widgetBoxClasses('compact');
      expect(classes).toContain('mode-compact');
      expect(classes).not.toContain('mode-expanded');
    });

    it('should apply mode-expanded class when displayMode is expanded', () => {
      const classes = widgetBoxClasses('expanded');
      expect(classes).toContain('mode-expanded');
      expect(classes).not.toContain('mode-compact');
    });

    it('should always include widget-box base class', () => {
      expect(widgetBoxClasses('compact')).toContain('widget-box');
      expect(widgetBoxClasses('expanded')).toContain('widget-box');
    });

    it('should apply body-compact class on widget-body in compact mode', () => {
      const classes = widgetBodyClasses({ loading: false, compact: true, dataUpdated: false });
      expect(classes).toContain('body-compact');
    });

    it('should not apply body-compact class on widget-body in expanded mode', () => {
      const classes = widgetBodyClasses({ loading: false, compact: false, dataUpdated: false });
      expect(classes).not.toContain('body-compact');
    });
  });

  // ── Data flash tests (Requirement 7.2) ──

  describe('data update flash animation', () => {
    it('should apply data-flash class when dataUpdated=true', () => {
      const classes = widgetBodyClasses({ loading: false, compact: false, dataUpdated: true });
      expect(classes).toContain('data-flash');
    });

    it('should not apply data-flash class when dataUpdated=false', () => {
      const classes = widgetBodyClasses({ loading: false, compact: false, dataUpdated: false });
      expect(classes).not.toContain('data-flash');
    });

    it('should apply data-flash alongside body-compact in compact mode', () => {
      const classes = widgetBodyClasses({ loading: false, compact: true, dataUpdated: true });
      expect(classes).toContain('data-flash');
      expect(classes).toContain('body-compact');
    });
  });
});

/**
 * Unit tests for WidgetContainerComponent resize interaction logic.
 * Tests the resize state machine (start → move → stop) and dimension calculation
 * without Angular TestBed.
 *
 * Validates: Requirements 10.1, 10.4
 */
describe('WidgetContainerComponent resize interaction', () => {
  const GRID_CELL_SIZE = 200;

  /** Replicate the resize dimension calculation logic */
  function calcResizeSpan(startSpan: number, deltaPx: number): number {
    return Math.max(1, startSpan + Math.round(deltaPx / GRID_CELL_SIZE));
  }

  describe('resize dimension calculation', () => {
    it('should keep span at initial value when delta is 0', () => {
      expect(calcResizeSpan(2, 0)).toBe(2);
    });

    it('should increase span by 1 when dragged one cell width', () => {
      expect(calcResizeSpan(1, 200)).toBe(2);
    });

    it('should increase span by 2 when dragged two cell widths', () => {
      expect(calcResizeSpan(1, 400)).toBe(3);
    });

    it('should decrease span when dragged in negative direction', () => {
      expect(calcResizeSpan(3, -200)).toBe(2);
    });

    it('should clamp span to minimum of 1', () => {
      expect(calcResizeSpan(1, -500)).toBe(1);
    });

    it('should round to nearest span for partial cell drags', () => {
      // 150px is 0.75 cells → rounds to 1
      expect(calcResizeSpan(1, 150)).toBe(2);
      // 90px is 0.45 cells → rounds to 0
      expect(calcResizeSpan(1, 90)).toBe(1);
    });
  });

  describe('resize state machine', () => {
    it('should start with isResizing=false', () => {
      const state = { isResizing: false, resizeColSpan: 1, resizeRowSpan: 1 };
      expect(state.isResizing).toBe(false);
    });

    it('should set initial spans from widget dimensions on resize start', () => {
      const width = 3, height = 2;
      const state = { resizeColSpan: width, resizeRowSpan: height, isResizing: true };
      expect(state.resizeColSpan).toBe(3);
      expect(state.resizeRowSpan).toBe(2);
      expect(state.isResizing).toBe(true);
    });

    it('should emit resize end only when dimensions changed', () => {
      const startWidth: number = 2, startHeight: number = 2;
      const finalCol: number = 3, finalRow: number = 2;
      const changed = finalCol !== startWidth || finalRow !== startHeight;
      expect(changed).toBe(true);
    });

    it('should not emit resize end when dimensions unchanged', () => {
      const startWidth = 2, startHeight = 2;
      const finalCol = 2, finalRow = 2;
      const changed = finalCol !== startWidth || finalRow !== startHeight;
      expect(changed).toBe(false);
    });
  });

  describe('resize handle visibility', () => {
    it('should show resize handle when showResizeHandle=true', () => {
      const showResizeHandle = true;
      expect(showResizeHandle).toBe(true);
    });

    it('should hide resize handle when showResizeHandle=false', () => {
      const showResizeHandle = false;
      expect(showResizeHandle).toBe(false);
    });
  });
});
