import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HapticFeedbackService } from './haptic-feedback.service';
import { Router } from '@angular/router';

export interface QrScanResult {
  /** Raw text content of the QR code */
  text: string;
  /** Parsed entity type if it's a Shahin GRC QR code */
  entityType?: 'risk' | 'control' | 'evidence' | 'asset' | 'policy' | 'framework';
  /** Entity ID if parsed from a Shahin GRC QR code */
  entityId?: string;
  /** Whether this is a recognized Shahin GRC QR code */
  isGrcCode: boolean;
}

/**
 * QR code scanner for asset tagging and control evidence workflows.
 *
 * Use cases:
 * - Scan asset QR code during physical audit → link evidence to asset
 * - Scan control QR code → open control detail + evidence capture
 * - Scan equipment tags → auto-populate evidence metadata
 * - Scan document QR → verify evidence chain integrity
 *
 * QR format: shahingrc://control/abc-123 or shahingrc://asset/xyz-456
 */
@Injectable({ providedIn: 'root' })
export class QrScannerService {
  private readonly isNative = Capacitor.isNativePlatform();
  private readonly haptic = inject(HapticFeedbackService);
  private readonly router = inject(Router);

  /**
   * Open the QR code scanner.
   * Uses the camera to capture an image and decode QR codes.
   */
  async scan(): Promise<QrScanResult | null> {
    if (!this.isNative) return null;

    try {
      // Try native barcode scanner plugin first
      const BarcodeScanner = (window as unknown).Capacitor?.Plugins?.BarcodeScanner;
      if (BarcodeScanner) {
        const result = await BarcodeScanner.scan();
        if (result.hasContent) {
          await this.haptic.success();
          return this.parseQrContent(result.content);
        }
        return null;
      }

      // Fallback: capture photo and use web-based QR detection
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
      });

      if (photo.dataUrl) {
        const decoded = await this.decodeFromImage(photo.dataUrl);
        if (decoded) {
          await this.haptic.success();
          return this.parseQrContent(decoded);
        }
      }

      return null;
    } catch {
      return null; // User cancelled or error
    }
  }

  /**
   * Parse QR code content and extract Shahin GRC entity references.
   */
  parseQrContent(raw: string): QrScanResult {
    // Try Shahin GRC deep link format: shahingrc://control/abc-123
    const schemeMatch = raw.match(/^shahingrc:\/\/(\w+)\/(.+)$/);
    if (schemeMatch) {
      return {
        text: raw,
        entityType: schemeMatch[1] as QrScanResult['entityType'],
        entityId: schemeMatch[2],
        isGrcCode: true,
      };
    }

    // Try universal link format: https://grc.shahin-grc.sa/controls/abc-123
    const urlMatch = raw.match(/shahin-grc\.sa\/(\w+)\/(.+)/);
    if (urlMatch) {
      const typeMap: Record<string, QrScanResult['entityType']> = {
        controls: 'control',
        risks: 'risk',
        evidence: 'evidence',
        policies: 'policy',
        frameworks: 'framework',
      };
      return {
        text: raw,
        entityType: typeMap[urlMatch[1]],
        entityId: urlMatch[2],
        isGrcCode: !!typeMap[urlMatch[1]],
      };
    }

    // Unknown QR code — return raw text
    return { text: raw, isGrcCode: false };
  }

  /**
   * Scan and navigate: opens scanner and auto-navigates to the entity.
   */
  async scanAndNavigate(): Promise<QrScanResult | null> {
    const result = await this.scan();
    if (result?.isGrcCode && result.entityType && result.entityId) {
      const routeMap: Record<string, string> = {
        risk: '/risks',
        control: '/controls',
        evidence: '/evidence',
        policy: '/policies',
        framework: '/frameworks',
        asset: '/assets',
      };
      const base = routeMap[result.entityType];
      if (base) {
        this.router.navigateByUrl(`${base}/${result.entityId}`);
      }
    }
    return result;
  }

  /**
   * Decode QR code from an image using the BarcodeDetector API (Chrome 83+).
   */
  private async decodeFromImage(dataUrl: string): Promise<string | null> {
    try {
      // BarcodeDetector is available in modern mobile browsers
      if ('BarcodeDetector' in window) {
        const detector = new (window as unknown).BarcodeDetector({ formats: ['qr_code'] });
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => (img.onload = resolve));

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imageBitmap = await createImageBitmap(canvas);
        const barcodes = await detector.detect(imageBitmap);
        if (barcodes.length > 0) {
          return barcodes[0].rawValue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
