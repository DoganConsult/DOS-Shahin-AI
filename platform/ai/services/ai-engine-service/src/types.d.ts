/// <reference path="../../../../../platform/dauth/packages/shared/src/express-augment.d.ts" />

declare namespace Express {
  interface Response {
    ok(data: any): void;
  }
}

declare module 'json-rules-engine' {
  export class Engine {
    constructor(rules?: any[], options?: any);
    addRule(rule: any): void;
    removeRule(rule: any): void;
    run(facts: any): Promise<{ events: any[]; failureEvents: any[] }>;
  }
  export class Rule {
    constructor(options: any);
  }
}

declare module 'prom-client' {
  export class Counter { constructor(opts: any); inc(labels?: any, value?: number): void; }
  export class Gauge { constructor(opts: any); set(labels: any, value: number): void; inc(labels?: any, value?: number): void; dec(labels?: any, value?: number): void; }
  export class Histogram { constructor(opts: any); observe(labels: any, value: number): void; startTimer(labels?: any): () => void; }
  export class Summary { constructor(opts: any); observe(labels: any, value: number): void; }
  export const register: any;
  export function collectDefaultMetrics(config?: any): void;
}

declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any);
    pipe(dest: any): any;
    text(text: string, x?: number, y?: number, options?: any): this;
    fontSize(size: number): this;
    font(src: string): this;
    moveDown(lines?: number): this;
    addPage(options?: any): this;
    end(): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  export = PDFDocument;
}
