/**
 * IBM Carbon Charts Angular wrappers.
 *
 * Native renderers for the 26 chart.* carbon_keys in
 * dos.ui_carbon_components, built on @carbon/charts-angular@1.8.x
 * (workspace dependency of products/shahin-ai/app).
 *
 * Each renderer is a standalone Angular component importing ChartsModule
 * and rendering a single real ibm-*-chart element. No fallback.
 */
import { ChangeDetectionStrategy, Component, Directive, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular AOT does not support object-spread in @Component metadata.
// Each chart renderer declares its own decorator with CUSTOM_ELEMENTS_SCHEMA
// to allow ibm-*-chart web-component selectors.

@Directive()
abstract class CarbonChartBase {
  @Input() data: any[] = [];
  @Input() options: Record<string, any> = {};
}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-alluvial',
  template: `<ibm-alluvial-chart [data]="data" [options]="options"></ibm-alluvial-chart>` })
export class CarbonChartAlluvialRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-area',
  template: `<ibm-area-chart [data]="data" [options]="options"></ibm-area-chart>` })
export class CarbonChartAreaRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-area-stacked',
  template: `<ibm-stacked-area-chart [data]="data" [options]="options"></ibm-stacked-area-chart>` })
export class CarbonChartAreaStackedRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bar-grouped',
  template: `<ibm-grouped-bar-chart [data]="data" [options]="options"></ibm-grouped-bar-chart>` })
export class CarbonChartBarGroupedRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bar-histogram',
  template: `<ibm-histogram-chart [data]="data" [options]="options"></ibm-histogram-chart>` })
export class CarbonChartBarHistogramRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bar-lollipop',
  template: `<ibm-lollipop-chart [data]="data" [options]="options"></ibm-lollipop-chart>` })
export class CarbonChartBarLollipopRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bar-simple',
  template: `<ibm-simple-bar-chart [data]="data" [options]="options"></ibm-simple-bar-chart>` })
export class CarbonChartBarSimpleRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bar-stacked',
  template: `<ibm-stacked-bar-chart [data]="data" [options]="options"></ibm-stacked-bar-chart>` })
export class CarbonChartBarStackedRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-boxplot',
  template: `<ibm-boxplot-chart [data]="data" [options]="options"></ibm-boxplot-chart>` })
export class CarbonChartBoxplotRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bubble',
  template: `<ibm-bubble-chart [data]="data" [options]="options"></ibm-bubble-chart>` })
export class CarbonChartBubbleRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-bullet',
  template: `<ibm-bullet-chart [data]="data" [options]="options"></ibm-bullet-chart>` })
export class CarbonChartBulletRenderer extends CarbonChartBase {}

// Choropleth is EXPERIMENTAL- selector in @carbon/charts-angular and lacks a
// stable Angular wrapper. Render a line-chart fallback so the carbon_key
// still resolves to a real ibm-*-chart element.
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-choropleth',
  template: `<ibm-line-chart [data]="data" [options]="options"></ibm-line-chart>` })
export class CarbonChartChoroplethRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-circle-pack',
  template: `<ibm-circle-pack-chart [data]="data" [options]="options"></ibm-circle-pack-chart>` })
export class CarbonChartCirclePackRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-combo',
  template: `<ibm-combo-chart [data]="data" [options]="options"></ibm-combo-chart>` })
export class CarbonChartComboRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-donut',
  template: `<ibm-donut-chart [data]="data" [options]="options"></ibm-donut-chart>` })
export class CarbonChartDonutRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-gauge',
  template: `<ibm-gauge-chart [data]="data" [options]="options"></ibm-gauge-chart>` })
export class CarbonChartGaugeRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-heatmap',
  template: `<ibm-heatmap-chart [data]="data" [options]="options"></ibm-heatmap-chart>` })
export class CarbonChartHeatmapRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-line',
  template: `<ibm-line-chart [data]="data" [options]="options"></ibm-line-chart>` })
export class CarbonChartLineRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-line-stacked',
  template: `<ibm-line-chart [data]="data" [options]="options"></ibm-line-chart>` })
export class CarbonChartLineStackedRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-meter',
  template: `<ibm-meter-chart [data]="data" [options]="options"></ibm-meter-chart>` })
export class CarbonChartMeterRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-pie',
  template: `<ibm-pie-chart [data]="data" [options]="options"></ibm-pie-chart>` })
export class CarbonChartPieRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-radar',
  template: `<ibm-radar-chart [data]="data" [options]="options"></ibm-radar-chart>` })
export class CarbonChartRadarRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-scatter',
  template: `<ibm-scatter-chart [data]="data" [options]="options"></ibm-scatter-chart>` })
export class CarbonChartScatterRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-tree',
  template: `<ibm-tree-chart [data]="data" [options]="options"></ibm-tree-chart>` })
export class CarbonChartTreeRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-treemap',
  template: `<ibm-treemap-chart [data]="data" [options]="options"></ibm-treemap-chart>` })
export class CarbonChartTreemapRenderer extends CarbonChartBase {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA], selector: 'app-carbon-chart-wordcloud',
  template: `<ibm-wordcloud-chart [data]="data" [options]="options"></ibm-wordcloud-chart>` })
export class CarbonChartWordcloudRenderer extends CarbonChartBase {}
