/**
 * ECharts Accessibility Helpers — aria-label generation and keyboard navigation
 * for screen reader support and keyboard-driven data point traversal.
 *
 * Requirements: 17.1, 17.2, 17.3
 */

// ── Chart type display names ────────────────────────────────────────────────

const CHART_TYPE_NAMES: Record<string, string> = {
  bar: 'Bar Chart',
  line: 'Line Chart',
  pie: 'Pie Chart',
  scatter: 'Scatter Chart',
  heatmap: 'Heatmap',
  radar: 'Radar Chart',
  gauge: 'Gauge Chart',
  sankey: 'Sankey Diagram',
  graph: 'Network Graph',
  funnel: 'Funnel Chart',
  treemap: 'Treemap',
  boxplot: 'Box Plot',
  parallel: 'Parallel Coordinates',
  themeRiver: 'Theme River',
  custom: 'Custom Chart',
  globe: 'Globe Visualization',
  donut: 'Donut Chart',
  bubble: 'Bubble Chart',
  waterfall: 'Waterfall Chart',
  bullet: 'Bullet Chart',
  tornado: 'Tornado Chart',
  histogram: 'Histogram',
  sparkline: 'Sparkline',
  gantt: 'Gantt Chart',
  swimlane: 'Swim Lane Chart',
  bowtie: 'Bowtie Diagram',
};

/**
 * Returns a human-readable display name for a chart type string.
 * Falls back to title-casing the raw type if not in the lookup table.
 */
export function getChartTypeName(chartType: string): string {
  if (!chartType) return 'Chart';
  const key = chartType.toLowerCase().trim();
  if (CHART_TYPE_NAMES[key]) return CHART_TYPE_NAMES[key];
  // Title-case fallback
  return key.charAt(0).toUpperCase() + key.slice(1) + ' Chart';
}

// ── Data summarisation helpers ──────────────────────────────────────────────

/** Safely count items in common data shapes. */
function summariseData(data: any): string {
  if (data == null) return '';

  // Series array (line, bar, etc.)
  if (Array.isArray(data.series)) {
    const count = data.series.length;
    const totalPoints = data.series.reduce((sum: number, s: Record<string, unknown>) => {
      if (Array.isArray(s.data)) return sum + s.data.length;
      if (Array.isArray(s.values)) return sum + s.values.length;
      return sum;
    }, 0);
    if (totalPoints > 0) {
      return `${count} series with ${totalPoints} data points`;
    }
    return `${count} series`;
  }

  // Segments (donut / pie)
  if (Array.isArray(data.segments)) {
    const total = data.segments.reduce((s: number, seg: Record<string, unknown>) => s + ((seg.value as number) ?? 0), 0);
    return `${data.segments.length} segments totalling ${total}`;
  }

  // Items (bubble, value-gap, bullet, etc.)
  if (Array.isArray(data.items)) {
    return `${data.items.length} items`;
  }

  // Points (anomaly timeline, globe)
  if (Array.isArray(data.points)) {
    return `${data.points.length} data points`;
  }

  // Categories + severities (findings bar)
  if (Array.isArray(data.categories) && Array.isArray(data.severities)) {
    return `${data.categories.length} categories across ${data.severities.length} severity levels`;
  }

  // Categories + groups (board summary)
  if (Array.isArray(data.categories) && Array.isArray(data.groups)) {
    return `${data.categories.length} categories across ${data.groups.length} groups`;
  }

  // Heatmap (rows × columns)
  if (Array.isArray(data.rows) && Array.isArray(data.columns)) {
    return `${data.rows.length} rows by ${data.columns.length} columns`;
  }

  // Sankey / graph nodes + links/edges
  if (Array.isArray(data.nodes)) {
    const linkCount = Array.isArray(data.links)
      ? data.links.length
      : Array.isArray(data.edges)
        ? data.edges.length
        : 0;
    return `${data.nodes.length} nodes and ${linkCount} connections`;
  }

  // Funnel stages
  if (Array.isArray(data.stages)) {
    return `${data.stages.length} stages`;
  }

  // Indicators (radar)
  if (Array.isArray(data.indicators)) {
    return `${data.indicators.length} indicators`;
  }

  // Steps (waterfall)
  if (Array.isArray(data.steps)) {
    return `${data.steps.length} steps`;
  }

  // Factors (tornado)
  if (Array.isArray(data.factors)) {
    return `${data.factors.length} factors`;
  }

  // Bins (histogram / monte carlo)
  if (Array.isArray(data.bins)) {
    return `${data.bins.length} bins`;
  }

  // Tiles (KPI)
  if (Array.isArray(data.tiles)) {
    return `${data.tiles.length} KPI tiles`;
  }

  // Tasks (gantt)
  if (Array.isArray(data.tasks)) {
    return `${data.tasks.length} tasks`;
  }

  // Lanes (swimlane)
  if (Array.isArray(data.lanes)) {
    return `${data.lanes.length} lanes`;
  }

  // Values array (sparkline)
  if (Array.isArray(data.values)) {
    return `${data.values.length} values`;
  }

  // Calendar heatmap
  if (Array.isArray(data.data) && data.year != null) {
    return `${data.data.length} entries for year ${data.year}`;
  }

  // ThemeRiver raw data
  if (Array.isArray(data.data)) {
    return `${data.data.length} data entries`;
  }

  // Gauge single value
  if (typeof data.value === 'number') {
    return `value ${data.value}`;
  }

  // Children (treemap)
  if (Array.isArray(data.children)) {
    return `${data.children.length} top-level categories`;
  }

  // Bowtie
  if (data.riskEvent) {
    const causes = Array.isArray(data.causes) ? data.causes.length : 0;
    const consequences = Array.isArray(data.consequences) ? data.consequences.length : 0;
    return `risk event with ${causes} causes and ${consequences} consequences`;
  }

  return '';
}

