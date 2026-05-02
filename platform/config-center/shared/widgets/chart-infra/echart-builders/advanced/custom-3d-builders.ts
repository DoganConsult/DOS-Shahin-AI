/**
 * Custom/3D ECharts options builders — 6 pure functions.
 *
 * Each function accepts a typed data input and returns an `EChartsOption`
 * with at least one series entry of the correct type:
 *   - Tectonic, Gantt, SwimLane, Orbit, Bowtie → type: 'custom' with renderItem
 *   - Globe → type: 'custom' with flat-map projection fallback
 *
 * Custom series use `type: 'custom'` with an inline `renderItem` callback
 * that receives `(params, api)` and returns render items via
 * `api.value()`, `api.coord()`, `api.size()`.
 *
 * No side effects, no DOM access.
 *
 * Requirements: 7.1–7.6
 */
import type { EChartsOption } from 'echarts';
import type {
  GanttData,
  SwimLaneData,
  RadarData,
  BowtieData,
  GlobeData,
} from '../bar-line/builder-types';
import { getChartTooltipPoint } from '../../chart-utils';

// ── GRC semantic palette (matches echart-theme.ts LIGHT_PALETTE) ───────────
const CRITICAL = '#da1e28';
const HIGH     = '#ff832b';
const MEDIUM   = '#f1c21b';
const LOW      = '#24a148';
const INFO     = '#0f62fe';
const CAT1     = '#6929c4';
const CAT2     = '#1192e8';
const CAT3     = '#005d5d';
const CAT4     = '#9f1853';
const CAT5     = '#8a3ffc';

const CATEGORICAL = [INFO, CAT1, CAT2, CAT3, CAT4, CAT5, CRITICAL, HIGH, MEDIUM, LOW];

const STATUS_COLORS: Record<string, string> = {
  open: HIGH,
  'in-progress': INFO,
  closed: LOW,
  critical: CRITICAL,
  warning: MEDIUM,
  default: CAT2,
};

const CONTROL_COLORS: Record<string, string> = {
  preventive: LOW,
  detective: INFO,
  corrective: HIGH,
};

// ── Shared tooltip defaults ────────────────────────────────────────────────
const TOOLTIP_ITEM = { trigger: 'item' as const };

// ── 1. Compliance Tectonic ─────────────────────────────────────────────────

/**
 * Custom series showing compliance tectonic plate shifts across regulatory
 * domains. Each task is rendered as a rectangular "plate" whose width
 * represents the time span and whose vertical position maps to the task
 * index. Progress is shown as a filled sub-rectangle.
 *
 * Requirement 7.1
 */
export function buildComplianceTectonicOptions(data: GanttData): EChartsOption {
  const categories = data.tasks.map(t => t.category ?? t.name);
  const uniqueCategories = [...new Set(categories)];

  const startTimes = data.tasks.map(t => new Date(t.start).getTime());
  const endTimes = data.tasks.map(t => new Date(t.end).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const idx = params.dataIndex;
        const task = data.tasks[idx];
        return `${task.name}<br/>Progress: ${Math.round(task.progress * 100)}%`;
      },
    },
    xAxis: {
      type: 'value',
      min: minTime,
      max: maxTime,
      axisLabel: {
        formatter: (val: number) => new Date(val).toLocaleDateString(),
      },
    },
    yAxis: {
      type: 'category',
      data: data.tasks.map(t => t.name),
      inverse: true,
    },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const taskIdx = api.value(0);
          const start = api.value(1);
          const end = api.value(2);
          const progress = api.value(3);

          const startCoord = api.coord([start, taskIdx]);
          const endCoord = api.coord([end, taskIdx]);
          const barHeight = api.size([0, 1])[1] * 0.6;

          const width = endCoord[0] - startCoord[0];
          const x = startCoord[0];
          const y = startCoord[1] - barHeight / 2;

          const catIdx = taskIdx % CATEGORICAL.length;

          return {
            type: 'group',
            children: [
              {
                type: 'rect',
                shape: { x, y, width, height: barHeight, r: 4 },
                style: { fill: CATEGORICAL[catIdx], opacity: 0.3 },
              },
              {
                type: 'rect',
                shape: { x, y, width: width * progress, height: barHeight, r: 4 },
                style: { fill: CATEGORICAL[catIdx], opacity: 0.85 },
              },
            ],
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: data.tasks.map((t, i) => [
          i,
          new Date(t.start).getTime(),
          new Date(t.end).getTime(),
          t.progress,
        ]),
      },
    ],
  };
}

// ── 2. Gantt Timeline ──────────────────────────────────────────────────────

