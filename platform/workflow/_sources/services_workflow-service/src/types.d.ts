/// <reference path="../../../../../platform/dauth/packages/shared/src/express-augment.d.ts" />

/**
 * Ambient declaration for optional peer package `@langchain/openai`.
 * Used only by `lm-studio-gate.activities.ts` for LLM-gate evaluation —
 * the package is not a hard runtime dependency; when present, the full
 * `ChatOpenAI` class is picked up from its real declarations.
 */
declare module '@langchain/openai' {
  // Use `any` on the model alias: the lm-studio-gate chain pipes
  // PromptTemplate → model → StringOutputParser via langchain's Runnable
  // generics, and the ambient shim can't reproduce that inference without
  // pulling the full @langchain/core Runnable types. The runtime uses the
  // real package when installed.
   
  export const ChatOpenAI: any;
   
  export type ChatOpenAI = any;
}

/**
 * Ambient declaration for the `pdfkit` package. The published types are
 * incomplete for the subset the audit activities use; declaring the
 * members explicitly keeps the temporal audit activity compiling when
 * the real types aren't resolved.
 */
declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    pipe(destination: NodeJS.WritableStream): this;
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: Record<string, unknown>): this;
    text(text: string, x: number, y: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(color?: string): this;
    fillColor(color: string): this;
    addPage(options?: Record<string, unknown>): this;
    end(): void;
    on(event: 'data' | 'end' | 'error', listener: (arg: unknown) => void): this;
    readonly page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } };
    readonly y: number;
  }
  export = PDFDocument;
}