// ── generateAriaLabel ───────────────────────────────────────────────────────

/**
 * Generates a descriptive `aria-label` string for an ECharts chart container.
 *
 * The label always includes the chart type display name and, when possible,
 * a concise summary of the data (number of series, data points, segments, etc.).
 *
 * @param chartType - The chart type key (e.g. `'bar'`, `'line'`, `'pie'`, `'heatmap'`)
 * @param data      - The data object passed to the options builder
 * @returns A non-empty descriptive string suitable for `aria-label`
 */
export function generateAriaLabel(chartType: string, data: any): string {
  const typeName = getChartTypeName(chartType);
  const summary = summariseData(data);
  if (summary) {
    return `${typeName}: ${summary}`;
  }
  return typeName;
}

// ── Keyboard navigation helpers ─────────────────────────────────────────────

/**
 * State tracker for keyboard-driven data point navigation within an ECharts
 * instance. Create one per chart and wire it to the container's `keydown` event.
 */
export interface KeyboardNavState {
  /** Index of the currently focused series (for multi-series charts). */
  seriesIndex: number;
  /** Index of the currently focused data point within the active series. */
  dataIndex: number;
}

/**
 * Creates a fresh keyboard navigation state starting at the first data point.
 */
export function createKeyboardNavState(): KeyboardNavState {
  return { seriesIndex: 0, dataIndex: 0 };
}

/**
 * Result returned by `handleChartKeydown` describing what action the wrapper
 * component should take after processing a keyboard event.
 */
export interface KeyboardNavAction {
  /** Whether the event was handled (caller should `preventDefault`). */
  handled: boolean;
  /** Updated navigation state. */
  state: KeyboardNavState;
  /** If `'highlight'`, the wrapper should highlight the data point. */
  action: 'highlight' | 'drilldown' | 'none';
}

/**
 * Resolves the number of series and the data-point count for the currently
 * focused series from an ECharts options object.
 */
function resolveSeriesBounds(options: unknown): { seriesCount: number; dataCount: number; seriesIndex: number } {
  const opts = options as Record<string, any> | null;
  const seriesArr = Array.isArray(opts?.series) ? opts!.series : [];
  const seriesCount = seriesArr.length || 1;
  return { seriesCount, dataCount: 0, seriesIndex: 0 };
}