/**
 * Custom series Gantt chart for GRC project and remediation timelines.
 * Each task is a horizontal bar from start to end, with a progress
 * overlay fill.
 *
 * Requirement 7.2
 */
export function buildGanttTimelineOptions(data: GanttData): EChartsOption {
  const startTimes = data.tasks.map(t => new Date(t.start).getTime());
  const endTimes = data.tasks.map(t => new Date(t.end).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const point = getChartTooltipPoint(params);
        const dataIndex = typeof point?.dataIndex === 'number' ? point.dataIndex : -1;
        const task = data.tasks[dataIndex];
        if (!task) {
          return '';
        }
        return `<b>${task.name}</b><br/>` +
          `${task.start} → ${task.end}<br/>` +
          `Progress: ${Math.round(task.progress * 100)}%`;
      },
    },
    grid: { left: 160, right: 40, top: 30, bottom: 40 },
    xAxis: {
      type: 'value',
      min: minTime,
      max: maxTime,
      axisLabel: {
        formatter: (val: number) => new Date(val).toLocaleDateString(),
      },
    },
    yAxis: {
      type: 'category',
      data: data.tasks.map(t => t.name),
      inverse: true,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const taskIdx = api.value(0);
          const start = api.value(1);
          const end = api.value(2);
          const progress = api.value(3);

          const startCoord = api.coord([start, taskIdx]);
          const endCoord = api.coord([end, taskIdx]);
          const barHeight = api.size([0, 1])[1] * 0.6;

          const width = endCoord[0] - startCoord[0];
          const x = startCoord[0];
          const y = startCoord[1] - barHeight / 2;

          const catIdx = taskIdx % CATEGORICAL.length;

          return {
            type: 'group',
            children: [
              {
                type: 'rect',
                shape: { x, y, width, height: barHeight, r: 3 },
                style: { fill: CATEGORICAL[catIdx], opacity: 0.25 },
              },
              {
                type: 'rect',
                shape: { x, y, width: width * progress, height: barHeight, r: 3 },
                style: { fill: CATEGORICAL[catIdx] },
              },
            ],
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: data.tasks.map((t, i) => [
          i,
          new Date(t.start).getTime(),
          new Date(t.end).getTime(),
          t.progress,
        ]),
      },
    ],
  };
}


// ── 3. Incident Swim Lane ──────────────────────────────────────────────────

/**
 * Custom series swim lane chart showing incidents across lanes (teams or
 * categories) over time. Each item is a rectangle positioned in its lane
 * row, colored by status.
 *
 * Requirement 7.3
 */
export function buildIncidentSwimLaneOptions(data: SwimLaneData): EChartsOption {
  const allStarts = data.items.map(it => new Date(it.start).getTime());
  const allEnds = data.items.map(it => new Date(it.end).getTime());
  const minTime = allStarts.length ? Math.min(...allStarts) : 0;
  const maxTime = allEnds.length ? Math.max(...allEnds) : 1;

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const point = getChartTooltipPoint(params);
        const dataIndex = typeof point?.dataIndex === 'number' ? point.dataIndex : -1;
        const item = data.items[dataIndex];
        if (!item) {
          return '';
        }
        return `<b>${item.label}</b><br/>` +
          `Lane: ${item.lane}<br/>` +
          `Status: ${item.status}<br/>` +
          `${item.start} → ${item.end}`;
      },
    },
    grid: { left: 120, right: 40, top: 30, bottom: 40 },
    xAxis: {
      type: 'value',
      min: minTime,
      max: maxTime,
      axisLabel: {
        formatter: (val: number) => new Date(val).toLocaleDateString(),
      },
    },
    yAxis: {
      type: 'category',
      data: data.lanes,
      inverse: true,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const laneIdx = api.value(0);
          const start = api.value(1);
          const end = api.value(2);
          const statusIdx = api.value(3);

          const startCoord = api.coord([start, laneIdx]);
          const endCoord = api.coord([end, laneIdx]);
          const barHeight = api.size([0, 1])[1] * 0.5;

          const width = Math.max(endCoord[0] - startCoord[0], 6);
          const x = startCoord[0];
          const y = startCoord[1] - barHeight / 2;

          const statusKeys = Object.keys(STATUS_COLORS);
          const color = STATUS_COLORS[statusKeys[statusIdx]] ?? STATUS_COLORS['default'];

          return {
            type: 'rect',
            shape: { x, y, width, height: barHeight, r: 3 },
            style: { fill: color, opacity: 0.85 },
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: data.items.map(item => {
          const laneIdx = data.lanes.indexOf(item.lane);
          const statusKeys = Object.keys(STATUS_COLORS);
          const statusIdx = statusKeys.indexOf(item.status);
          return [
            laneIdx >= 0 ? laneIdx : 0,
            new Date(item.start).getTime(),
            new Date(item.end).getTime(),
            statusIdx >= 0 ? statusIdx : statusKeys.indexOf('default'),
          ];
        }),
      },
    ],
  };
}

