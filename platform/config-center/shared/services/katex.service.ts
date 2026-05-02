import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class KatexService {
  private katex: any = null;

  private async ensureLoaded(): Promise<void> {
    if (this.katex) return;
    this.katex = (await import('katex')).default;
  }

  async renderToString(expression: string, displayMode = false): Promise<string> {
    await this.ensureLoaded();
    try {
      return this.katex.renderToString(expression, {
        displayMode,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `<span class="katex-error">${expression}</span>`;
    }
  }

  async renderToElement(element: HTMLElement, expression: string, displayMode = false): Promise<void> {
    await this.ensureLoaded();
    try {
      this.katex.render(expression, element, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      element.innerHTML = `<span class="katex-error">${expression}</span>`;
    }
  }
}
