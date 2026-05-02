import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { HapticService } from './haptic.service';

export interface EvidenceCapture {
  id: string;
  dataUrl: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  hash: string;
  notes: string;
  synced: boolean;
}

@Injectable({ providedIn: 'root' })
export class CameraEvidenceService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private haptic = inject(HapticService);

  readonly pendingQueue = signal<EvidenceCapture[]>([]);
  readonly uploading = signal<boolean>(false);

  async capturePhoto(notes: string = ''): Promise<EvidenceCapture | null> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (!photo.dataUrl) return null;

      const hash = await this.sha256(photo.dataUrl);
      const location = await this.getLocation();
      await this.haptic.trigger('success');

      const capture: EvidenceCapture = {
        id: crypto.randomUUID(),
        dataUrl: photo.dataUrl,
        timestamp: new Date().toISOString(),
        location: location ?? undefined,
        hash,
        notes,
        synced: false,
      };

      this.pendingQueue.update(q => [...q, capture]);
      return capture;
    } catch {
      return null;
    }
  }

  async flushQueue(): Promise<void> {
    const pending = this.pendingQueue().filter(e => !e.synced);
    if (!pending.length || this.uploading()) return;
    this.uploading.set(true);
    for (const evidence of pending) {
      try {
        await this.http.post(`${environment.apiUrl}/evidence/mobile-upload`, {
          dataUrl: evidence.dataUrl,
          hash: evidence.hash,
          timestamp: evidence.timestamp,
          location: evidence.location,
          notes: evidence.notes,
        }).toPromise();
        this.pendingQueue.update(q => q.map(e => e.id === evidence.id ? { ...e, synced: true } : e));
      } catch { /* keep in queue */ }
    }
    this.uploading.set(false);
    // Remove synced items
    this.pendingQueue.update(q => q.filter(e => !e.synced));
  }

  private async getLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { return null; }
  }

  private async sha256(data: string): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) return '';
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