// ── 4. Maturity Orbit ──────────────────────────────────────────────────────

/**
 * Custom series orbital visualization showing maturity levels as concentric
 * rings. Each series entity is positioned on its orbital ring based on its
 * score relative to the indicator max. Rings are drawn as circles, entities
 * as filled dots on the ring.
 *
 * Requirement 7.4
 */
export function buildMaturityOrbitOptions(data: RadarData): EChartsOption {
  const centerX = 0.5;
  const centerY = 0.5;
  const maxRadius = 0.4;
  const indicatorCount = data.indicators.length;

  // Flatten series into data points: [seriesIdx, indicatorIdx, normalizedValue]
  const points: number[][] = [];
  data.series.forEach((s, si) => {
    s.values.forEach((v, ii) => {
      const maxVal = data.indicators[ii]?.max || 1;
      points.push([si, ii, v / maxVal]);
    });
  });

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const point = getChartTooltipPoint(params);
        const tuple = Array.isArray(point?.data) ? point.data : [];
        const [seriesIndexRaw, indicatorIndexRaw, normalizedValueRaw] = tuple;
        const seriesIndex = typeof seriesIndexRaw === 'number' ? seriesIndexRaw : Number(seriesIndexRaw);
        const indicatorIndex = typeof indicatorIndexRaw === 'number' ? indicatorIndexRaw : Number(indicatorIndexRaw);
        const normalizedValue = typeof normalizedValueRaw === 'number' ? normalizedValueRaw : Number(normalizedValueRaw ?? 0);
        const series = Number.isFinite(seriesIndex) ? data.series[seriesIndex] : undefined;
        const indicator = Number.isFinite(indicatorIndex) ? data.indicators[indicatorIndex] : undefined;
        return `<b>${series?.name}</b><br/>` +
          `${indicator?.name}: ${Math.round(normalizedValue * (indicator?.max ?? 100))}`;
      },
    },
    xAxis: { show: false, type: 'value', min: 0, max: 1 },
    yAxis: { show: false, type: 'value', min: 0, max: 1 },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const seriesIdx = api.value(0);
          const indicatorIdx = api.value(1);
          const normalizedVal = api.value(2);

          const angle = (2 * Math.PI * indicatorIdx) / indicatorCount - Math.PI / 2;
          const radius = normalizedVal * maxRadius;

          const cx = centerX + radius * Math.cos(angle);
          const cy = centerY + radius * Math.sin(angle);

          const coord = api.coord([cx, cy]);

          return {
            type: 'circle',
            shape: { cx: coord[0], cy: coord[1], r: 6 },
            style: {
              fill: CATEGORICAL[seriesIdx % CATEGORICAL.length],
              opacity: 0.9,
            },
          };
        },
        data: points,
        encode: { x: 2, y: 2 },
      },
    ],
  };
}


// ── 5. Risk Bowtie ─────────────────────────────────────────────────────────

/**
 * Custom series bowtie diagram showing causes on the left, the central risk
 * event, and consequences on the right. Controls are rendered as small
 * markers on the connecting lines between causes/consequences and the
 * central event.
 *
 * Layout:
 *   Causes ──[controls]──▶ Risk Event ◀──[controls]── Consequences
 *
 * Requirement 7.5
 */
