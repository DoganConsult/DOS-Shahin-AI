import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { HttpClient } from '@angular/common/http';
import { HapticFeedbackService } from './haptic-feedback.service';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

/**
 * File download service for saving GRC reports and evidence to the device.
 *
 * Use cases:
 * - Download audit reports as PDF for offline review
 * - Save compliance certificates to device
 * - Export risk register as CSV/Excel
 * - Download evidence attachments for field reference
 * - Share downloaded files via native share sheet
 *
 * Saves to the app's Documents directory (iOS) / Downloads (Android).
 */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly isNative = Capacitor.isNativePlatform();
  private readonly http = inject(HttpClient);
  private readonly haptic = inject(HapticFeedbackService);

  /**
   * Download a file from the API and save to device storage.
   */
  async downloadFromApi(opts: {
    /** API endpoint path (e.g., '/reports/abc123/pdf') */
    apiPath: string;
    /** Filename to save as (e.g., 'audit-report-2025.pdf') */
    fileName: string;
    /** MIME type for share sheet (e.g., 'application/pdf') */
    mimeType?: string;
  }): Promise<{ filePath: string } | null> {
    try {
      await this.haptic.impact();

      // Download as blob
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}${opts.apiPath}`, {
          responseType: 'blob',
        })
      );

      // Convert blob to base64 for Filesystem plugin
      const base64 = await this.blobToBase64(blob);

      // Save to device
      const result = await Filesystem.writeFile({
        path: `ShahinGRC/${opts.fileName}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      await this.haptic.success();
      return { filePath: result.uri };
    } catch (err) {
      await this.haptic.error();
      return null;
    }
  }

  /**
   * Download and immediately share via native share sheet.
   */
  async downloadAndShare(opts: {
    apiPath: string;
    fileName: string;
    title: string;
    mimeType?: string;
  }): Promise<void> {
    const result = await this.downloadFromApi(opts);
    if (!result) return;

    await Share.share({
      title: opts.title,
      url: result.filePath,
      dialogTitle: `Share ${opts.title}`,
    });
  }

  /**
   * Save raw text data (e.g., CSV export) to device.
   */
  async saveTextFile(opts: {
    fileName: string;
    content: string;
    encoding?: typeof Encoding;
  }): Promise<{ filePath: string } | null> {
    try {
      const result = await Filesystem.writeFile({
        path: `ShahinGRC/${opts.fileName}`,
        data: opts.content,
        directory: Directory.Documents,
        encoding: opts.encoding || Encoding.UTF8,
        recursive: true,
      });

      await this.haptic.success();
      return { filePath: result.uri };
    } catch {
      await this.haptic.error();
      return null;
    }
  }

  /**
   * List all downloaded GRC files.
   */
  async listDownloads(): Promise<Array<{ name: string; uri: string; size: number }>> {
    try {
      const result = await Filesystem.readdir({
        path: 'ShahinGRC',
        directory: Directory.Documents,
      });
      return result.files.map((f) => ({
        name: f.name,
        uri: f.uri,
        size: f.size,
      }));
    } catch {
      return []; // Directory doesn't exist yet
    }
  }

  /**
   * Delete a downloaded file.
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: `ShahinGRC/${fileName}`,
        directory: Directory.Documents,
      });
    } catch {
      // File doesn't exist — OK
    }
  }

  /**
   * Clear all downloaded GRC files.
   */
  async clearDownloads(): Promise<void> {
    try {
      await Filesystem.rmdir({
        path: 'ShahinGRC',
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Directory doesn't exist — OK
    }
  }

  // ──────────────────── Private helpers ────────────────────

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the data URL prefix — Filesystem.writeFile expects raw base64
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
