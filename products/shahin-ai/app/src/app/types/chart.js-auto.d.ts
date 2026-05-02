declare module 'chart.js/auto' {
  import { Chart } from 'chart.js';
  export default Chart;
}

declare module 'chart.js' {
  export class Chart {
    constructor(ctx: HTMLCanvasElement | CanvasRenderingContext2D, config: unknown);
    destroy(): void;
    update(mode?: string): void;
    data: unknown;
    options: unknown;
  }
}