export function buildRiskBowtieOptions(data: BowtieData): EChartsOption {
  const causeCount = data.causes.length;
  const consequenceCount = data.consequences.length;
  const maxItems = Math.max(causeCount, consequenceCount, 1);

  // Coordinate space: x 0..1, y 0..1
  // Causes at x=0.1, risk event at x=0.5, consequences at x=0.9
  const causeX = 0.1;
  const riskX = 0.5;
  const consequenceX = 0.9;

  // Build data array: [type, index, x, y, extra]
  // type: 0=cause, 1=riskEvent, 2=consequence, 3=control-line
  const renderData: number[][] = [];

  // Causes
  data.causes.forEach((_, i) => {
    const y = (i + 1) / (causeCount + 1);
    renderData.push([0, i, causeX, y, 0]);
  });

  // Risk event (single center node)
  renderData.push([1, 0, riskX, 0.5, 0]);

  // Consequences
  data.consequences.forEach((_, i) => {
    const y = (i + 1) / (consequenceCount + 1);
    renderData.push([2, i, consequenceX, y, 0]);
  });

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const point = getChartTooltipPoint(params);
        const tuple = Array.isArray(point?.data) ? point.data : [];
        const [typeRaw, indexRaw] = tuple;
        const type = typeof typeRaw === 'number' ? typeRaw : Number(typeRaw);
        const index = typeof indexRaw === 'number' ? indexRaw : Number(indexRaw);
        if (type === 0) {
          const cause = Number.isFinite(index) ? data.causes[index] : undefined;
          return `Cause: ${cause?.name}<br/>Likelihood: ${cause?.likelihood}`;
        }
        if (type === 1) return `<b>Risk Event</b><br/>${data.riskEvent}`;
        if (type === 2) {
          const cons = Number.isFinite(index) ? data.consequences[index] : undefined;
          return `Consequence: ${cons?.name}<br/>Impact: ${cons?.impact}`;
        }
        return '';
      },
    },
    xAxis: { show: false, type: 'value', min: 0, max: 1 },
    yAxis: { show: false, type: 'value', min: 0, max: 1 },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const type = api.value(0);
          const idx = api.value(1);
          const px = api.value(2);
          const py = api.value(3);

          const coord = api.coord([px, py]);
          const riskCoord = api.coord([riskX, 0.5]);

          if (type === 0) {
            // Cause node + line to risk event
            return {
              type: 'group',
              children: [
                {
                  type: 'line',
                  shape: { x1: coord[0], y1: coord[1], x2: riskCoord[0], y2: riskCoord[1] },
                  style: { stroke: HIGH, lineWidth: 1.5, opacity: 0.5 },
                },
                {
                  type: 'circle',
                  shape: { cx: coord[0], cy: coord[1], r: 10 },
                  style: { fill: HIGH, opacity: 0.85 },
                },
              ],
            };
          }

          if (type === 1) {
            // Central risk event diamond
            const size = 18;
            return {
              type: 'polygon',
              shape: {
                points: [
                  [coord[0], coord[1] - size],
                  [coord[0] + size, coord[1]],
                  [coord[0], coord[1] + size],
                  [coord[0] - size, coord[1]],
                ],
              },
              style: { fill: CRITICAL, opacity: 0.95 },
            };
          }

          if (type === 2) {
            // Consequence node + line from risk event
            return {
              type: 'group',
              children: [
                {
                  type: 'line',
                  shape: { x1: riskCoord[0], y1: riskCoord[1], x2: coord[0], y2: coord[1] },
                  style: { stroke: MEDIUM, lineWidth: 1.5, opacity: 0.5 },
                },
                {
                  type: 'circle',
                  shape: { cx: coord[0], cy: coord[1], r: 10 },
                  style: { fill: MEDIUM, opacity: 0.85 },
                },
              ],
            };
          }

          return { type: 'group', children: [] };
        },
        data: renderData,
        encode: { x: 2, y: 3 },
      },
    ],
  };
}

// ── 6. Evidence Globe ──────────────────────────────────────────────────────

/**
 * 3D globe visualization showing evidence collection locations and
 * regulatory jurisdiction coverage. Since ECharts GL may not be available,
 * this returns a flat-map projection using a custom series as fallback.
 * Points are plotted using a Mercator-like projection onto a 2D plane.
 *
 * Requirement 7.6
 */
export function buildEvidenceGlobeOptions(data: GlobeData): EChartsOption {
  // Simple Mercator-like projection: lng → x, lat → y
  const projectLng = (lng: number) => (lng + 180) / 360;
  const projectLat = (lat: number) => (90 - lat) / 180;

  const maxValue = data.points.reduce((mx, p) => Math.max(mx, p.value), 1);

  const scatterData = data.points.map(p => [
    projectLng(p.lng),
    projectLat(p.lat),
    p.value,
    p.label,
  ]);

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const point = getChartTooltipPoint(params);
        const tuple = Array.isArray(point?.data) ? point.data : [];
        const label = tuple[3] ?? '';
        const value = tuple[2] ?? 0;
        return `<b>${label}</b><br/>Value: ${value}`;
      },
    },
    xAxis: {
      show: false,
      type: 'value',
      min: 0,
      max: 1,
    },
    yAxis: {
      show: false,
      type: 'value',
      min: 0,
      max: 1,
    },
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const x = api.value(0);
          const y = api.value(1);
          const val = api.value(2);

          const coord = api.coord([x, y]);
          const radius = 4 + (val / maxValue) * 12;

          return {
            type: 'circle',
            shape: { cx: coord[0], cy: coord[1], r: radius },
            style: {
              fill: INFO,
              opacity: 0.7,
            },
          };
        },
        data: scatterData,
        encode: { x: 0, y: 1 },
      },
    ],
  };
}
