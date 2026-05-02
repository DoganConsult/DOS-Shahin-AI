import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptic feedback for native touch interactions.
 *
 * Provides tactile confirmation for GRC actions:
 * - Light tap when selecting a risk/control
 * - Medium impact when submitting evidence
 * - Heavy impact when approving/rejecting
 * - Success vibration on completed actions
 * - Warning vibration on SLA breach alerts
 * - Error vibration on validation failures
 */
@Injectable({ providedIn: 'root' })
export class HapticFeedbackService {
  private readonly isNative = Capacitor.isNativePlatform();

  /** Light tap — list item selection, toggle */
  async tap(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  /** Medium impact — button press, form submission */
  async impact(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  }

  /** Heavy impact — approval, critical action confirmation */
  async heavyImpact(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }

  /** Success pattern — action completed, evidence uploaded */
  async success(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.notification({ type: NotificationType.Success });
  }

  /** Warning pattern — SLA breach, risk threshold exceeded */
  async warning(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.notification({ type: NotificationType.Warning });
  }

  /** Error pattern — validation failure, network error */
  async error(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.notification({ type: NotificationType.Error });
  }

  /** Selection changed — picker, segment control */
  async selectionChanged(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.selectionChanged();
  }

  /** Start selection feedback (for drag gestures) */
  async selectionStart(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.selectionStart();
  }

  /** End selection feedback */
  async selectionEnd(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.selectionEnd();
  }
}
