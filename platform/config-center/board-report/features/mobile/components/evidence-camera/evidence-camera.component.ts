import { Component, inject, signal, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraEvidenceService, type EvidenceCapture } from '../../services/camera-evidence.service';
import { MobilePlatformService } from '../../services/mobile-platform.service';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';
import { OfflineSyncService } from '../../services/offline-sync.service';

/**
 * Camera-based evidence capture component for field audits.
 *
 * Usage in evidence pages:
 *   <app-evidence-camera
 *     [controlId]="selectedControlId"
 *     (evidenceUploaded)="onUpload($event)"
 *   />
 *
 * Features:
 * - Capture photo with device camera
 * - Pick existing photo from gallery
 * - GPS geotag displayed on preview
 * - SHA-256 hash shown for integrity proof
 * - Add notes before upload
 * - Offline queue indicator
 */
@Component({
  selector: 'app-evidence-camera',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (platform.isNative) {
      <div class="evidence-camera">
        <!-- Capture buttons -->
        <div class="capture-actions">
          <button class="capture-btn primary" (click)="takePhoto()">
            <span class="material-icons-outlined">photo_camera</span>
            <span>{{ isArabic() ? 'التقاط صورة' : 'Take Photo' }}</span>
          </button>
          <button class="capture-btn secondary" (click)="pickPhoto()">
            <span class="material-icons-outlined">photo_library</span>
            <span>{{ isArabic() ? 'اختر من المعرض' : 'From Gallery' }}</span>
          </button>
        </div>

        <!-- Preview captured photo -->
        @if (capture(); as photo) {
          <div class="preview-card">
            <img [src]="photo.dataUrl" alt="Evidence preview" class="preview-image" />

            <div class="preview-meta">
              <!-- GPS -->
              @if (photo.location) {
                <div class="meta-row">
                  <span class="material-icons-outlined meta-icon">location_on</span>
                  <span class="meta-text">{{ photo.location.latitude.toFixed(5) }}, {{ photo.location.longitude.toFixed(5) }}</span>
                </div>
              }

              <!-- Timestamp -->
              <div class="meta-row">
                <span class="material-icons-outlined meta-icon">schedule</span>
                <span class="meta-text">{{ photo.capturedAt | date:'medium' }}</span>
              </div>

              <!-- Hash -->
              <div class="meta-row">
                <span class="material-icons-outlined meta-icon">fingerprint</span>
                <span class="meta-text hash">{{ photo.hash.substring(0, 16) }}...</span>
              </div>

              <!-- Offline indicator -->
              @if (offlineSync.isOffline()) {
                <div class="meta-row offline-notice">
                  <span class="material-icons-outlined meta-icon">cloud_off</span>
                  <span class="meta-text">{{ isArabic() ? 'سيتم الرفع عند الاتصال' : 'Will upload when online' }}</span>
                </div>
              }
            </div>

            <!-- Notes input -->
            <textarea
              class="notes-input"
              [(ngModel)]="notes"
              [placeholder]="isArabic() ? 'أضف ملاحظات (اختياري)...' : 'Add notes (optional)...'"
              rows="2"
            ></textarea>

            <!-- Upload button -->
            <button
              class="upload-btn"
              (click)="uploadEvidence()"
              [disabled]="isUploading()"
            >
              @if (isUploading()) {
                <span class="material-icons-outlined spinning">sync</span>
                <span>{{ isArabic() ? 'جارٍ الرفع...' : 'Uploading...' }}</span>
              } @else {
                <span class="material-icons-outlined">cloud_upload</span>
                <span>{{ isArabic() ? 'رفع الدليل' : 'Upload Evidence' }}</span>
              }
            </button>

            <!-- Discard -->
            <button class="discard-btn" (click)="discard()">
              {{ isArabic() ? 'إلغاء' : 'Discard' }}
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .evidence-camera {
      padding: 12px 0;
    }

    .capture-actions {
      display: flex;
      gap: 12px;
    }

    .capture-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 16px;
      border-radius: var(--radius-lg);
      border: none;
      font-size: var(--font-size-base);
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      min-height: 52px;
    }

    .capture-btn:active {
      transform: scale(0.97);
    }

    .capture-btn.primary {
      background: #3b82f6;
      color: white;
    }

    .capture-btn.secondary {
      background: rgba(var(--color-white-rgb), 0.08);
      color: rgba(var(--color-white-rgb), 0.8);
      border: 1px solid rgba(var(--color-white-rgb), 0.1);
    }

    .capture-btn .material-icons-outlined {
      font-size: var(--font-size-xl);
    }

    .preview-card {
      margin-top: 16px;
      background: rgba(var(--color-white-rgb), 0.04);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .preview-image {
      width: 100%;
      max-height: 300px;
      object-fit: cover;
    }

    .preview-meta {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-icon {
      font-size: var(--font-size-md);
      color: rgba(var(--color-white-rgb), 0.4);
    }

    .meta-text {
      font-size: var(--font-size-sm);
      color: rgba(var(--color-white-rgb), 0.6);
    }

    .meta-text.hash {
      font-family: monospace;
      font-size: var(--font-size-xs);
    }

    .offline-notice {
      background: rgba(var(--module-accent-amber-rgb), 0.1);
      padding: 6px 8px;
      border-radius: var(--radius-sm);
    }

    .offline-notice .meta-icon,
    .offline-notice .meta-text {
      color: #fbbf24;
    }

    .notes-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(var(--color-white-rgb), 0.04);
      border: none;
      border-top: 1px solid rgba(var(--color-white-rgb), 0.06);
      color: rgba(var(--color-white-rgb), 0.9);
      font-size: var(--font-size-base);
      resize: none;
      outline: none;
      font-family: inherit;
    }

    .notes-input::placeholder {
      color: rgba(var(--color-white-rgb), 0.3);
    }

    .upload-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px;
      background: #22c55e;
      color: white;
      border: none;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      min-height: 52px;
    }

    .upload-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .upload-btn:active:not(:disabled) {
      background: #16a34a;
    }

    .discard-btn {
      width: 100%;
      padding: 12px;
      background: transparent;
      color: rgba(var(--color-white-rgb), 0.4);
      border: none;
      font-size: var(--font-size-base);
      cursor: pointer;
    }

    .spinning {
      animation: spin-icon 1s linear infinite;
    }

    @keyframes spin-icon {
      to { transform: rotate(360deg); }
    }
  `],
})
export class EvidenceCameraComponent {
  @Output() evidenceUploaded = new EventEmitter<{ id: string }>();

  readonly platform = inject(MobilePlatformService);
  readonly offlineSync = inject(OfflineSyncService);
  private readonly camera = inject(CameraEvidenceService);
  private readonly haptic = inject(HapticFeedbackService);

  readonly capture = signal<EvidenceCapture | null>(null);
  readonly isUploading = signal(false);
  readonly isArabic = signal(document.documentElement.getAttribute('lang') === 'ar');
  notes = '';

  /** Control ID to attach this evidence to — set by parent component */
  controlId = '';

  async takePhoto(): Promise<void> {
    await this.haptic.impact();
    const result = await this.camera.capturePhoto();
    if (result) {
      this.capture.set(result);
      await this.haptic.success();
    }
  }

  async pickPhoto(): Promise<void> {
    await this.haptic.tap();
    const result = await (this.camera as any).pickFromGallery();
    if (result) {
      this.capture.set(result);
    }
  }

  async uploadEvidence(): Promise<void> {
    const photo = this.capture();
    if (!photo) return;

    this.isUploading.set(true);
    await this.haptic.impact();

    const result = await (this.camera as any).uploadEvidence(photo, this.controlId, this.notes);

    this.isUploading.set(false);

    if (result) {
      await this.haptic.success();
      this.evidenceUploaded.emit(result);
      this.discard();
    } else if ((this.offlineSync as any).isOffline()) {
      // Queued for offline upload — still show success feedback
      await this.haptic.success();
      this.discard();
    } else {
      await this.haptic.error();
    }
  }

  discard(): void {
    this.capture.set(null);
    this.notes = '';
  }
}
