import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class HtmlSanitizerService {
  private sanitizer = inject(DomSanitizer);

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.stripDangerous(html));
  }

  sanitizeSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.stripDangerous(svg));
  }

  private stripDangerous(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }
}