function getDataCount(options: unknown, seriesIdx: number): number {
  const opts = options as Record<string, any> | null;
  const seriesArr = Array.isArray(opts?.series) ? opts!.series : [];
  if (seriesIdx < 0 || seriesIdx >= seriesArr.length) return 0;
  const s = seriesArr[seriesIdx];
  if (Array.isArray(s?.data)) return s.data.length;
  return 0;
}

function getSeriesCount(options: unknown): number {
  const opts = options as Record<string, any> | null;
  const seriesArr = Array.isArray(opts?.series) ? opts!.series : [];
  return Math.max(seriesArr.length, 1);
}

/**
 * Processes a `keydown` event on the chart container and returns the
 * navigation action the wrapper should perform.
 *
 * Supported keys:
 * - **ArrowRight / ArrowDown** — move to the next data point
 * - **ArrowLeft / ArrowUp** — move to the previous data point
 * - **Tab** — move to the next series (Shift+Tab for previous)
 * - **Enter / Space** — trigger drill-down on the focused data point
 * - **Home** — jump to the first data point
 * - **End** — jump to the last data point
 *
 * @param event   - The keyboard event
 * @param state   - Current navigation state
 * @param options - The current ECharts options object (to determine bounds)
 * @returns The action descriptor
 */
export function handleChartKeydown(
  event: KeyboardEvent,
  state: KeyboardNavState,
  options: unknown,
): KeyboardNavAction {
  const seriesCount = getSeriesCount(options);
  const dataCount = getDataCount(options, state.seriesIndex);
  const next = { ...state };

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown': {
      if (dataCount > 0) {
        next.dataIndex = (state.dataIndex + 1) % dataCount;
      }
      return { handled: true, state: next, action: 'highlight' };
    }

    case 'ArrowLeft':
    case 'ArrowUp': {
      if (dataCount > 0) {
        next.dataIndex = (state.dataIndex - 1 + dataCount) % dataCount;
      }
      return { handled: true, state: next, action: 'highlight' };
    }

    case 'Tab': {
      if (seriesCount > 1) {
        if (event.shiftKey) {
          next.seriesIndex = (state.seriesIndex - 1 + seriesCount) % seriesCount;
        } else {
          next.seriesIndex = (state.seriesIndex + 1) % seriesCount;
        }
        next.dataIndex = 0;
        return { handled: true, state: next, action: 'highlight' };
      }
      // Let Tab propagate if single series so focus can leave the chart
      return { handled: false, state, action: 'none' };
    }

    case 'Enter':
    case ' ': {
      return { handled: true, state, action: 'drilldown' };
    }

    case 'Home': {
      next.dataIndex = 0;
      return { handled: true, state: next, action: 'highlight' };
    }

    case 'End': {
      if (dataCount > 0) {
        next.dataIndex = dataCount - 1;
      }
      return { handled: true, state: next, action: 'highlight' };
    }

    default:
      return { handled: false, state, action: 'none' };
  }
}

/**
 * Dispatches an ECharts `highlight` action for the given navigation state.
 * Call this after `handleChartKeydown` returns `action: 'highlight'`.
 *
 * @param echartsInstance - The ECharts instance (from `(chartInit)`)
 * @param state           - The current keyboard navigation state
 */
export function highlightDataPoint(echartsInstance: unknown, state: KeyboardNavState): void {
  if (!echartsInstance) return;
  const chart = echartsInstance as { dispatchAction(action: Record<string, unknown>): void };
  // Clear previous highlight
  chart.dispatchAction({ type: 'downplay' });
  // Highlight the focused data point
  chart.dispatchAction({
    type: 'highlight',
    seriesIndex: state.seriesIndex,
    dataIndex: state.dataIndex,
  });
  // Show tooltip for the focused data point
  chart.dispatchAction({
    type: 'showTip',
    seriesIndex: state.seriesIndex,
    dataIndex: state.dataIndex,
  });
}

/**
 * Returns the ECharts `aria` configuration object for accessibility.
 * Sets decal patterns for color-blind support and enables label descriptions.
 *
 * Requirement: 17.1
 */
export function getEchartsAriaConfig(): Record<string, unknown> {
  return {
    enabled: true,
    decal: {
      show: true,
    },
    label: {
      description: undefined, // Will be set dynamically per chart
    },
  };
}
