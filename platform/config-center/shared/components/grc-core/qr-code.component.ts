import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  template: `
    @if (qrDataUrl) {
      <img [src]="safeUrl" [alt]="altText" [width]="size" [height]="size" class="qr-code-img" />
    } @else {
      <div class="qr-placeholder" [style.width.px]="size" [style.height.px]="size">
        <span>QR</span>
      </div>
    }
  `,
  styles: [`
    .qr-code-img {
      border-radius: var(--radius-xs);
      border: 1px solid var(--ui-03, #e0e0e0);
    }
    .qr-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ui-02, #f4f4f4);
      border: 1px dashed var(--ui-03, #e0e0e0);
      border-radius: var(--radius-xs);
      color: var(--text-03, #a8a8a8);
      font-size: var(--font-size-sm);
    }
  `],
})
export class QrCodeComponent implements OnChanges {
  @Input() data = '';
  @Input() size = 200;
  @Input() altText = 'QR Code';
  @Input() fetchFromApi = false;
  @Input() apiEndpoint = '';

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  qrDataUrl: string | null = null;
  safeUrl: SafeUrl | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['apiEndpoint']) {
      this.generateQR();
    }
  }

  private async generateQR(): Promise<void> {
    if (this.fetchFromApi && this.apiEndpoint) {
      this.http.get<{ qrCode: string }>(this.apiEndpoint).subscribe({
        next: (res) => {
          this.qrDataUrl = res.qrCode;
          this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(res.qrCode);
        },
        error: () => {
          this.qrDataUrl = null;
          this.safeUrl = null;
        },
      });
      return;
    }

    if (!this.data) {
      this.qrDataUrl = null;
      this.safeUrl = null;
      return;
    }

    try {
      const QRCode: any = await import('qrcode');
      const mod = QRCode.default || QRCode;
      this.qrDataUrl = await mod.toDataURL(this.data, { width: this.size, margin: 2 });
      this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.qrDataUrl);
    } catch {
      this.qrDataUrl = null;
      this.safeUrl = null;
    }
  }
}
