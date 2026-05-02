import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private parser: any = null;
  private renderer: any = null;

  private async ensureLoaded(): Promise<void> {
    if (this.parser) return;
    const commonmark = await import('commonmark');
    this.parser = new commonmark.Parser();
    this.renderer = new commonmark.HtmlRenderer({ safe: true });
  }

  async toHtml(markdown: string): Promise<string> {
    await this.ensureLoaded();
    const ast = this.parser.parse(markdown);
    return this.renderer.render(ast);
  }

  async toAst(markdown: string): Promise<any> {
    await this.ensureLoaded();
    return this.parser.parse(markdown);
  }
}
